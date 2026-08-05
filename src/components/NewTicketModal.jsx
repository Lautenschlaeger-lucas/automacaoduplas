import { useEffect, useState } from 'react'
import { Loader2, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from './ui'
import { AREAS } from '../lib/constants'

const CLIENT_FIELDS = ['nome_cliente']

export default function NewTicketModal({ open, onClose, onSaved, codigoInicial, areaInicial }) {
  const { user } = useAuth()
  const [collabs, setCollabs] = useState([])
  const [existing, setExisting] = useState(false)
  const [form, setForm] = useState({
    codigo_cliente: codigoInicial || '',
    nome_cliente: '',
    titulo: '',
    descricao: '',
    area: areaInicial || AREAS.TECNICA,
    prioridade: 'media',
    responsavel_id: user?.id || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm((f) => ({
      ...f,
      codigo_cliente: codigoInicial || f.codigo_cliente,
      area: areaInicial || f.area,
      responsavel_id: user?.id || f.responsavel_id,
    }))
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setCollabs(data || []))
  }, [open, codigoInicial, areaInicial, user])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleCodigoChange(value) {
    set('codigo_cliente', value)
    const code = value.trim()
    if (!code) {
      setExisting(false)
      return
    }
    const { data } = await supabase
      .from('tickets')
      .select(CLIENT_FIELDS.join(','))
      .eq('codigo_cliente', code)
      .order('criado_em', { ascending: false })
      .limit(1)
    if (data?.length) {
      setExisting(true)
      setForm((f) => ({ ...f, ...pick(data[0]) }))
    } else {
      setExisting(false)
    }
  }

  function pick(ticketLink) {
    const next = {}
    CLIENT_FIELDS.forEach((k) => (next[k] = ticketLink[k] || ''))
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const code = form.codigo_cliente.trim()
      const payload = {
        codigo_cliente: code,
        nome_cliente: form.nome_cliente,
        titulo: form.titulo,
        descricao: form.descricao,
        area: form.area,
        prioridade: form.prioridade,
        responsavel_id: form.responsavel_id,
        criado_por: user.id,
      }

      const { data: pais } = await supabase
        .from('tickets')
        .select('id')
        .eq('codigo_cliente', code)
        .is('parent_id', null)
        .limit(1)

      if (pais?.[0]?.id) {
        const { error: err } = await supabase.from('tickets').insert([{ ...payload, parent_id: pais[0].id }])
        if (err) throw err
      } else {
        const { data: pai, error: paiErr } = await supabase
          .from('tickets')
          .insert([
            {
              ...payload,
              titulo: form.titulo || form.nome_cliente || `Cliente ${code}`,
            },
          ])
          .select('id')
          .single()
        if (paiErr) {
          const { data: outroPai } = await supabase
            .from('tickets')
            .select('id')
            .eq('codigo_cliente', code)
            .is('parent_id', null)
            .limit(1)
          const realParent = outroPai?.[0]?.id
          if (realParent) {
            const { error: err2 } = await supabase.from('tickets').insert([{ ...payload, parent_id: realParent }])
            if (err2) throw err2
          } else {
            throw paiErr
          }
        }
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar ticket.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo ticket" wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Código do cliente *
          </span>
          <input
            required
            value={form.codigo_cliente}
            onChange={(e) => handleCodigoChange(e.target.value)}
            className="field"
            placeholder="Ex: 324"
          />
          {existing && (
            <span className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
              <Info size={12} /> Cliente já existente — nome preenchido automaticamente
            </span>
          )}
        </label>

        <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Nome do cliente *
          </span>
          <input
            required
            value={form.nome_cliente}
            onChange={(e) => set('nome_cliente', e.target.value)}
            className="field"
            placeholder="Navegação Silva Ltda"
          />
        </label>

        <div className="col-span-2 border-t border-slate-100 pt-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Área</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: AREAS.TECNICA, label: 'Técnica' },
              { key: AREAS.TREINAMENTO, label: 'Treinamento' },
            ].map((a) => (
              <button
                type="button"
                key={a.key}
                onClick={() => set('area', a.key)}
                className={`rounded-xl border py-2 text-sm font-semibold transition ${
                  form.area === a.key
                    ? 'dial shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Título *</span>
          <input required value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className="field" placeholder="Ex: Instalar banco de dados" />
        </label>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</span>
          <textarea rows={3} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} className="field resize-none" placeholder="Detalhes da atividade..." />
        </label>

        <div className="col-span-2 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prioridade</span>
            <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)} className="field">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Responsável</span>
            <select value={form.responsavel_id || ''} onChange={(e) => set('responsavel_id', e.target.value || null)} className="field">
              <option value="">Sem responsável</option>
              {collabs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="col-span-2 text-xs text-rose-600">{error}</p>}

        <div className="col-span-2">
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Criar ticket
          </button>
        </div>
      </form>
    </Modal>
  )
}