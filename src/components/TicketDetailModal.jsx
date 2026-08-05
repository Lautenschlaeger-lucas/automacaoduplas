import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink, Plus, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui'
import NewTicketModal from './NewTicketModal'
import {
  AREAS,
  AREA_LABEL,
  AREA_CHIP,
  STATUS,
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_CHIP,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
} from '../lib/constants'
import { formatDate } from '../lib/format'

export default function TicketDetailModal({ open, onClose, ticket, onSaved, onOpenTicket }) {
  const navigate = useNavigate()
  const [collabs, setCollabs] = useState([])
  const [form, setForm] = useState(null)
  const [clientTickets, setClientTickets] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadClient() {
    const { data } = await supabase
      .from('tickets')
      .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
      .eq('codigo_cliente', ticket.codigo_cliente)
      .order('criado_em', { ascending: false })
    if (data) setClientTickets(data)
  }

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
    setClientTickets(null)
    loadClient()
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setCollabs(data || []))

    const channel = supabase
      .channel(`ticket-cliente-${ticket.codigo_cliente}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `codigo_cliente=eq.${ticket.codigo_cliente}` },
        () => loadClient()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
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
      loadClient()
    } catch (err) {
      setError(err.message || 'Erro ao salvar ticket.')
    } finally {
      setBusy(false)
    }
  }

  if (!ticket || !form) return null

  const others = (clientTickets || []).filter((t) => t.id !== ticket.id)
  const openTickets = others.filter((t) => t.status !== STATUS.CONCLUIDO)
  const doneTickets = (clientTickets || []).filter((t) => t.status === STATUS.CONCLUIDO)

  return (
    <Modal open={open} onClose={onClose} title={`Ticket #${ticket.codigo_cliente}`} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 -mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-500">
            {ticket.nome_cliente || 'Sem nome de cliente'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/clientes/${ticket.codigo_cliente}`)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              <ExternalLink size={13} /> Editar dados do cliente
            </button>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              <Plus size={14} /> Novo ticket
            </button>
          </div>
        </div>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Título *</span>
          <input required value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className="field" />
        </label>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</span>
          <textarea
            rows={2}
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

        <section className="col-span-2 border-t border-slate-100 pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Clock size={13} className="text-sky-500" />
            Tickets em aberto deste cliente
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              {openTickets.length}
            </span>
          </h3>
          {openTickets.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-400">Nenhum outro ticket em aberto</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {openTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenTicket?.(t)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-left transition hover:border-blue-200"
                >
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
                    {AREA_LABEL[t.area]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{t.titulo}</span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {PRIORITY_LABEL[t.prioridade]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="col-span-2 border-t border-slate-100 pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Processos já feitos
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              {doneTickets.length}
            </span>
          </h3>
          {doneTickets.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-400">Nenhum processo concluído ainda</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {doneTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenTicket?.(t)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-left transition hover:border-emerald-200"
                >
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
                    {AREA_LABEL[t.area]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{t.titulo}</span>
                  <span className="text-[10px] text-slate-400">
                    {t.responsavel?.name || 'Sem responsável'} · feito {formatDate(t.concluido_em)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </form>

      <NewTicketModal
        open={showNew}
        onClose={() => setShowNew(false)}
        codigoInicial={ticket.codigo_cliente}
        areaInicial={ticket.area}
      />
    </Modal>
  )
}
