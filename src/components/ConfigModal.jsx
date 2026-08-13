import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './ui'
import { supabase } from '../lib/supabase'
import { APP_CONFIG_KEY_LIMITE } from '../lib/constants'

export default function ConfigModal({ open, onClose, onSaved }) {
  const [limite, setLimite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    supabase
      .from('app_config')
      .select('key, value')
      .eq('key', APP_CONFIG_KEY_LIMITE)
      .single()
      .then(({ data }) => setLimite(data?.value || ''))
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    const n = parseInt(limite, 10)
    if (!n || n < 1 || n > 365) {
      setError('Informe um número de 1 a 365.')
      return
    }
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('app_config')
      .upsert({ key: APP_CONFIG_KEY_LIMITE, value: String(n) })
    setBusy(false)
    if (err) {
      setError(err.message || 'Erro ao salvar configuração.')
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurações do painel">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Limite de dias parado (alertas)
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className="field"
            placeholder="Ex: 5"
          />
          <span className="text-[11px] text-slate-400">
            Contagem em dias úteis. Acima deste limite o ticket é destacado como parado no
            Kanban e no Dashboard.
          </span>
        </label>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy && <Loader2 size={16} className="animate-spin" />}
          Salvar
        </button>
      </form>
    </Modal>
  )
}