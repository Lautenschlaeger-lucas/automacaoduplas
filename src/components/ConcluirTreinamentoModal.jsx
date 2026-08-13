import { useEffect, useState } from 'react'
import { Loader2, GraduationCap, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from './ui'
import { STATUS, AREAS } from '../lib/constants'

export default function ConcluirTreinamentoModal({ open, onClose, ticket, onSaved }) {
  const { user } = useAuth()
  const [analistas, setAnalistas] = useState(null)
  const [analistaId, setAnalistaId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !ticket) return
    setError('')
    setMensagem(
      `O cliente ${ticket.nome_cliente || `#${ticket.codigo_cliente}`} foi concluído na etapa de treinamento — verificar a finalização do projeto.`
    )
    setAnalistaId(ticket.responsavel_id || '')
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => {
      setAnalistas(data?.filter((c) => c.role === 'treinamento') || [])
    })
  }, [open, ticket])

  async function confirmar(e) {
    e.preventDefault()
    if (!analistaId) {
      setError('Selecione o analista de treinamento.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const agora = new Date().toISOString()
      const payload = {
        status: STATUS.CONCLUIDO,
        area: AREAS.TREINAMENTO,
        responsavel_id: analistaId,
        treinamento_concluido_em: agora,
      }
      const { error: err1 } = await supabase.from('tickets').update(payload).eq('id', ticket.id)
      if (err1) throw err1
      const { error: err2 } = await supabase.from('comunicados').insert([
        {
          ticket_id: ticket.id,
          codigo_cliente: ticket.codigo_cliente,
          remetente_id: user?.id,
          destinatario_id: analistaId,
          mensagem: mensagem.trim(),
        },
      ])
      if (err2) throw err2
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao concluir o treinamento.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Concluir treinamento" wide>
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <p className="-mt-2 text-sm font-semibold text-slate-500">
          {ticket?.nome_cliente || `Projeto #${ticket?.codigo_cliente}`}
        </p>

        <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
          <GraduationCap size={15} className="shrink-0" />
          Ao confirmar, o cliente é marcado como concluído na etapa de treinamento, a hora é
          registrada para contabilização e o comunicado é enviado ao analista.
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Analista de treinamento *
          </span>
          {analistas === null ? (
            <div className="py-1 text-xs text-slate-400">Carregando analistas...</div>
          ) : analistas.length === 0 ? (
            <p className="text-xs text-rose-600">
              Nenhum analista com perfil de treinamento cadastrado.
            </p>
          ) : (
            <select value={analistaId} onChange={(e) => setAnalistaId(e.target.value)} className="field">
              <option value="">Selecione...</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Mensagem do comunicado
          </span>
          <textarea
            rows={3}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            className="field resize-none"
          />
        </label>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !analistas?.length}
          className="btn-primary w-full"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          Concluir e enviar comunicado
        </button>
      </form>
    </Modal>
  )
}