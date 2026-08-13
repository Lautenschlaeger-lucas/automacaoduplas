import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  ExternalLink,
  Plus,
  FolderOpen,
  CheckCircle2,
  CheckCheck,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui'
import NewTicketModal from './NewTicketModal'
import ChecklistEditor from './ChecklistEditor'
import { progressoChecklist } from '../lib/checklist'
import {
  AREAS,
  AREA_LABEL,
  AREA_CHIP,
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_CHIP,
  PRIORITY_LABEL,
  FLUXO_TECNICA_TREINAMENTO,
  CHECKLIST_STATUS,
} from '../lib/constants'

export default function TicketDetailModal({ open, onClose, ticket, onSaved, onOpenTicket }) {
  const navigate = useNavigate()
  const isParent = !!ticket && !ticket.parent_id
  const [collabs, setCollabs] = useState([])
  const [form, setForm] = useState(null)
  const [parentTicket, setParentTicket] = useState(null)
  const [processos, setProcessos] = useState(null)
  const [filhos, setFilhos] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadProcessos() {
    const { data } = await supabase
      .from('processos')
      .select('*')
      .eq('ticket_pai_id', ticket.id)
      .order('criado_em', { ascending: true })
    if (data) setProcessos(data)
  }

  async function loadFilhos() {
    const { data } = await supabase
      .from('tickets')
      .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
      .eq('parent_id', ticket.id)
      .order('criado_em', { ascending: false })
    if (data) setFilhos(data)
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
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setCollabs(data || []))

    if (isParent) {
      setProcessos(null)
      setFilhos(null)
      loadProcessos()
      loadFilhos()
      const chanP = supabase
        .channel(`processos-${ticket.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'processos', filter: `ticket_pai_id=eq.${ticket.id}` },
          () => loadProcessos()
        )
        .subscribe()
      const chanT = supabase
        .channel(`filhos-${ticket.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets', filter: `parent_id=eq.${ticket.id}` },
          () => loadFilhos()
        )
        .subscribe()
      return () => {
        supabase.removeChannel(chanP)
        supabase.removeChannel(chanT)
      }
    }

    setParentTicket(null)
    supabase
      .from('tickets')
      .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
      .eq('id', ticket.parent_id)
      .single()
      .then(({ data }) => setParentTicket(data))
  }, [open, ticket])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = FLUXO_TECNICA_TREINAMENTO({ ...form }, isParent)
      const { error: err } = await supabase.from('tickets').update(payload).eq('id', ticket.id)
      if (err) throw err
      setForm(payload)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Erro ao salvar ticket.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const msg = isParent
      ? `Excluir o ticket geral #${ticket.codigo_cliente} e TODOS os seus tickets e processos?`
      : 'Excluir este ticket?'
    if (!confirm(msg)) return
    const { error } = await supabase.from('tickets').delete().eq('id', ticket.id)
    if (error) {
      setError(error.message || 'Erro ao excluir ticket.')
      return
    }
    onSaved?.()
    onClose()
  }

  async function updateProcesso(id, patch) {
    const { error } = await supabase.from('processos').update(patch).eq('id', id)
    if (error) {
      setError(error.message || 'Erro ao atualizar item.')
      return
    }
    setProcessos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function deleteProcesso(id) {
    const { error } = await supabase.from('processos').delete().eq('id', id)
    if (error) {
      setError(error.message || 'Erro ao excluir item.')
      return
    }
    setProcessos((prev) => prev.filter((p) => p.id !== id))
  }

  async function addProcesso(titulo) {
    const { data, error } = await supabase
      .from('processos')
      .insert([{ ticket_pai_id: ticket.id, titulo, tipo: 'custom' }])
      .select()
    if (error || !data?.[0]) {
      setError((error?.message || '') || 'Erro ao adicionar item.')
      return
    }
    setProcessos((prev) => [...prev, data[0]])
  }

  async function marcarTodosFeito() {
    const pendentes = (processos || []).filter((p) => p.status !== CHECKLIST_STATUS.FEITO)
    if (!pendentes.length) return
    if (!confirm(`Marcar ${pendentes.length} item(ns) do checklist como concluído?`)) return
    const ids = pendentes.map((p) => p.id)
    const patch = { status: CHECKLIST_STATUS.FEITO, bloqueado_por: null, tipo_bloqueio: null, motivo: null }
    const { error } = await supabase.from('processos').update(patch).in('id', ids)
    if (error) {
      setError(error.message || 'Erro ao marcar itens como concluído.')
      return
    }
    setProcessos((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)))
  }

  if (!ticket || !form) return null

  const geral = progressoChecklist(processos || [])

  return (
    <Modal open={open} onClose={onClose} title={isParent ? `Ticket geral #${ticket.codigo_cliente}` : `Ticket #${ticket.codigo_cliente}`} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 -mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isParent ? (
              <button
                type="button"
                disabled={!parentTicket}
                onClick={() => parentTicket && onOpenTicket?.(parentTicket)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-40"
              >
                <ArrowLeft size={13} /> Ticket geral #{ticket.codigo_cliente}
              </button>
            ) : (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Ticket geral
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/projetos/${ticket.codigo_cliente}`)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              <ExternalLink size={13} /> Editar dados do projeto
            </button>
            <button type="button" onClick={() => setShowNew(true)} className="btn-primary !px-3 !py-1.5 text-xs">
              <Plus size={14} /> Novo ticket
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-ghost !px-2.5 !py-1.5 hover:text-rose-500"
              title="Excluir ticket"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <p className="col-span-2 -mt-1 text-sm font-semibold text-slate-500">
          {ticket.nome_cliente || 'Sem nome de cliente'}
        </p>

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

        {isParent && (
          <>
            <section className="col-span-2 border-t border-slate-100 pt-4">
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Checklist da implantação
                <span className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full rounded-full transition-all ${geral.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${geral.pct}%` }}
                    />
                  </span>
                  {geral.feitos}/{geral.aplicaveis} · {geral.pct}%
                </span>
              </h3>
              <button
                type="button"
                onClick={marcarTodosFeito}
                disabled={!processos?.length || processos.every((p) => p.status === CHECKLIST_STATUS.FEITO)}
                className="mb-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                title="Marcar todos os itens do checklist como concluídos"
              >
                <CheckCheck size={13} />
                Marcar todos como concluídos
              </button>
              {processos && processos.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-400">
                  Nenhum item registrado ainda
                </p>
              ) : (
                <ChecklistEditor
                  processos={processos || []}
                  onUpdate={updateProcesso}
                  onDelete={deleteProcesso}
                  onAdd={addProcesso}
                />
              )}
            </section>

            <section className="col-span-2 border-t border-slate-100 pt-4">
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <FolderOpen size={13} className="text-blue-500" />
                Tickets da implantação
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                  {filhos?.length || 0}
                </span>
              </h3>
              {filhos && filhos.length === 0 && (
                <p className="py-2 text-center text-[11px] text-slate-400">
                  Nenhum ticket aberto ainda — use "Novo ticket"
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {filhos?.map((t) => (
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
                    <span className="text-[10px] text-slate-400">
                      {t.responsavel?.name?.split(' ')[0] || 'Sem responsável'}
                    </span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {PRIORITY_LABEL[t.prioridade]}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
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
