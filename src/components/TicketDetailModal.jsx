import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui'
import { AREAS, AREA_LABEL, STATUS_ORDER, STATUS_LABEL } from '../lib/constants'

export default function TicketDetailModal({ open, onClose, ticket, onSaved }) {
  const navigate = useNavigate()
  const [collabs, setCollabs] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !ticket) return
    setError('')
    setForm({
      titulo: ticket.titulo,
      descricao: ticket.descricao || '',
      status: ticket.status,
      area: ticket.area,
      prioridade: ticket.prioridade,
      responsavel_id: ticket.responsavel_id || '',
    })
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setCollabs(data || []))
  }, [open, ticket])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.from('tickets').update(form).eq('id', ticket.id)
      if (err) throw err
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar ticket.')
    } finally {
      setBusy(false)
    }
  }

  if (!form) return null

  return (
    <Modal open={open} onClose={onClose} title={`Ticket #${ticket.codigo_cliente}`} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 -mt-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {ticket.nome_cliente || 'Sem nome de cliente'}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/clientes/${ticket.codigo_cliente}`)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <ExternalLink size={13} /> Painel do cliente #{ticket.codigo_cliente}
          </button>
        </div>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Título *</span>
          <input required value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className="field" />
        </label>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</span>
          <textarea
            rows={3}
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            className="field resize-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className="field">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Área</span>
          <select value={form.area} onChange={(e) => set('area', e.target.value)} className="field">
            {Object.values(AREAS).map((a) => (
              <option key={a} value={a}>
                {AREA_LABEL[a]}
              </option>
            ))}
          </select>
        </label>

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

        {error && <p className="col-span-2 text-xs text-rose-600">{error}</p>}

        <div className="col-span-2">
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </Modal>
  )
}
