import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Search, Laptop, GraduationCap, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, STATUS_ORDER, STATUS_LABEL, STATUS_DOT, AREAS, AREA_LABEL, AREA_CHIP, FLUXO_TECNICA_TREINAMENTO } from '../lib/constants'
import { Spinner } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'
import TicketDetailModal from '../components/TicketDetailModal'

const KanbanContext = createContext({ ticketsById: {} })
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
  const { ticketsById } = useKanbanCtx()
  const t = ticketsById[id]
  if (!t) return null
  const priority =
    t.prioridade === 'alta' ? 'text-rose-600' : t.prioridade === 'media' ? 'text-amber-600' : 'text-emerald-600'
  return (
    <>
      <div className="mb-1 flex items-center gap-2 overflow-hidden">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          #{t.codigo_cliente}
        </span>
        {!t.parent_id && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Geral
          </span>
        )}
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[t.area]}`}>
          {AREA_LABEL[t.area]}
        </span>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${priority}`}>
          {t.prioridade}
        </span>
      </div>
      <h3 className="line-clamp-2 min-h-0 flex-1 text-[13px] font-semibold leading-snug text-slate-800">{t.titulo}</h3>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
        <AvatarDot name={t.responsavel?.name} role={t.responsavel?.role} />
        <span className="truncate">{t.responsavel?.name?.split(' ')[0] || 'Sem responsável'}</span>
        {t.nome_cliente && <span className="truncate">· {t.nome_cliente}</span>}
      </div>
    </>
  )
}

function Column({ area, status, ids, openTicket }) {
  return (
    <Droppable droppableId={`${area}:${status}`}>
      {(provided, snapshot) => (
        <div className="flex min-w-60 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{STATUS_LABEL[status]}</span>
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
                    className={`glass flex h-28 shrink-0 cursor-pointer flex-col rounded-xl p-3 transition ${
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
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [activeTicket, setActiveTicket] = useState(null)

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
    load()

    const channel = supabase
      .channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

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
    if (!q) return ticketsByColumn
    const cols = JSON.parse(JSON.stringify(ticketsByColumn))
    BOARDS.forEach((b) =>
      STATUS_ORDER.forEach((s) => {
        cols[b.key][s] = cols[b.key][s].filter((id) => {
          const t = ticketsById[id]
          if (!t) return false
          return (
            (t.codigo_cliente || '').toLowerCase().includes(q) ||
            (t.nome_cliente || '').toLowerCase().includes(q) ||
            t.titulo.toLowerCase().includes(q)
          )
        })
      })
    )
    return cols
  }, [query, ticketsByColumn, ticketsById])

  if (!ticketsByColumn) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <KanbanContext.Provider value={{ ticketsById }}>
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
                className="field w-40 py-2 sm:w-52"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

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
      </div>
    </KanbanContext.Provider>
  )
}