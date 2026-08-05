import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from './ui'
import { AREAS } from '../lib/constants'

export default function NewTicketModal({ open, onClose, onSaved, clienteId, areaInicial }) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [collabs, setCollabs] = useState([])
  const [form, setForm] = useState({
    cliente_id: clienteId || '',
    titulo: '',
    descricao: '',
    area: areaInicial || AREAS.TECNICA,
    status: 'aberto',
    prioridade: 'media',
    responsavel_id: user?.id || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm((f) => ({
      ...f,
      cliente_id: clienteId || f.cliente_id,
      area: areaInicial || f.area,
      responsavel_id: user?.id || f.responsavel_id,
    }))
    supabase.from('clients').select('id, codigo, nome').order('codigo').then(({ data }) => setClients(data || []))
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setCollabs(data || []))
  }, [open, clienteId, areaInicial, user])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.from('tickets').insert([
        { ...form, cliente_id: form.cliente_id || null, criado_por: user.id },
      ])
      if (err) throw err
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar ticket.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-400/50'

  return (
    <Modal open={open} onClose={onClose} title="Novo ticket">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cliente</span>
          <select
            required
            value={form.cliente_id}
            onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
            className={inputCls}
          >
            <option value="" disabled>
              Selecione o cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Área</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: AREAS.TECNICA, label: '⚙️ Técnica' },
              { key: AREAS.TREINAMENTO, label: '🎓 Treinamento' },
            ].map((a) => (
              <button
                type="button"
                key={a.key}
                onClick={() => setForm({ ...form, area: a.key })}
                className={`rounded-xl border py-2 text-sm font-semibold transition ${
                  form.area === a.key
                    ? a.key === AREAS.TREINAMENTO
                      ? 'border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-200'
                      : 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Título</span>
          <input
            required
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className={inputCls}
            placeholder="Ex: Instalar banco de dados"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Descrição</span>
          <textarea
            rows={3}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className={`${inputCls} resize-none`}
            placeholder="Detalhes da atividade..."
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prioridade</span>
            <select
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              className={inputCls}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Responsável</span>
            <select
              value={form.responsavel_id || ''}
              onChange={(e) => setForm({ ...form, responsavel_id: e.target.value || null })}
              className={inputCls}
            >
              <option value="">Sem responsável</option>
              {collabs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-xs text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="dial mt-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Criar ticket
        </button>
      </form>
    </Modal>
  )
}