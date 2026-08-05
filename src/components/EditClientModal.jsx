import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui'

const EMPTY = {
  codigo_cliente: '',
  nome_cliente: '',
  cidade: '',
  uf: '',
  contato: '',
  telefone: '',
  versao_sistema: '',
}

export default function EditClientModal({ open, onClose, onSaved, client }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && client) {
      setForm({
        codigo_cliente: client.codigo || '',
        nome_cliente: client.nome || '',
        cidade: client.cidade || '',
        uf: client.uf || '',
        contato: client.contato || '',
        telefone: client.telefone || '',
        versao_sistema: client.versao_sistema || '',
      })
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
      const { codigo_cliente, ...rest } = form
      const { error: err } = await supabase
        .from('tickets')
        .update(rest)
        .eq('codigo_cliente', codigo_cliente.trim())
      if (err) {
        if (err.code === 'PGRST116') throw new Error('Sem tickets para este código.')
        throw err
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar cliente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Editar cliente #${form.codigo_cliente}`} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nome do cliente *</span>
          <input
            required
            value={form.nome_cliente}
            onChange={(e) => set('nome_cliente', e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contato</span>
          <input value={form.contato} onChange={(e) => set('contato', e.target.value)} className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Telefone</span>
          <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cidade</span>
          <input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className="field" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">UF</span>
            <input value={form.uf} maxLength={2} onChange={(e) => set('uf', e.target.value.toUpperCase())} className="field" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Versão do sistema</span>
            <input value={form.versao_sistema} onChange={(e) => set('versao_sistema', e.target.value)} className="field" />
          </label>
        </div>

        {error && <p className="col-span-2 text-xs text-rose-600">{error}</p>}

        <div className="col-span-2">
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </Modal>
  )
}