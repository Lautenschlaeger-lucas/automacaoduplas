import { useState } from 'react'
import { Plus, Trash2, Lock } from 'lucide-react'
import {
  CHECKLIST_STATUS,
  CHECKLIST_STATUS_ORDER,
  CHECKLIST_STATUS_LABEL,
  CHECKLIST_STATUS_CHIP,
  CHECKLIST_CATEGORIAS,
  CHECKLIST_CATEGORIA_LABEL,
  CHECKLIST_CATEGORIA_BAR,
  CHECKLIST_CATEGORIA_CHIP,
  BLOQUEIO_TIPO_ORDER,
  BLOQUEIO_TIPO_LABEL,
} from '../lib/constants'
import { progressoChecklist } from '../lib/checklist'

function MiniProgress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      {done}/{total}
    </span>
  )
}

function ItemRow({ p, onUpdate, onDelete }) {
  const [bloqueio, setBloqueio] = useState(() => ({
    bloqueado_por: p.bloqueado_por || '',
    tipo_bloqueio: p.tipo_bloqueio || BLOQUEIO_TIPO_ORDER[0],
    motivo: p.motivo || '',
  }))

  function setStatus(status) {
    const patch = { status }
    if (status !== CHECKLIST_STATUS.BLOQUEADO) {
      patch.bloqueado_por = null
      patch.tipo_bloqueio = null
      patch.motivo = null
    }
    onUpdate(p.id, patch)
  }

  function setBloqueioCampo(campo, valor) {
    const next = { ...bloqueio, [campo]: valor }
    setBloqueio(next)
    onUpdate(p.id, { [campo]: valor || null })
  }

  const bloqueado = p.status === CHECKLIST_STATUS.BLOQUEADO

  return (
    <div className={`rounded-xl border px-3 py-2 transition ${bloqueado ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="flex items-center gap-2">
        <select
          value={p.status}
          onChange={(e) => setStatus(e.target.value)}
          className={`rounded-md border px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide ${CHECKLIST_STATUS_CHIP[p.status]}`}
          title="Status do item"
        >
          {CHECKLIST_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {CHECKLIST_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <span className={`min-w-0 flex-1 text-xs leading-snug ${p.status === CHECKLIST_STATUS.FEITO ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {p.titulo}
        </span>
        {bloqueado && <Lock size={12} className="shrink-0 text-rose-500" />}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(p.id)}
            className="shrink-0 text-slate-300 transition hover:text-rose-500"
            title="Excluir item"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {bloqueado && (
        <div className="mt-2 grid gap-1.5 border-t border-rose-100 pt-2 sm:grid-cols-[1fr_auto_1.2fr]">
          <input
            value={bloqueio.bloqueado_por}
            onChange={(e) => setBloqueioCampo('bloqueado_por', e.target.value)}
            placeholder="Bloqueado por (pessoa/time)..."
            className="field !py-1.5 text-xs"
          />
          <select
            value={bloqueio.tipo_bloqueio}
            onChange={(e) => setBloqueioCampo('tipo_bloqueio', e.target.value)}
            className="field !py-1.5 text-xs"
          >
            {BLOQUEIO_TIPO_ORDER.map((t) => (
              <option key={t} value={t}>
                {BLOQUEIO_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            value={bloqueio.motivo}
            onChange={(e) => setBloqueioCampo('motivo', e.target.value)}
            placeholder="Motivo..."
            className="field !py-1.5 text-xs"
          />
        </div>
      )}
    </div>
  )
}

function CategoriaBlock({ categoria, itens, onUpdate, onDelete }) {
  const prog = progressoChecklist(itens)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-0.5 flex items-center gap-2">
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CHECKLIST_CATEGORIA_CHIP[categoria]}`}>
          {CHECKLIST_CATEGORIA_LABEL[categoria]}
        </span>
        <span className={`h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100`}>
          <span
            className={`block h-full rounded-full transition-all ${CHECKLIST_CATEGORIA_BAR[categoria]}`}
            style={{ width: `${prog.pct}%` }}
          />
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          {prog.feitos}/{prog.aplicaveis} · {prog.pct}%
        </span>
      </div>
      {itens.map((p) => (
        <ItemRow key={p.id} p={p} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  )
}

export default function ChecklistEditor({ processos = [], onUpdate, onDelete, onAdd }) {
  const [novo, setNovo] = useState('')
  const padrao = processos.filter((p) => p.tipo === 'padrao')
  const custom = processos.filter((p) => p.tipo !== 'padrao')
  const geral = progressoChecklist(processos)

  function addItem(e) {
    e.preventDefault()
    const titulo = novo.trim()
    if (!titulo || !onAdd) return
    onAdd(titulo)
    setNovo('')
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.values(CHECKLIST_CATEGORIAS).map((cat) => {
        const itens = padrao
          .filter((p) => p.categoria === cat)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        return <CategoriaBlock key={cat} categoria={cat} itens={itens} onUpdate={onUpdate} onDelete={onDelete} />
      })}

      {custom.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Itens adicionais
            </span>
            <MiniProgress done={geral.feitos - progressoChecklist(padrao).feitos} total={custom.length} />
          </div>
          {custom.map((p) => (
            <ItemRow key={p.id} p={p} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}

      {onAdd && (
        <form onSubmit={addItem} className="flex gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            className="field !py-2 text-xs"
            placeholder="Adicionar item customizado..."
          />
          <button type="submit" className="btn-primary shrink-0 !px-3 !py-2" title="Adicionar item">
            <Plus size={14} />
          </button>
        </form>
      )}
    </div>
  )
}