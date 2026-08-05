import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Search, Laptop, GraduationCap, Columns } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS, STATUS_ORDER, STATUS_LABEL, STATUS_DOT, AREAS, AREA_LABEL } from '../lib/constants'
import { Spinner } from '../components/ui'
import NewTicketModal from '../components/NewTicketModal'

const KanbanContext = createContext({ ticketsById: {} })
const useKanbanCtx = () => useContext(KanbanContext)

function AvatarDot({ name, role }) {
  const grad =
    role === 'treinamento'
      ? 'from-fuchsia-400 to-violet-500'
      : role === 'admin'
        ? 'from-amber-300 to-orange-500'
        : 'from-cyan-400 to-indigo-400'
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-slate-950 ${grad}`}
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
    t.prioridade === 'alta' ? 'text-rose-300' : t.prioridade === 'media' ? 'text-amber-300' : 'text-emerald-300'
  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
          #{t.clientes?.codigo}
        </span>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${priority}`}>
          {t.prioridade}
        </span>
      </div>
      <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100">{t.titulo}</h3>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <AvatarDot name={t.responsavel?.name} role={t.responsavel?.role} />
        <span className="truncate">{t.responsavel?.name?.split(' ')[0] || 'Sem responsável'}</span>
        {t.clientes?.nome && <span className="truncate">· {t.clientes.nome}</span>}
      </div>
    </>
  )
}

function Column({ area, status, ids, openClient }) {
  return (
    <Droppable droppableId={`${area}:${status}`}>
      {(provided, snapshot) => (
        <div className="flex min-w-60 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{STATUS_LABEL[status]}</span>
            <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {ids.length}
            </span>
          </div>
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-24 flex-col gap-2 rounded-2xl border p-2 transition ${
              snapshot.isDraggingOver
                ? 'border-cyan-400/40 bg-cyan-400/[0.06] shadow-[inset_0_0_30px_rgba(34,211,238,0.08)]'
                : 'border-white/5 bg-white/[0.02]'
            }`}
          >
            {ids.length === 0 && !snapshot.isDraggingOver && (
              <div className="py-6 text-center text-[11px] text-slate-600">Arraste tickets aqui</div>
            )}
            {ids.map((id, index) => (
              <Draggable key={id} draggableId={id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    onClick={() => openClient(id)}
                    className={`glass cursor-pointer rounded-xl p-3 transition ${
                      dragSnapshot.isDragging
                        ? 'rotate-1 scale-[1.03] border-cyan-400/50 shadow-[0_15px_40px_rgba(124,140,255,0.35)]'
                        : 'hover:-translate-y-0.5 hover:border-cyan-400/30'
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
  const navigate = useNavigate()
  const [ticketsByColumn, setTicketsByColumn] = useState(null)
  const [ticketsById, setTicketsById] = useState({})
  const [query, setQuery] = useState('')
  const [view, setView] = useState('ambos')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select('*, clientes:clients!tickets_cliente_id_fkey(codigo, nome), responsavel:profiles!tickets_responsavel_id_fkey(name, role)')
        .order('criado_em', { ascending: false })
      if (!active || !data) return
      const byId = {}
      const cols = {}
      Object.values(AREAS).forEach((area) => {
        cols[area] = {}
        STATUS_ORDER.forEach((s) => (cols[area][s] = []))
      })
      data.forEach((t) => {
        byId[t.id] = t
        cols[t.area][t.status].push(t.id)
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
    if (srcArea !== dstArea) return

    setTicketsByColumn((prev) => {
      const cols = JSON.parse(JSON.stringify(prev))
      const srcList = cols[srcArea][srcStatus]
      const [moved] = srcList.splice(source.index, 1)
      const dstList = cols[dstArea][dstStatus]
      dstList.splice(destination.index, 0, moved)
      return cols
    })

    if (srcStatus === dstStatus) return

    const patch = { status: dstStatus }
    const moved = ticketsById[draggableId]
    if (!moved?.responsavel_id && (dstStatus === STATUS.EM_ANDAMENTO || dstStatus === STATUS.PENDENCIA)) {
      patch.responsavel_id = user?.id
      setTicketsById((prev) => ({ ...prev, [draggableId]: { ...prev[draggableId], responsavel_id: user?.id } }))
    }

    const { error } = await supabase.from('tickets').update(patch).eq('id', draggableId)
    if (error) console.error('Erro ao mover ticket:', error.message)
  }

  const filtered = useMemo(() => {
    if (!ticketsByColumn) return ticketsByColumn
    const q = query.trim().toLowerCase()
    if (!q) return ticketsByColumn
    const cols = JSON.parse(JSON.stringify(ticketsByColumn))
    Object.values(AREAS).forEach((area) =>
      STATUS_ORDER.forEach((s) => {
        cols[area][s] = cols[area][s].filter((id) => {
          const t = ticketsById[id]
          if (!t) return false
          return (
            (t.clientes?.codigo || '').toLowerCase().includes(q) ||
            (t.clientes?.nome || '').toLowerCase().includes(q) ||
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

  const areas = view === 'ambos' ? Object.values(AREAS) : [view]

  return (
    <KanbanContext.Provider value={{ ticketsById }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="glow-text text-xl font-extrabold">Kanban</h1>
            <p className="text-sm text-slate-400">Arraste os tickets entre as fases para atualizar em tempo real.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-40 rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-cyan-400/50 sm:w-48"
              />
            </div>

            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              {[
                { key: 'ambos', label: <Columns size={15} />, title: 'Ambos' },
                { key: 'tecnica', label: <Laptop size={15} />, title: 'Técnica' },
                { key: 'treinamento', label: <GraduationCap size={15} />, title: 'Treinamento' },
              ].map((v) => (
                <button
                  key={v.key}
                  title={v.title}
                  onClick={() => setView(v.key)}
                  className={`rounded-lg p-2 transition ${
                    view === v.key ? 'dial text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNew(true)}
              className="dial flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-950 transition hover:opacity-90"
            >
              <Plus size={15} />
              Novo
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={`grid gap-6 ${areas.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {areas.map((area) => (
              <section key={area} className="min-w-0">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                  {area === 'tecnica' ? (
                    <Laptop size={15} className="text-cyan-300" />
                  ) : (
                    <GraduationCap size={15} className="text-fuchsia-300" />
                  )}
                  <span className={area === 'tecnica' ? 'text-cyan-300' : 'text-fuchsia-300'}>
                    {AREA_LABEL[area]}
                  </span>
                  <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                    {Object.values(filtered[area]).flat().length} tickets
                  </span>
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {STATUS_ORDER.map((status) => (
                    <Column
                      key={status}
                      area={area}
                      status={status}
                      ids={filtered[area][status]}
                      openClient={(id) => navigate(`/clientes/${ticketsById[id].cliente_id}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DragDropContext>

        <NewTicketModal open={showNew} onClose={() => setShowNew(false)} areaInicial={view} />
      </div>
    </KanbanContext.Provider>
  )
}