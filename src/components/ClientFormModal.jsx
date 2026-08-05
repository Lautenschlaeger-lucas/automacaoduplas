import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui'
import { CLIENT_STATUS } from '../lib/constants'

const EMPTY = {
  codigo: '',
  nome: '',
  status: CLIENT_STATUS.ATIVO,
  contato: '',
  telefone: '',
  cidade: '',
  uf: '',
  versao_sistema: '',
  observacoes: '',
}

export default function ClientFormModal({ open, onClose, onSaved, client }) {
  const editing = !!client
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(client ? { ...EMPTY, ...client } : EMPTY)
      setError('')
    }
  }, [open, client])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editing) {
        const { id, ...rest } = form
        const { error: err } = await supabase.from('clients').update(rest).eq('id', id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('clients').insert([form])
        if (err) throw err
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar cliente.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-400/50'

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar cliente #${form.codigo}` : 'Novo cliente'} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Código</span>
          <input required value={form.codigo} onChange={(e) => set('codigo', e.target.value)} className={inputCls} placeholder="324" />
        </label>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            <option value={CLIENT_STATUS.ATIVO}>Ativo</option>
            <option value={CLIENT_STATUS.CONCLUIDO}>Concluído</option>
            <option value={CLIENT_STATUS.PAUSADO}>Pausado</option>
          </select>
        </div>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nome / Razão social</span>
          <input required value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputCls} placeholder="Navegação Silva Ltda" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contato</span>
          <input value={form.contato} onChange={(e) => set('contato', e.target.value)} className={inputCls} placeholder="Maria Silva" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Telefone</span>
          <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} className={inputCls} placeholder="(11) 99999-0000" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cidade</span>
          <input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className={inputCls} placeholder="São Paulo" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">UF</span>
          <input value={form.uf} maxLength={2} onChange={(e) => set('uf', e.target.value.toUpperCase())} className={inputCls} placeholder="SP" />
        </label>

        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Versão do sistema</span>
          <input value={form.versao_sistema} onChange={(e) => set('versao_sistema', e.target.value)} className={inputCls} placeholder="10.4" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Observações</span>
          <textarea rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} className={`${inputCls} resize-none`} placeholder="Anotações gerais..." />
        </label>

        {error && <p className="col-span-2 text-xs text-rose-300">{error}</p>}

        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="dial flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar cliente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}