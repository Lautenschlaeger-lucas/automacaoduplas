import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Search, Laptop, GraduationCap, Wrench } from 'lucide-react'
import { supabase, fetchAllRows } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, STATUS_ORDER, STATUS_LABEL, STATUS_LABEL_TECNICA, STATUS_DOT, AREAS, AREA_LABEL, AREA_CHIP, FLUXO_TECNICA_TREINAMENTO } from '../lib/constants'
import { progressoChecklist, estadoTicket, useLimiteParado } from '../lib/checklist'
import { Spinner } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'
import TicketDetailModal from '../components/TicketDetailModal'
import ConcluirTreinamentoModal from '../components/ConcluirTreinamentoModal'

const KanbanContext = createContext({ ticketsById: {}, processosByPai: {}, limite: 5 })
const useKanbanCtx = () => useContext(KanbanContext)

const BOARDS = [
  { key: AREAS.TECNICA, title: AREA_LABEL[AREAS.TECNICA], Icon: Laptop, icon: 'text-blue-600', text: 'text-blue-700' },
  {
    key: AREAS.TREINAMENTO,
    title: AREA_LABEL[AREAS.TREINAMENTO],
    Icon: GraduationCap,
    icon: 'text-violet-600',
    text: 'text-violet-700',
  },
  { key: 'filhos', title: 'Tickets Técnicos', Icon: Wrench, icon: 'text-blue-600', text: 'text-blue-700' },
]

function AvatarDot({ name, role }) {
  const grad =
    role === 'treinamento'
      ? 'bg-violet-500'
      : role === 'admin'
        ? 'bg-amber-500'
        : 'bg-blue-500'
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${grad}`}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

function KanbanCard({ id }) {
  const { ticketsById, processosByPai, limite } = useKanbanCtx()
  const t = ticketsById[id]
  if (!t) return null
  const paiId = t.parent_id || t.id
  const procs = processosByPai[paiId] || []

  if (!t.parent_id) {
    const prog = progressoChecklist(procs)
    const est = estadoTicket(t, procs, limite)
    const steads = est.itensBloqueados
      .map((p) => p.bloqueado_por || 'sem responsável')
      .filter((v, i, a) => a.indexOf(v) === i)
    return (
      <>
        <div className="mb-1 flex items-center gap-2 overflow-hidden">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
            #{t.codigo_cliente}
          </span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Geral
          </span>
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
            {AREA_LABEL[t.area]}
          </span>
        </div>
        <h3 className="line-clamp-1 min-h-0 flex-1 text-[13px] font-semibold leading-snug text-slate-800">
          {t.titulo}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${prog.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {prog.feitos}/{prog.aplicaveis} · {prog.pct}%
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {est.bloqueado && (
            <span
              className="flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700"
              title={est.itensBloqueados.map((p) => `${p.titulo}: ${p.motivo || 'sem motivo'}`).join('\n')}
            >
              Bloqueado · {steads[0]}
              {steads.length > 1 && ` +${steads.length - 1}`}
            </span>
          )}
          {est.parado && (
            <span
              className="flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700"
              title={`Sem atualização há ${est.diasParado} dias úteis`}
            >
              Parado {est.diasParado}d
            </span>
          )}
          {!est.bloqueado && !est.parado && (
            <span className="ml-auto flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] text-slate-400">
              {progsResponsavel(t)}
            </span>
          )}
        </div>
      </>
    )
  }

  const priority =
    t.prioridade === 'alta' ? 'text-rose-600' : t.prioridade === 'media' ? 'text-amber-600' : 'text-emerald-600'
  return (
    <>
      <div className="mb-1 flex items-center gap-2 overflow-hidden">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          #{t.codigo_cliente}
        </span>
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
          {AREA_LABEL[t.area]}
        </span>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${priority}`}>
          {t.prioridade}
        </span>
      </div>
      <h3 className="line-clamp-2 min-h-0 flex-1 text-[13px] font-semibold leading-snug text-slate-800">{t.titulo}</h3>
      <div className="mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] text-slate-400">
        {progsResponsavel(t)}
      </div>
    </>
  )
}

function progsResponsavel(t) {
  return (
    <>
      <AvatarDot name={t.responsavel?.name} role={t.responsavel?.role} />
      <span className="min-w-0 truncate">{t.responsavel?.name?.split(' ')[0] || 'Sem responsável'}</span>
      {t.nome_cliente && <span className="min-w-0 truncate">· {t.nome_cliente}</span>}
    </>
  )
}

function Column({ area, status, ids, openTicket }) {
  const { ticketsById } = useKanbanCtx()
  const label = area === AREAS.TECNICA ? STATUS_LABEL_TECNICA[status] : STATUS_LABEL[status]
  return (
    <Droppable droppableId={`${area}:${status}`}>
      {(provided, snapshot) => (
        <div className="flex min-w-60 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {ids.length}
            </span>
          </div>
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex max-h-[23rem] min-h-24 flex-col gap-2 overflow-y-auto rounded-2xl border p-2 transition ${
              snapshot.isDraggingOver
                ? 'border-blue-300 bg-blue-50/60'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            {ids.length === 0 && !snapshot.isDraggingOver && (
              <div className="py-6 text-center text-[11px] text-slate-400">Arraste tickets aqui</div>
            )}
            {ids.map((id, index) => (
              <Draggable key={id} draggableId={id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    onClick={() => openTicket(id)}
                    className={`glass flex shrink-0 cursor-pointer flex-col rounded-xl p-3 transition ${
                      ticketsById[id]?.parent_id ? 'h-28' : 'h-32'
                    } ${
                      dragSnapshot.isDragging
                        ? 'rotate-1 scale-[1.03] shadow-lg ring-2 ring-blue-300'
                        : 'hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <KanbanCard id={id} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}

export default function Kanban() {
  const { user } = useAuth()
  const [ticketsByColumn, setTicketsByColumn] = useState(null)
  const [ticketsById, setTicketsById] = useState({})
  const [processos, setProcessos] = useState([])
  const { limite } = useLimiteParado(supabase)
  const [query, setQuery] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [analistaFiltro, setAnalistaFiltro] = useState('todos')
  const [analistas, setAnalistas] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [activeTicket, setActiveTicket] = useState(null)
  const [concluirTreinamento, setConcluirTreinamento] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select('*, responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .order('criado_em', { ascending: false })
      if (!active || !data) return
      const byId = {}
      const cols = {}
      BOARDS.forEach((b) => {
        cols[b.key] = {}
        STATUS_ORDER.forEach((s) => (cols[b.key][s] = []))
      })
      data.forEach((t) => {
        byId[t.id] = t
        cols[t.parent_id ? 'filhos' : t.area][t.status].push(t.id)
      })
      setTicketsById(byId)
      setTicketsByColumn(cols)
    }
    async function loadProcessos() {
      const { data } = await fetchAllRows(supabase, 'processos')
      if (active && data) setProcessos(data)
    }
    async function loadAnalistas() {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .not('name', 'is', null)
        .order('name')
      if (active && data) setAnalistas(data)
    }
    load()
    loadProcessos()
    loadAnalistas()

    const channel = supabase
      .channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'processos' }, () => loadProcessos())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const processosByPai = useMemo(() => {
    const map = {}
    processos.forEach((p) => {
      ;(map[p.ticket_pai_id] ||= []).push(p)
    })
    return map
  }, [processos])

  async function handleDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const [srcArea, srcStatus] = source.droppableId.split(':')
    const [dstArea, dstStatus] = destination.droppableId.split(':')
    const moved = ticketsById[draggableId]

    const alvo = FLUXO_TECNICA_TREINAMENTO(
      { area: dstArea, status: dstStatus },
      !moved?.parent_id
    )

    if (
      !moved?.parent_id &&
      alvo.area === AREAS.TREINAMENTO &&
      alvo.status === STATUS.CONCLUIDO &&
      !(moved.area === AREAS.TREINAMENTO && moved.status === STATUS.CONCLUIDO)
    ) {
      setConcluirTreinamento(moved)
      return
    }

    setTicketsByColumn((prev) => {
      const cols = JSON.parse(JSON.stringify(prev))
      const srcList = cols[srcArea][srcStatus]
      const [card] = srcList.splice(source.index, 1)
      const dstList = cols[alvo.area][alvo.status]
      dstList.splice(destination.index, 0, card)
      return cols
    })

    if (srcArea === alvo.area && srcStatus === alvo.status) return

    const patch = {}
    if (srcStatus !== alvo.status) patch.status = alvo.status
    if (srcArea !== alvo.area) patch.area = alvo.area
    if (alvo.tecnica_concluido_em) patch.tecnica_concluido_em = alvo.tecnica_concluido_em

    if (!moved?.responsavel_id && (alvo.status === STATUS.EM_ANDAMENTO || alvo.status === STATUS.PENDENCIA)) {
      patch.responsavel_id = user?.id
      setTicketsById((prev) => ({ ...prev, [draggableId]: { ...prev[draggableId], responsavel_id: user?.id } }))
    }

    if (srcArea !== alvo.area) {
      setTicketsById((prev) => ({ ...prev, [draggableId]: { ...prev[draggableId], area: alvo.area } }))
    }
    if (srcStatus !== alvo.status) {
      setTicketsById((prev) => ({ ...prev, [draggableId]: { ...prev[draggableId], status: alvo.status } }))
    }

    const { error } = await supabase.from('tickets').update(patch).eq('id', draggableId)
    if (error) console.error('Erro ao mover ticket:', error.message)
  }

  const filtered = useMemo(() => {
    if (!ticketsByColumn) return ticketsByColumn
    const q = query.trim().toLowerCase()
    const cols = JSON.parse(JSON.stringify(ticketsByColumn))
    BOARDS.forEach((b) =>
      STATUS_ORDER.forEach((s) => {
        cols[b.key][s] = cols[b.key][s].filter((id) => {
          const t = ticketsById[id]
          if (!t) return false
          if (q) {
            const match =
              (t.codigo_cliente || '').toLowerCase().includes(q) ||
              (t.nome_cliente || '').toLowerCase().includes(q) ||
              t.titulo.toLowerCase().includes(q)
            if (!match) return false
          }
          if (analistaFiltro !== 'todos' && t.responsavel_id !== analistaFiltro) return false
          if (estadoFiltro !== 'todos') {
            const pai = ticketsById[t.parent_id || t.id]
            const est = estadoTicket(pai, processosByPai[pai?.id] || [], limite)
            if (estadoFiltro === 'bloqueados' && !est?.bloqueado) return false
            if (estadoFiltro === 'parados' && !est?.parado) return false
          }
          return true
        })
      })
    )
    return cols
  }, [query, estadoFiltro, analistaFiltro, ticketsByColumn, ticketsById, processosByPai, limite])

  if (!ticketsByColumn) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <KanbanContext.Provider value={{ ticketsById, processosByPai, limite }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Kanban</h1>
            <p className="text-sm text-slate-400">Arraste os tickets entre as fases para atualizar em tempo real.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar projeto..."
                className="field w-36 py-2 sm:w-44"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="field w-36 !py-2 sm:w-40"
              title="Filtrar por estado de saúde da implantação"
            >
              <option value="todos">Todos os estados</option>
              <option value="bloqueados">Bloqueados</option>
              <option value="parados">Parados</option>
            </select>

            <select
              value={analistaFiltro}
              onChange={(e) => setAnalistaFiltro(e.target.value)}
              className="field w-36 !py-2 sm:w-44"
              title="Filtrar por analista responsável"
            >
              <option value="todos">Todos os analistas</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <button onClick={() => setShowNew(true)} className="btn-primary">
              <Plus size={15} />
              Novo
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-8">
            {BOARDS.map(({ key, title, Icon, icon, text }) => (
              <section key={key} className="min-w-0">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                  <Icon size={15} className={icon} />
                  <span className={text}>{title}</span>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    {Object.values(filtered[key]).flat().length} tickets
                  </span>
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {STATUS_ORDER.map((status) => (
                    <Column
                      key={status}
                      area={key}
                      status={status}
                      ids={filtered[key][status]}
                      openTicket={(id) => setActiveTicket(ticketsById[id])}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DragDropContext>

        <NewTicketModal open={showNew} onClose={() => setShowNew(false)} />
        <TicketDetailModal
          open={!!activeTicket}
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onOpenTicket={setActiveTicket}
        />

        <ConcluirTreinamentoModal
          open={!!concluirTreinamento}
          ticket={concluirTreinamento}
          onClose={() => setConcluirTreinamento(null)}
        />
      </div>
    </KanbanContext.Provider>
  )
}