import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Building2, MapPin, Phone, User as UserIcon, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CLIENT_STATUS, CLIENT_STATUS_CHIP, CLIENT_STATUS_LABEL, STATUS } from '../lib/constants'
import { Spinner, EmptyState } from '../components/ui'
import EditClientModal from '../components/EditClientModal'

export default function Clients() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tickets, setTickets] = useState(null)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('tickets')
      .select('codigo_cliente, nome_cliente, cidade, uf, contato, telefone, versao_sistema, status, criado_em')
      .order('criado_em', { ascending: false })
    if (data) setTickets(data)
  }

  const clients = useMemo(() => {
    if (!tickets) return []
    const map = new Map()
    for (const t of tickets) {
      const code = t.codigo_cliente
      if (!code) continue
      if (!map.has(code)) {
        map.set(code, {
          codigo: code,
          nome: t.nome_cliente || 'Sem nome',
          cidade: t.cidade || '',
          uf: t.uf || '',
          contato: t.contato || '',
          telefone: t.telefone || '',
          versao_sistema: t.versao_sistema || '',
          total: 0,
          done: 0,
        })
      }
      const c = map.get(code)
      c.total++
      if (t.status === STATUS.CONCLUIDO) c.done++
    }
    return [...map.values()].map((c) => ({
      ...c,
      pct: c.total ? Math.round((c.done / c.total) * 100) : 0,
      status: c.done === c.total && c.total > 0 ? CLIENT_STATUS.CONCLUIDO : CLIENT_STATUS.ATIVO,
    }))
  }, [tickets])

  const filtered = useMemo(() => {
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

  async function removeClient(client) {
    if (!confirm(`Excluir o cliente #${client.codigo} (${client.nome}) e todos os seus tickets?`)) return
    const { error } = await supabase.from('tickets').delete().eq('codigo_cliente', client.codigo)
    if (error) alert('Erro ao excluir: ' + error.message)
    load()
  }

  if (!tickets) {
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
          <h1 className="text-xl font-extrabold text-slate-800">Clientes</h1>
          <p className="text-sm text-slate-400">{clients.length} clientes cadastrados</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, código ou cidade..."
            className="field w-full py-2 pl-9 sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { key: 'todos', label: 'Todos' },
            { key: CLIENT_STATUS.ATIVO, label: 'Ativos' },
            { key: CLIENT_STATUS.CONCLUIDO, label: 'Concluídos' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === f.key ? 'dial shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" hint="Ajuste a busca ou crie um ticket por cliente no Kanban." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.codigo} className="glass group relative flex flex-col rounded-2xl p-4 transition hover:shadow-md">
              <Link to={`/clientes/${c.codigo}`} className="flex flex-1 flex-col">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Building2 size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">#{c.codigo}</span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CLIENT_STATUS_CHIP[c.status]}`}>
                        {CLIENT_STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <h3 className="truncate text-sm font-bold text-slate-700">{c.nome}</h3>
                  </div>
                </div>

                <div className="mb-3 flex flex-col gap-1 text-[11px] text-slate-400">
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
                  <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                    <span>Progresso</span>
                    <span>
                      {c.done}/{c.total} · {c.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${c.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              </Link>

              {isAdmin && (
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-lg bg-white p-1.5 text-slate-400 shadow transition hover:text-blue-600"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => removeClient(c)}
                    className="rounded-lg bg-white p-1.5 text-slate-400 shadow transition hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <EditClientModal open={!!editing} onClose={() => setEditing(null)} client={editing} onSaved={load} />
    </div>
  )
}