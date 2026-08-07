import { useMemo, useRef, useState } from 'react'
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileText, Layers, Wrench, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const COL = { TICKET: 0, CRIACAO: 1, FINALIZACAO: 2 }

function norm(s = '') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  const chars = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (inQuotes) {
      if (c === '"') {
        if (chars[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && chars[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  row.push(field)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

function parseBrDate(value) {
  const m = (value || '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (!m) return null
  let [, d, mo, y] = m.map(Number)
  if (y < 100) y += 2000
  const dt = new Date(y, mo - 1, d)
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt.toISOString()
}

function extractCode(title) {
  const m = title.match(/^(\d+)\s*[-–—]\s*(.*)$/)
  return m ? { code: m[1], rest: m[2].trim() } : null
}

function isParent(title) {
  return /^\d+\s*[-–—].*\[sankhya\]/i.test(title)
}

function analyzeRows(rows) {
  const parents = new Map()
  const children = []
  const invalid = []

  rows.slice(1).forEach((r) => {
    const title = (r[COL.TICKET] || '').trim()
    if (!title) return
    const ext = extractCode(title)
    if (!ext) {
      invalid.push({ titulo: title, motivo: 'Não começa com o código do projeto' })
      return
    }
    const criado = parseBrDate(r[COL.CRIACAO])
    const concluido = parseBrDate(r[COL.FINALIZACAO])
    if (isParent(title)) {
      if (parents.has(ext.code)) {
        invalid.push({ titulo: title, motivo: `Pai duplicado para o código ${ext.code}` })
        return
      }
      const nome = title
      parents.set(ext.code, {
        code: ext.code,
        nome,
        titulo: title,
        criado,
        concluido,
        status: concluido ? 'concluido' : 'aberto',
      })
    } else {
      children.push({
        code: ext.code,
        titulo: title,
        criado,
        concluido,
        status: concluido ? 'concluido' : 'aberto',
      })
    }
  })

  return { parents, children, invalid }
}

async function fetchExisting() {
  const { data } = await supabase.from('tickets').select('id, codigo_cliente, titulo, nome_cliente, parent_id')
  const existingParents = new Map()
  const existingByKey = new Set()
  ;(data || []).forEach((t) => {
    if (!t.parent_id) existingParents.set(t.codigo_cliente, t)
    existingByKey.add(`${t.codigo_cliente}::${norm(t.titulo)}`)
  })
  return { existingParents, existingByKey }
}

function buildPlan({ parents, children, invalid }, existing) {
  const plan = {
    pais: [],
    paisExistentes: [],
    filhos: [],
    duplicados: [],
    orfaos: [],
    invalidos: invalid,
  }

  parents.forEach((p) => {
    if (existing.existingParents.has(p.code)) {
      plan.paisExistentes.push(p)
    } else {
      plan.pais.push(p)
    }
  })

  children.forEach((c) => {
    if (existing.existingByKey.has(`${c.code}::${norm(c.titulo)}`)) {
      plan.duplicados.push(c)
      return
    }
    const paiCsv = parents.get(c.code)
    const paiDb = existing.existingParents.get(c.code)
    if (!paiCsv && !paiDb) {
      plan.orfaos.push(c)
      return
    }
    plan.filhos.push({ ...c, nomePai: paiCsv?.nome || paiDb?.nome_cliente || '', paiDbId: paiDb?.id || null })
  })

  return plan
}

export default function ImportCsv() {
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  async function handleFile(file) {
    setPlan(null)
    setDone(null)
    setLoadErr('')
    if (!file) return
    setFileName(file.name)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length <= 1) {
        setLoadErr('Arquivo vazio ou sem linhas de dados.')
        return
      }
      const base = analyzeRows(rows)
      const existing = await fetchExisting()
      setPlan(buildPlan(base, existing))
    } catch (e) {
      setLoadErr('Não foi possível ler o arquivo: ' + e.message)
    }
  }

  const preview = useMemo(() => {
    if (!plan) return null
    const byCode = new Map()
    plan.pais.forEach((p) => byCode.set(p.code, { code: p.code, nome: p.nome, origem: 'novo', filhos: [] }))
    plan.paisExistentes.forEach((p) => {
      if (!byCode.has(p.code)) byCode.set(p.code, { code: p.code, nome: p.nome, origem: 'existente', filhos: [] })
    })
    plan.filhos.forEach((f) => {
      const g = byCode.get(f.code)
      if (g) g.filhos.push(f)
      else byCode.set(f.code, { code: f.code, nome: f.nomePai, origem: 'existente', filhos: [f] })
    })
    return {
      grupos: [...byCode.values()],
      total: plan.pais.length + plan.filhos.length,
      alerts: plan.orfaos.length + plan.duplicados.length + plan.invalidos.length,
    }
  }, [plan])

  async function handleImport() {
    if (!plan || busy) return
    setBusy(true)
    setDone(null)
    const criados = { pais: 0, filhos: 0 }
    const erros = []
    const codeToParent = new Map()

    for (const p of plan.pais) {
      const payload = {
        codigo_cliente: p.code,
        nome_cliente: p.nome,
        titulo: p.titulo,
        area: 'tecnica',
        prioridade: 'media',
        status: p.status,
        criado_por: user?.id,
      }
      if (p.criado) payload.criado_em = p.criado
      if (p.status === 'concluido' && p.concluido) payload.concluido_em = p.concluido
      const { data, error } = await supabase.from('tickets').insert(payload).select('id').single()
      if (error) {
        erros.push(`${p.code} - ${p.nome}: ${error.message}`)
        continue
      }
      codeToParent.set(p.code, data.id)
      criados.pais++
    }

    plan.filhos.forEach((f) => {
      codeToParent.set(f.code, codeToParent.get(f.code) || f.paiDbId)
    })

    for (const f of plan.filhos) {
      const parentId = codeToParent.get(f.code)
      if (!parentId) {
        erros.push(`${f.code} - ${f.titulo}: pai não encontrado`)
        continue
      }
      const payload = {
        codigo_cliente: f.code,
        nome_cliente: f.nomePai,
        titulo: f.titulo,
        area: 'tecnica',
        prioridade: 'media',
        status: f.status,
        parent_id: parentId,
        criado_por: user?.id,
      }
      if (f.criado) payload.criado_em = f.criado
      if (f.status === 'concluido' && f.concluido) payload.concluido_em = f.concluido
      const { error } = await supabase.from('tickets').insert(payload)
      if (error) erros.push(`${f.code} - ${f.titulo}: ${error.message}`)
      else criados.filhos++
    }

    setBusy(false)
    setDone({ ...criados, erros })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Importar tickets</h1>
        <p className="text-sm text-slate-400">
          Envie o CSV exportado do HubSpot para criar os projetos e tickets automaticamente.
        </p>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button onClick={() => inputRef.current?.click()} className="btn-primary">
            <Upload size={16} />
            Selecionar CSV
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700">
              <FileText size={15} className="text-slate-400" />
              {fileName || 'Nenhum arquivo selecionado'}
            </p>
            <p className="text-[11px] text-slate-400">
              Colunas esperadas: <code className="rounded bg-slate-100 px-1">nome do ticket</code>,{' '}
              <code className="rounded bg-slate-100 px-1">data de criação</code>,{' '}
              <code className="rounded bg-slate-100 px-1">data de finalização de implantação</code>
            </p>
          </div>
        </div>
        {loadErr && <p className="mt-3 text-xs text-rose-600">{loadErr}</p>}
      </div>

      {done && (
        <div className="glass rounded-2xl border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={16} />
            Importação concluída
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            {done.pais} projeto(s) e {done.filhos} ticket(s) técnico(s) criados.
            {done.erros.length > 0 && ` ${done.erros.length} erro(s).`}
          </p>
          {done.erros.length > 0 && (
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-rose-600">
              {done.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button onClick={() => inputRef.current?.click()} className="btn-ghost mt-3">
            <RefreshCw size={14} />
            Importar outro arquivo
          </button>
        </div>
      )}

      {plan && !done && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projetos (pais)</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800">{plan.pais.length}</p>
              <p className="text-[11px] text-slate-400">{plan.paisExistentes.length} já existem no sistema</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tickets técnicos</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800">{plan.filhos.length}</p>
              <p className="text-[11px] text-slate-400">{plan.duplicados.length} duplicados serão pulados</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sem projeto no CSV</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-600">{plan.orfaos.length}</p>
              <p className="text-[11px] text-slate-400">não serão importados</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Linhas inválidas</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600">{plan.invalidos.length}</p>
              <p className="text-[11px] text-slate-400">sem código ou pai duplicado</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <Layers size={15} className="text-blue-600" />
                O que será criado
              </h2>
              {preview.grupos.length === 0 ? (
                <p className="text-xs text-slate-400">Nada a criar.</p>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {preview.grupos.map((g) => (
                    <div key={g.code} className="py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          #{g.code}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{g.nome || 'Projeto'}</span>
                        {g.origem === 'existente' ? (
                          <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                            já existe
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            novo
                          </span>
                        )}
                      </div>
                      {g.filhos.length > 0 && (
                        <ul className="mt-1.5 flex flex-col gap-0.5">
                          {g.filhos.map((f) => (
                            <li key={f.titulo} className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Wrench size={11} className="shrink-0 text-blue-400" />
                              <span className="truncate">{f.titulo}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {preview.alerts > 0 && (
              <div className="glass rounded-2xl p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-600">
                  <AlertTriangle size={15} />
                  Serão ignorados ({preview.alerts})
                </h2>
                <div className="flex flex-col gap-3">
                  {plan.orfaos.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Sem projeto pai no CSV (importe o pai primeiro)
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {plan.orfaos.map((o) => (
                          <li key={o.titulo} className="text-xs text-slate-500">
                            #{o.code} - {o.titulo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.duplicados.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Já existem no sistema
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {plan.duplicados.map((d) => (
                          <li key={d.titulo} className="text-xs text-slate-500">
                            #{d.code} - {d.titulo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.invalidos.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Linhas inválidas
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {plan.invalidos.map((inv, i) => (
                          <li key={i} className="text-xs text-slate-500">
                            {inv.titulo} — {inv.motivo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setPlan(null)
                setFileName('')
                setDone(null)
              }}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button onClick={handleImport} disabled={busy || preview.total === 0} className="btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />}
              Importar {preview.total} ticket{preview.total !== 1 && 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
