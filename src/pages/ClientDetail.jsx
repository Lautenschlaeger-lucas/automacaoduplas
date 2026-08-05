import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Building2,
  MapPin,
  Phone,
  User as UserIcon,
  Package,
  Laptop,
  GraduationCap,
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
import ClientFormModal from '../components/ClientFormModal'

const BLOCKS = [
  { key: STATUS.ABERTO, icon: Clock, title: 'Em aberto' },
  { key: STATUS.EM_ANDAMENTO, icon: Laptop, title: 'Em andamento' },
  { key: STATUS.PENDENCIA, icon: AlertTriangle, title: 'Pendências' },
  { key: STATUS.CONCLUIDO, icon: CheckCircle2, title: 'Já feito' },
]

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Icon size={13} className="shrink-0 text-slate-500" />
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-300">{value}</span>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [client, setClient] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [c, t] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase
          .from('tickets')
          .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
          .eq('cliente_id', id)
          .order('criado_em', { ascending: false }),
      ])
      if (!active) return
      if (c.data) setClient(c.data)
      setTickets(t.data || [])
    }
    load()

    const channel = supabase
      .channel(`cliente-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `cliente_id=eq.${id}` }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [id])

  async function removeClient() {
    if (!confirm(`Excluir o cliente #${client.codigo} (${client.nome}) e todos os seus tickets?`)) return
    await supabase.from('clients').delete().eq('id', id)
    navigate('/clientes')
  }

  if (!client || !tickets) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const total = tickets.length
  const done = tickets.filter((t) => t.status === STATUS.CONCLUIDO).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const tec = tickets.filter((t) => t.area === AREAS.TECNICA)
  const trn = tickets.filter((t) => t.area === AREAS.TREINAMENTO)
  const avgDays = (() => {
    const d = tickets
      .filter((t) => t.status === STATUS.CONCLUIDO && t.concluido_em)
      .map((t) => daysBetween(t.criado_em, t.concluido_em))
      .filter((x) => x !== null)
    return d.length ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) : null
  })()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <button
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-cyan-300"
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="glass-strong neon-border rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-400/20 text-cyan-300">
              <Building2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="glow-text text-xl font-extrabold sm:text-2xl">
                  Cliente #{client.codigo}
                </h1>
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${CLIENT_STATUS_CHIP[client.status]}`}>
                  {CLIENT_STATUS_LABEL[client.status]}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-slate-200">{client.nome}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNew(true)}
              className="dial flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-950 transition hover:opacity-90"
            >
              <Plus size={15} />
              Novo ticket
            </button>
            <button
              onClick={() => setEditing(true)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-cyan-300"
              title="Editar cliente"
            >
              <Pencil size={15} />
            </button>
            {isAdmin && (
              <button
                onClick={removeClient}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-rose-400"
                title="Excluir cliente"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={MapPin} label="Local" value={client.cidade ? `${client.cidade}${client.uf ? ` - ${client.uf}` : ''}` : ''} />
          <InfoRow icon={Phone} label="Telefone" value={client.telefone} />
          <InfoRow icon={UserIcon} label="Contato" value={client.contato} />
          <InfoRow icon={Package} label="Versão do sistema" value={client.versao_sistema} />
        </div>
        {client.observacoes && (
          <p className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
            {client.observacoes}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass neon-border rounded-2xl p-4">
          <div className="text-2xl font-extrabold">{total}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Tickets no total</div>
        </div>
        <div className="glass neon-border rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-cyan-300">{tec.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Técnica</div>
        </div>
        <div className="glass neon-border rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-fuchsia-300">{trn.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Treinamento</div>
        </div>
        <div className="glass neon-border rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-emerald-300">{done}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Concluídos</div>
        </div>
      </div>

      <div className="glass neon-border rounded-2xl p-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-300">Progresso da implantação</span>
          <span className="text-slate-400">
            {done}/{total} concluídos {avgDays !== null && `· média de ${avgDays} dias`}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
              pct === 100 ? 'from-emerald-400 to-teal-400' : 'from-cyan-400 via-indigo-400 to-fuchsia-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {BLOCKS.map(({ key, icon: Icon, title }) => {
          const list = tickets.filter((t) => t.status === key)
          return (
            <section key={key} className="glass neon-border rounded-2xl p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Icon size={14} className={`${STATUS_DOT[key]} rounded-full`} />
                {title}
                <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                  {list.length}
                </span>
              </h3>
              {list.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-600">Nenhum ticket aqui</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-cyan-400/25">
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
                      <p className="text-sm font-semibold text-slate-100">{t.titulo}</p>
                      {t.descricao && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{t.descricao}</p>}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
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

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} clienteId={id} />
      <ClientFormModal open={editing} onClose={() => setEditing(false)} client={client} onSaved={() => {}} />
    </div>
  )
}