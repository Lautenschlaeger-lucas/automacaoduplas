import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ClipboardList, PlayCircle, AlertTriangle, Plus, TrendingUp, Laptop, GraduationCap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, AREAS, AREA_BAR, AREA_CHIP, AREA_LABEL } from '../lib/constants'
import { formatDate } from '../lib/format'
import { Spinner, EmptyState } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'

function KpiCard({ icon: Icon, label, value, sub, accent = 'bg-slate-100 text-slate-600' }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function ProgressRow({ label, done, total, barCls }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="text-slate-400">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${total === done && total > 0 ? 'bg-emerald-500' : barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CollabBar({ label, value, max, barCls }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-bold text-slate-700">{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase
        .from('tickets')
        .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .order('criado_em', { ascending: false }),
      supabase.from('profiles').select('*').order('name'),
    ]).then(([t, p]) => {
      setTickets(t.data || [])
      setCollabs(p.data || [])
    })
  }, [])

  const stats = useMemo(() => {
    if (!tickets) return null
    const t = tickets
    const codes = [...new Set(t.map((x) => x.codigo_cliente))]
    const activeCodes = codes.filter((c) => t.some((x) => x.codigo_cliente === c && x.status !== STATUS.CONCLUIDO))

    const perCollab = collabs
      .map((c) => ({
        name: c.name.split(' ')[0],
        role: c.role,
        total: t.filter((x) => x.responsavel_id === c.id).length,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)

    const perArea = Object.values(AREAS).map((area) => {
      const list = t.filter((x) => x.area === area)
      return {
        area,
        total: list.length,
        done: list.filter((x) => x.status === STATUS.CONCLUIDO).length,
      }
    })

    const recent = [...t].sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em)).slice(0, 5)

    const comigo = t.filter((x) => x.responsavel_id === profile?.id)
    const comTreinamento = t.filter((x) => x.responsavel?.role === 'treinamento')
    const treinador = collabs.find((c) => c.role === 'treinamento')

    return {
      totalClients: codes.length,
      ativos: activeCodes.length,
      abertos: t.filter((x) => x.status === STATUS.ABERTO).length,
      andamento: t.filter((x) => x.status === STATUS.EM_ANDAMENTO).length,
      pendencias: t.filter((x) => x.status === STATUS.PENDENCIA).length,
      comigo: comigo.length,
      comigoAndamento: comigo.filter((x) => x.status === STATUS.EM_ANDAMENTO).length,
      comigoPend: comigo.filter((x) => x.status === STATUS.PENDENCIA).length,
      comTreinamento: comTreinamento.length,
      treinadorNome: treinador?.name?.split(' ')[0],
      perCollab,
      perArea,
      maxCollab: Math.max(...perCollab.map((c) => c.total), 1),
      recent,
    }
  }, [tickets, collabs, profile])

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Olá, <b className="text-slate-600">{profile?.name?.split(' ')[0]}</b> — visão geral das implantações.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} />
          Novo ticket
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={Users} label="Clientes ativos" value={stats.ativos} sub={`${stats.totalClients} no total`} accent="bg-blue-50 text-blue-600" />
        <KpiCard icon={ClipboardList} label="Tickets abertos" value={stats.abertos} accent="bg-sky-50 text-sky-600" />
        <KpiCard icon={PlayCircle} label="Em andamento" value={stats.andamento} accent="bg-amber-50 text-amber-600" />
        <KpiCard icon={AlertTriangle} label="Pendências" value={stats.pendencias} accent="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <KpiCard
          icon={Laptop}
          label="Comigo"
          value={stats.comigo}
          sub={`${stats.comigoAndamento} em andamento · ${stats.comigoPend} pendências`}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={GraduationCap}
          label="Com o treinamento"
          value={stats.comTreinamento}
          sub={stats.treinadorNome ? `com ${stats.treinadorNome}` : 'Sem treinador definido'}
          accent="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <TrendingUp size={15} className="text-blue-600" />
            Progresso por área
          </h2>
          <div className="flex flex-col gap-4">
            {stats.perArea.map((a) => (
              <ProgressRow key={a.area} label={AREA_LABEL[a.area]} done={a.done} total={a.total} barCls={AREA_BAR[a.area]} />
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-400">
            {stats.pendencias > 0 ? (
              <b className="text-rose-500">{stats.pendencias} pendências</b>
            ) : (
              'Sem pendências em aberto'
            )}{' '}
            aguardando ação no Kanban.
          </p>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Tickets por colaborador</h2>
          <div className="flex flex-col gap-3">
            {stats.perCollab.length === 0 && <EmptyState title="Sem colaboradores com tickets" />}
            {stats.perCollab.map((c) => (
              <CollabBar
                key={c.name}
                label={c.name}
                value={c.total}
                max={stats.maxCollab}
                barCls={c.role === 'treinamento' ? AREA_BAR.treinamento : AREA_BAR.tecnica}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-700">Atividade recente</h2>
        {stats.recent.length === 0 ? (
          <EmptyState title="Nenhum ticket ainda" hint="Crie o primeiro ticket no Kanban." />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {stats.recent.map((t) => (
              <Link
                key={t.id}
                to={`/clientes/${t.codigo_cliente}`}
                className="flex items-center gap-3 py-2.5 transition hover:bg-slate-50"
              >
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] capitalize ${AREA_CHIP[t.area]}`}>
                  {t.area === 'tecnica' ? 'Téc.' : 'Trin.'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{t.titulo}</p>
                  <p className="text-[11px] text-slate-400">
                    #{t.codigo_cliente} {t.nome_cliente} · {formatDate(t.atualizado_em)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}