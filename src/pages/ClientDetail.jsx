import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Building2,
  MapPin,
  Phone,
  User as UserIcon,
  Package,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  STATUS,
  STATUS_LABEL,
  STATUS_DOT,
  STATUS_CHIP,
  CLIENT_STATUS_CHIP,
  CLIENT_STATUS_LABEL,
  AREAS,
  AREA_LABEL,
  AREA_CHIP,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
} from '../lib/constants'
import { formatDate, timeAgo, daysBetween } from '../lib/format'
import { Spinner, EmptyState, Avatar } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'
import EditClientModal from '../components/EditClientModal'
import TicketDetailModal from '../components/TicketDetailModal'

const BLOCKS = [
  { key: STATUS.ABERTO, icon: Clock, title: 'Em aberto' },
  { key: STATUS.EM_ANDAMENTO, icon: CheckCircle2, title: 'Em andamento' },
  { key: STATUS.PENDENCIA, icon: AlertTriangle, title: 'Pendências' },
  { key: STATUS.CONCLUIDO, icon: CheckCircle2, title: 'Já feito' },
]

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Icon size={13} className="shrink-0 text-slate-400" />
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-600">{value}</span>
    </div>
  )
}

export default function ClientDetail() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tickets, setTickets] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTicket, setActiveTicket] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .eq('codigo_cliente', codigo)
        .order('criado_em', { ascending: false })
      if (!active) return
      setTickets(data || [])
    }
    load()

    const channel = supabase
      .channel(`cliente-${codigo}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `codigo_cliente=eq.${codigo}` },
        () => load()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [codigo])

  async function removeClient() {
    if (!confirm(`Excluir o cliente #${codigo} e todos os seus tickets?`)) return
    const { error } = await supabase.from('tickets').delete().eq('codigo_cliente', codigo)
    if (!error) navigate('/kanban')
  }

  if (!tickets) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const info = tickets[0] || {}
  const total = tickets.length
  const done = tickets.filter((t) => t.status === STATUS.CONCLUIDO).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const tec = tickets.filter((t) => t.area === AREAS.TECNICA)
  const trn = tickets.filter((t) => t.area === AREAS.TREINAMENTO)
  const clientStatus = total && done === total ? CLIENT_STATUS.CONCLUIDO : CLIENT_STATUS.ATIVO
  const avgDays = (() => {
    const d = tickets
      .filter((t) => t.status === STATUS.CONCLUIDO && t.concluido_em)
      .map((t) => daysBetween(t.criado_em, t.concluido_em))
      .filter((x) => x !== null)
    return d.length ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) : null
  })()

  const editClient = {
    codigo: info.codigo_cliente || '',
    nome: info.nome_cliente || '',
    cidade: info.cidade || '',
    uf: info.uf || '',
    contato: info.contato || '',
    telefone: info.telefone || '',
    versao_sistema: info.versao_sistema || '',
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <button
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-blue-600"
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="glass-strong rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Building2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
                  Cliente #{codigo}
                </h1>
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${CLIENT_STATUS_CHIP[clientStatus]}`}>
                  {CLIENT_STATUS_LABEL[clientStatus]}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-slate-500">{info.nome_cliente || 'Sem nome'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNew(true)} className="btn-primary">
              <Plus size={15} />
              Novo ticket
            </button>
            <button
              onClick={() => setEditing(true)}
              className="btn-ghost"
              title="Editar cliente"
            >
              <Pencil size={15} />
            </button>
            {isAdmin && (
              <button
                onClick={removeClient}
                className="btn-ghost hover:text-rose-500"
                title="Excluir cliente"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={MapPin} label="Local" value={info.cidade ? `${info.cidade}${info.uf ? ` - ${info.uf}` : ''}` : ''} />
          <InfoRow icon={Phone} label="Telefone" value={info.telefone} />
          <InfoRow icon={UserIcon} label="Contato" value={info.contato} />
          <InfoRow icon={Package} label="Versão do sistema" value={info.versao_sistema} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-slate-800">{total}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Tickets no total</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-blue-600">{tec.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Técnica</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-violet-600">{trn.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Treinamento</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-emerald-600">{done}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Concluídos</div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-500">Progresso da implantação</span>
          <span className="text-slate-400">
            {done}/{total} concluídos {avgDays !== null && `· média de ${avgDays} dias`}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {BLOCKS.map(({ key, icon: Icon, title }) => {
          const list = tickets.filter((t) => t.status === key)
          return (
            <section key={key} className="glass rounded-2xl p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Icon size={14} className={STATUS_DOT[key]} />
                {title}
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                  {list.length}
                </span>
              </h3>
              {list.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-400">Nenhum ticket aqui</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-blue-200"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
                          {AREA_LABEL[t.area]}
                        </span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_BADGE[t.prioridade]}`}>
                          {PRIORITY_LABEL[t.prioridade]}
                        </span>
                        <span className={`ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{t.titulo}</p>
                      {t.descricao && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{t.descricao}</p>}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={t.responsavel?.name} role={t.responsavel?.role} size="sm" />
                          {t.responsavel?.name || 'Sem responsável'}
                        </span>
                        <span>
                          {t.status === STATUS.CONCLUIDO
                            ? `feito ${formatDate(t.concluido_em)}`
                            : `atualizado ${timeAgo(t.atualizado_em)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} codigoInicial={codigo} />
      <EditClientModal open={editing} onClose={() => setEditing(false)} client={editClient} onSaved={() => {}} />
      <TicketDetailModal
        open={!!activeTicket}
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
      />
    </div>
  )
}