import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  Loader,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Activity,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, AREAS, AREA_BAR, AREA_CHIP } from '../lib/constants'
import { daysBetween, formatDate, monthKey } from '../lib/format'
import { Spinner, EmptyState } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="glass neon-border rounded-2xl p-4 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-slate-950 ${accent}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, barCls }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all ${barCls}`}
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-bold">{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState(null)
  const [clients, setClients] = useState([])
  const [collabs, setCollabs] = useState([])
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase
        .from('tickets')
        .select('*, clientes:clients!tickets_cliente_id_fkey(codigo, nome, status), responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .order('criado_em', { ascending: false }),
      supabase.from('clients').select('*').order('codigo'),
      supabase.from('profiles').select('*').order('name'),
    ]).then(([t, c, p]) => {
      setTickets(t.data || [])
      setClients(c.data || [])
      setCollabs(p.data || [])
    })
  }, [])

  const stats = useMemo(() => {
    if (!tickets) return null
    const now = new Date()
    const thisMonth = monthKey(now)
    const t = tickets
    const concluded = t.filter((x) => x.status === STATUS.CONCLUIDO)
    const concludedThisMonth = concluded.filter(
      (x) => x.concluido_em && monthKey(x.concluido_em) === thisMonth
    )
    const avgDays = (() => {
      const withTime = concluded.map((x) => daysBetween(x.criado_em, x.concluido_em)).filter((d) => d !== null)
      if (!withTime.length) return 0
      return (withTime.reduce((a, b) => a + b, 0) / withTime.length).toFixed(1)
    })()
    const perCollab = collabs
      .map((c) => ({
        name: c.name.split(' ')[0],
        role: c.role,
        total: t.filter((x) => x.responsavel_id === c.id).length,
        open: t.filter((x) => x.responsavel_id === c.id && x.status !== STATUS.CONCLUIDO).length,
        done: t.filter((x) => x.responsavel_id === c.id && x.status === STATUS.CONCLUIDO).length,
      }))
      .sort((a, b) => b.total - a.total)

    const perArea = Object.values(AREAS).map((area) => {
      const list = t.filter((x) => x.area === area)
      const done = list.filter((x) => x.status === STATUS.CONCLUIDO).length
      return { area, total: list.length, done, pct: list.length ? Math.round((done / list.length) * 100) : 0 }
    })

    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = monthKey(d)
      last7.push({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        count: concluded.filter((x) => x.concluido_em && monthKey(x.concluido_em) === key && new Date(x.concluido_em).getDate() === d.getDate()).length,
      })
    }
    const maxBar = Math.max(...last7.map((d) => d.count), 1)

    return {
      ativos: clients.filter((c) => c.status === 'ativo').length,
      abertos: t.filter((x) => x.status === STATUS.ABERTO).length,
      andamento: t.filter((x) => x.status === STATUS.EM_ANDAMENTO).length,
      pendencias: t.filter((x) => x.status === STATUS.PENDENCIA).length,
      concluidosMes: concludedThisMonth.length,
      total: t.length,
      avgDays,
      perCollab,
      perArea,
      last7,
      maxBar,
      recent: [...t]
        .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em))
        .slice(0, 6),
    }
  }, [tickets, clients, collabs])

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="glow-text text-xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Olá, <b className="text-slate-200">{profile?.name?.split(' ')[0]}</b> — visão geral das implantações.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="dial flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(124,140,255,0.35)] transition hover:opacity-90"
        >
          <Plus size={16} />
          Novo ticket
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={Users} label="Clientes ativos" value={stats.ativos} sub={`${clients.length} no total`} accent="bg-gradient-to-br from-cyan-400 to-indigo-400" />
        <KpiCard icon={ClipboardList} label="Tickets abertos" value={stats.abertos} sub={`${stats.total} tickets no total`} accent="bg-gradient-to-br from-sky-400 to-cyan-400" />
        <KpiCard icon={Activity} label="Em andamento" value={stats.andamento} sub="sendo trabalhados agora" accent="bg-gradient-to-br from-amber-300 to-orange-400" />
        <KpiCard icon={AlertTriangle} label="Pendências" value={stats.pendencias} sub="precisam de ação" accent="bg-gradient-to-br from-rose-400 to-pink-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={CheckCircle2} label="Concluídos/mês" value={stats.concluidosMes} sub="neste mês" accent="bg-gradient-to-br from-emerald-400 to-teal-400" />
        <KpiCard icon={Timer} label="Tempo médio" value={`${stats.avgDays}d`} sub="para concluir um ticket" accent="bg-gradient-to-br from-violet-400 to-fuchsia-500" />
        <KpiCard icon={TrendingUp} label="Progresso" value={`${stats.perArea[0]?.pct ?? 0}%`} sub="técnica concluída" accent="bg-gradient-to-br from-cyan-400 to-cyan-300" />
        <KpiCard icon={TrendingUp} label="Progresso" value={`${stats.perArea[1]?.pct ?? 0}%`} sub="treinamento concluído" accent="bg-gradient-to-br from-fuchsia-400 to-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass neon-border rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Tickets por colaborador</h2>
          <div className="flex flex-col gap-3">
            {stats.perCollab.length === 0 && <EmptyState title="Sem colaboradores" />}
            {stats.perCollab.map((c) => (
              <MiniBar
                key={c.name}
                label={`${c.name}${c.role === 'admin' ? ' ⭐' : ''}`}
                value={c.total}
                max={Math.max(...stats.perCollab.map((x) => x.total), 1)}
                barCls={c.role === 'treinamento' ? AREA_BAR.treinamento : AREA_BAR.tecnica}
              />
            ))}
          </div>
        </div>

        <div className="glass neon-border rounded-2xl p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Concluídos — últimos 7 dias</h2>
          <div className="flex h-40 items-end gap-2">
            {stats.last7.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-slate-300">{d.count || ''}</span>
                <div
                  className="dial w-full max-w-14 rounded-t-lg opacity-80 transition-all"
                  style={{ height: `${Math.max((d.count / stats.maxBar) * 110, 4)}px` }}
                />
                <span className="text-[10px] capitalize text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass neon-border rounded-2xl p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Atividade recente</h2>
          {stats.recent.length === 0 ? (
            <EmptyState title="Nenhum ticket ainda" hint="Crie o primeiro ticket no Kanban." />
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {stats.recent.map((t) => (
                <Link
                  key={t.id}
                  to={`/clientes/${t.cliente_id}`}
                  className="flex items-center gap-3 py-2.5 transition hover:bg-white/[0.03]"
                >
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 capitalize ${AREA_CHIP[t.area]}`}>
                    {t.area === 'tecnica' ? 'Téc.' : 'Trin.'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{t.titulo}</p>
                    <p className="text-[11px] text-slate-500">
                      #{t.clientes?.codigo} {t.clientes?.nome} · {formatDate(t.atualizado_em)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="glass neon-border rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Progresso por área</h2>
          <div className="flex flex-col gap-4">
            {stats.perArea.map((a) => (
              <div key={a.area}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold capitalize text-slate-300">{a.area}</span>
                  <span className="text-slate-500">
                    {a.done}/{a.total} · {a.pct}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${AREA_BAR[a.area]}`}
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Loader size={13} className="text-rose-300" />
              Atenção
            </h3>
            {stats.pendencias === 0 ? (
              <p className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={14} /> Nenhuma pendência em aberto. Tudo em dia!
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                <b className="text-rose-300">{stats.pendencias} pendências</b> esperando ação no Kanban.
              </p>
            )}
          </div>
        </div>
      </div>

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}