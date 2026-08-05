import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Phone, User as UserIcon, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CLIENT_STATUS, CLIENT_STATUS_CHIP, CLIENT_STATUS_LABEL, STATUS } from '../lib/constants'
import { Spinner, EmptyState } from '../components/ui'
import ClientFormModal from '../components/ClientFormModal'

export default function Clients() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [clients, setClients] = useState(null)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('clients')
      .select('*, tickets:tickets!tickets_cliente_id_fkey(status)')
      .order('codigo')
    if (data) setClients(data)
  }

  async function removeClient(client) {
    if (!confirm(`Excluir o cliente #${client.codigo} (${client.nome}) e todos os seus tickets?`)) return
    await supabase.from('clients').delete().eq('id', client.id)
    load()
  }

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = query.trim().toLowerCase()
    return clients.filter(
      (c) =>
        (statusFilter === 'todos' || c.status === statusFilter) &&
        (!q ||
          c.nome.toLowerCase().includes(q) ||
          c.codigo.toLowerCase().includes(q) ||
          c.cidade.toLowerCase().includes(q))
    )
  }, [clients, query, statusFilter])

  if (!clients) {
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
          <h1 className="glow-text text-xl font-extrabold">Clientes</h1>
          <p className="text-sm text-slate-400">{clients.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="dial flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(124,140,255,0.35)] transition hover:opacity-90"
        >
          <Plus size={16} />
          Novo cliente
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, código ou cidade..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-cyan-400/50 sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
          {[
            { key: 'todos', label: 'Todos' },
            { key: CLIENT_STATUS.ATIVO, label: 'Ativos' },
            { key: CLIENT_STATUS.PAUSADO, label: 'Pausados' },
            { key: CLIENT_STATUS.CONCLUIDO, label: 'Concluídos' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === f.key ? 'dial text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          hint="Ajuste a busca ou crie um novo cliente."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const total = c.tickets?.length || 0
            const done = c.tickets?.filter((t) => t.status === STATUS.CONCLUIDO).length || 0
            const pct = total ? Math.round((done / total) * 100) : 0
            return (
              <div key={c.id} className="glass neon-border group relative flex flex-col rounded-2xl p-4 transition hover:-translate-y-0.5">
                <Link to={`/clientes/${c.id}`} className="flex flex-1 flex-col">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                      <Building2 size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">#{c.codigo}</span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CLIENT_STATUS_CHIP[c.status]}`}>
                          {CLIENT_STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <h3 className="truncate text-sm font-bold text-slate-100">{c.nome}</h3>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-col gap-1 text-[11px] text-slate-500">
                    {c.cidade && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={11} /> {c.cidade}
                        {c.uf && ` - ${c.uf}`}
                      </span>
                    )}
                    {c.contato && (
                      <span className="flex items-center gap-1.5">
                        <UserIcon size={11} /> {c.contato}
                      </span>
                    )}
                    {c.telefone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={11} /> {c.telefone}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Progresso</span>
                      <span>
                        {done}/{total} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all ${
                          pct === 100 ? 'from-emerald-400 to-teal-400' : ''
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>

                {isAdmin && (
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(c)}
                      className="rounded-lg bg-black/50 p-1.5 text-slate-400 backdrop-blur transition hover:text-cyan-300"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeClient(c)}
                      className="rounded-lg bg-black/50 p-1.5 text-slate-400 backdrop-blur transition hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ClientFormModal open={showNew || !!editing} onClose={() => { setShowNew(false); setEditing(null) }} client={editing} onSaved={load} />
    </div>
  )
}