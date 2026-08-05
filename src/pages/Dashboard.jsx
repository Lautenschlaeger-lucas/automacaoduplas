import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, CheckCircle2, Timer, Clock, Plus, TrendingUp, Layers, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, AREAS, AREA_BAR, AREA_CHIP, AREA_LABEL } from '../lib/constants'
import { formatDate, timeAgo, daysBetween, monthKey } from '../lib/format'
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

function ProgressBar({ done, total, barCls = 'bg-blue-500' }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${total > 0 && done === total ? 'bg-emerald-500' : barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-slate-500">
        {done}/{total}
      </span>
    </div>
  )
}

function AvgRow({ label, avgDays, max, barCls }) {
  const pct = max && avgDays != null ? Math.min(100, (avgDays / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-semibold text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-bold text-slate-700">
        {avgDays == null ? '—' : `${avgDays.toFixed(1)} dias`}
      </span>
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
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tickets, setTickets] = useState(null)
  const [processos, setProcessos] = useState([])
  const [collabs, setCollabs] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase
        .from('tickets')
        .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .order('criado_em', { ascending: false }),
      supabase.from('profiles').select('*').order('name'),
      supabase.from('processos').select('*'),
    ]).then(([t, p, pr]) => {
      setTickets(t.data || [])
      setCollabs(p.data || [])
      setProcessos(pr.data || [])
    })
  }, [])

  const visiveis = useMemo(() => {
    if (!tickets) return null
    if (!filtro || filtro === 'todos') return tickets
    return tickets.filter((t) => t.responsavel_id === filtro)
  }, [tickets, filtro])

  const projetos = useMemo(() => {
    if (!visiveis) return []
    const map = new Map()
    visiveis.forEach((t) => {
      let p = map.get(t.codigo_cliente)
      if (!p) {
        p = { codigo: t.codigo_cliente, nome: t.nome_cliente || '', parent: null, filhos: [] }
        map.set(t.codigo_cliente, p)
      }
      if (t.parent_id) p.filhos.push(t)
      else {
        p.parent = t
        p.nome = t.titulo || t.nome_cliente || ''
      }
    })
    return [...map.values()]
      .map((p) => {
        const todos = p.parent ? [p.parent, ...p.filhos] : p.filhos
        const done = todos.filter((t) => t.status === STATUS.CONCLUIDO).length
        const concluido = p.parent
          ? p.parent.status === STATUS.CONCLUIDO
          : p.filhos.length > 0 && p.filhos.every((f) => f.status === STATUS.CONCLUIDO)
        const created =
          p.parent?.criado_em ||
          (p.filhos.length ? p.filhos.map((f) => f.criado_em).sort()[0] : null)
        const concluded = concluido
          ? p.parent?.concluido_em ||
            p.filhos.map((f) => f.concluido_em).filter(Boolean).sort().pop() ||
            null
          : null
        const ultimaAtividade = todos
          .map((t) => new Date(t.atualizado_em))
          .sort((a, b) => b - a)[0]
        const procs = processos.filter((x) => x.ticket_pai_id === p.parent?.id)
        return {
          ...p,
          total: todos.length,
          done,
          concluido,
          dias:
            created != null
              ? concluido && concluded
                ? daysBetween(created, concluded)
                : daysBetween(created, new Date().toISOString())
              : null,
          created,
          concluded,
          ultimaAtividade,
          procFeitos: procs.filter((x) => x.feito).length,
          procTotal: procs.length,
          pendencias: todos.filter((t) => t.status === STATUS.PENDENCIA).length,
        }
      })
      .sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1
        return (b.dias || 0) - (a.dias || 0)
      })
  }, [visiveis, processos])

  const kpis = useMemo(() => {
    if (!visiveis) return null
    const projConcluidos = projetos.filter((p) => p.concluido)
    const durProjetos = projConcluidos.map((p) => p.dias).filter((d) => d != null)
    const mediaProjeto = durProjetos.length
      ? durProjetos.reduce((a, b) => a + b, 0) / durProjetos.length
      : null
    const concluidos = visiveis.filter((t) => t.status === STATUS.CONCLUIDO && t.concluido_em)
    const durTickets = concluidos
      .map((t) => daysBetween(t.criado_em, t.concluido_em))
      .filter((d) => d != null)
    const mediaTicket = durTickets.length
      ? durTickets.reduce((a, b) => a + b, 0) / durTickets.length
      : null
    return {
      projAtivos: projetos.length - projConcluidos.length,
      projConcluidos: projConcluidos.length,
      mediaProjeto,
      mediaTicket,
      pendencias: visiveis.filter((t) => t.status === STATUS.PENDENCIA).length,
    }
  }, [visiveis, projetos])

  const porArea = useMemo(() => {
    if (!visiveis) return []
    return Object.values(AREAS).map((area) => {
      const list = visiveis.filter(
        (t) => t.area === area && t.status === STATUS.CONCLUIDO && t.concluido_em
      )
      const ds = list.map((t) => daysBetween(t.criado_em, t.concluido_em)).filter((d) => d != null)
      return {
        area,
        avg: ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null,
        n: list.length,
      }
    })
  }, [visiveis])

  const mensal = useMemo(() => {
    if (!visiveis) return []
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d
          .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          .replace('.', ''),
      })
    }
    return months.map((m) => ({
      ...m,
      projetos: projetos.filter(
        (p) => p.concluido && p.concluded && monthKey(p.concluded) === m.key
      ).length,
      tickets: visiveis.filter((t) => t.concluido_em && monthKey(t.concluido_em) === m.key).length,
    }))
  }, [visiveis, projetos])

  const perCollab = useMemo(() => {
    if (!visiveis) return []
    return collabs
      .map((c) => ({
        name: c.name.split(' ')[0],
        role: c.role,
        total: visiveis.filter((x) => x.responsavel_id === c.id).length,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [visiveis, collabs])

  const recent = useMemo(
    () =>
      visiveis
        ? [...visiveis]
            .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em))
            .slice(0, 6)
        : [],
    [visiveis]
  )

  if (!kpis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const maxAvg = Math.max(kpis.mediaTicket || 0, ...porArea.map((a) => a.avg || 0), 1)
  const maxMensal = Math.max(...mensal.map((m) => Math.max(m.projetos, m.tickets)), 1)
  const maxCollab = Math.max(...perCollab.map((c) => c.total), 1)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Olá, <b className="text-slate-600">{profile?.name?.split(' ')[0]}</b> — cada cliente é
            um projeto, com seus tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="field w-48 !py-2"
            title="Filtrar relatórios por responsável"
          >
            <option value="todos">Todos os responsáveis</option>
            {user && (
              <option value={user.id}>
                Meus tickets{profile?.name ? ` (${profile.name.split(' ')[0]})` : ''}
              </option>
            )}
            {isAdmin &&
              collabs
                .filter((c) => c.id !== user?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
          </select>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} />
            Novo ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Projetos ativos"
          value={kpis.projAtivos}
          sub={`${kpis.projConcluidos} concluídos no total`}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Projetos concluídos"
          value={kpis.projConcluidos}
          sub={`${kpis.pendencias} pendências em aberto`}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          icon={Timer}
          label="Duração média (projeto)"
          value={kpis.mediaProjeto == null ? '—' : `${kpis.mediaProjeto.toFixed(1)} dias`}
          sub="média dos projetos concluídos"
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          icon={Clock}
          label="Tempo médio (ticket)"
          value={kpis.mediaTicket == null ? '—' : `${kpis.mediaTicket.toFixed(1)} dias`}
          sub="média dos tickets concluídos"
          accent="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Layers size={15} className="text-blue-600" />
          Projetos
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {projetos.length} projetos
          </span>
        </h2>
        {projetos.length === 0 ? (
          <EmptyState title="Nenhum projeto ainda" hint="Crie o primeiro ticket no Kanban." />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {projetos.map((p) => (
              <Link
                key={p.codigo}
                to={`/projetos/${p.codigo}`}
                className="group flex items-center gap-4 py-3 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {p.nome || `Cliente ${p.codigo}`}
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      #{p.codigo}
                    </span>
                    {p.parent?.area && (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[p.parent.area]}`}
                      >
                        {AREA_LABEL[p.parent.area]}
                      </span>
                    )}
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        p.concluido
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-sky-200 bg-sky-50 text-sky-700'
                      }`}
                    >
                      {p.concluido ? 'Concluído' : 'Ativo'}
                    </span>
                  </div>
                  <div className="mt-2 max-w-md">
                    <ProgressBar done={p.done} total={p.total} barCls="bg-blue-500" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {p.procTotal > 0 && `${p.procFeitos}/${p.procTotal} processos · `}
                    {p.pendencias > 0 && <b className="text-rose-500">{p.pendencias} pendências</b>}
                    {p.pendencias === 0 && `${p.total - p.done} em aberto`} · atualizado{' '}
                    {timeAgo(p.ultimaAtividade?.toISOString())}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-extrabold text-slate-700">
                    {p.dias == null ? '—' : `${p.dias}d`}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {p.concluido ? 'para concluir' : 'em aberto'}
                  </p>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-300 transition group-hover:text-blue-500" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Clock size={15} className="text-violet-600" />
            Tempo médio de conclusão
          </h2>
          <div className="flex flex-col gap-3.5">
            <AvgRow label="Geral" avgDays={kpis.mediaTicket} max={maxAvg} barCls="bg-blue-500" />
            {porArea.map((a) => (
              <AvgRow
                key={a.area}
                label={AREA_LABEL[a.area]}
                avgDays={a.avg}
                max={maxAvg}
                barCls={AREA_BAR[a.area]}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            Dias entre a criação e a conclusão dos tickets.{' '}
            {kpis.mediaTicket == null && 'Nenhum ticket concluído ainda.'}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <TrendingUp size={15} className="text-emerald-600" />
            Concluídos por mês
          </h2>
          <div className="mb-3 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Projetos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Tickets
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {mensal.map((m) => (
              <div key={m.key} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] font-semibold capitalize text-slate-500">
                  {m.label}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-50">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${(m.projetos / maxMensal) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-[10px] font-semibold text-slate-500">
                      {m.projetos}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-50">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${(m.tickets / maxMensal) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-[10px] font-semibold text-slate-500">
                      {m.tickets}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Tickets por colaborador</h2>
          <div className="flex flex-col gap-3">
            {perCollab.length === 0 && <EmptyState title="Sem colaboradores com tickets" />}
            {perCollab.map((c) => (
              <CollabBar
                key={c.name}
                label={c.name}
                value={c.total}
                max={maxCollab}
                barCls={c.role === 'treinamento' ? AREA_BAR.treinamento : AREA_BAR.tecnica}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-700">Atividade recente</h2>
        {recent.length === 0 ? (
          <EmptyState title="Nenhum ticket ainda" hint="Crie o primeiro ticket no Kanban." />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {recent.map((t) => (
              <Link
                key={t.id}
                to={`/projetos/${t.codigo_cliente}`}
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
