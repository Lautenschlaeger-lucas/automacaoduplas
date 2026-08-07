// ============================================================
// AUDITOR MONITOR — monitoramento de conversas por time/atendente.
// Le as tabelas do Supabase (populadas pelo poller/webhook) com
// Realtime. Detalhe com mensagens, enviar, minuta via IA e analise.
// Portado de auditor-chatwoot/public/index.html (tab Monitoramento).
// Desenvolvido e implementado por: EES — Enderson E. Souza.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import {
  Play, Square, Loader2, Send, Sparkles, Bell, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  listarTeams, listarMembrosTeam, mensagensConversa, enviarMensagem,
  gerarMinuta, formatTime, hasMagicNumber,
} from '../lib/auditor'
import { STATUS_LABEL, STATUS_TONE } from '../lib/auditorConst'
import { AuditorTitle, AuditorFooter } from './AuditorLayout'

export default function AuditorMonitor() {
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [teamId, setTeamId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [composer, setComposer] = useState('')
  const [monitoring, setMonitoring] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [toast, setToast] = useState(null)
  const [alerts, setAlerts] = useState([])
  const channelRef = useRef(null)
  const msgChannelRef = useRef(null)

  useEffect(() => {
    listarTeams()
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]))
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
    }
  }, [])

  async function onTeamChange(id) {
    setTeamId(id)
    setAgentId('')
    setMembers([])
    setConversations([])
    setSelected(null)
    if (!id) return
    const data = await listarMembrosTeam(id).catch(() => [])
    setMembers(Array.isArray(data) ? data : [])
  }

  function notifica(title, text, type = 'info') {
    setToast({ title, text, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function startMonitor() {
    if (!teamId || !agentId) {
      notifica('Atenção', 'Selecione um time e um atendente primeiro.', 'error')
      return
    }
    setMonitoring(true)
    loadConversations(true)

    // Realtime: novas conversas/alertas
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    // prioritário
    channelRef.current = supabase
      .channel('auditor-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'priority_alerts' }, (payload) => {
        const a = payload.new
        if (a.assignee_id && Number(a.assignee_id) !== Number(agentId)) return
        notifica('🔔 Número prioritário!', `${a.contact_name || 'Cliente'}${a.inbox_name ? ' em ' + a.inbox_name : ''}`, 'priority')
      })
      .subscribe()

    // novo mensagem -> atualiza conversa em tempo real
    if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
    msgChannelRef.current = supabase
      .channel('auditor-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const convId = Number(payload.new.conversation_chatwoot_id)
        if (selected && Number(selected.chatwoot_id) === convId) {
          setMessages((m) => [...m, payload.new])
        }
      })
      .subscribe()
  }

  function stopMonitor() {
    setMonitoring(false)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
  }

  async function loadConversations() {
    let q = supabase
      .from('conversations')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .in('status', ['open', 'pending'])
    if (agentId) q = q.eq('assignee_id', Number(agentId))
    const { data } = await q.limit(100)
    setConversations(Array.isArray(data) ? data.map(normalize) : [])
  }

  function normalize(c) {
    return { ...c }
  }

  async function selectConversation(conv) {
    setSelected(conv)
    setLoadingMessages(true)
    try {
      const msgs = await mensagensConversa(conv.chatwoot_id)
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  async function enviar() {
    if (!selected || !composer.trim()) return
    try {
      await enviarMensagem(selected.chatwoot_id, composer.trim())
      setComposer('')
      notifica('Resposta enviada', 'Mensagem enviada ao cliente.', 'success')
      const msgs = await mensagensConversa(selected.chatwoot_id)
      setMessages(msgs)
    } catch (e) {
      notifica('Erro', e.message || 'Não foi possível enviar.', 'error')
    }
  }

  async function sugerir() {
    if (!selected) return
    try {
      const data = await gerarMinuta([{ id: selected.chatwoot_id, messages }])
      if (data?.success) setComposer(data.draft || '')
    } catch (e) {
      notifica('Erro', e.message || 'Erro ao gerar a minuta.', 'error')
    }
  }

  return (
    <div>
      <AuditorTitle />

      {/* Controles */}
      <div className="mb-4 flex flex-nowrap items-center gap-2">
        <select className="field" style={{ width: 'auto' }} value={teamId} onChange={(e) => onTeamChange(e.target.value)} disabled={monitoring}>
          <option value="">Selecione um time</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name || t.title || t.label || t.id}</option>
          ))}
        </select>
        <select className="field" style={{ width: 'auto' }} value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={monitoring}>
          <option value="">{members.length ? 'Selecione um atendente' : 'Escolha um time primeiro'}</option>
          {members.map((m) => {
            const mid = m.user_id != null ? m.user_id : m.id
            return (
              <option key={mid} value={mid}>{m.name || m.label || m.title || mid}</option>
            )
          })}
        </select>
        <button className="btn-primary shrink-0" onClick={monitoring ? stopMonitor : startMonitor}>
          {monitoring ? <Square size={15} /> : <Play size={16} />}
          {monitoring ? 'Parar' : 'Monitorar'}
        </button>
        {monitoring && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Monitorando
          </span>
        )}
      </div>

      {/* Corpo */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lista */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50">
          {conversations.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              Nenhuma conversa encontrada.
              <br /><span className="text-xs">Selecione um time e atendente e inicie o monitoramento.</span>
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {conversations.map((c) => {
                const active = selected?.chatwoot_id === c.chatwoot_id
                return (
                  <button
                    key={c.chatwoot_id}
                    onClick={() => selectConversation(c)}
                    className={`block w-full border-b border-slate-100 px-3 py-2.5 text-left transition ${
                      active ? 'bg-blue-50' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800">{c.contact_name || 'Desconhecido'}</span>
                      {hasMagicNumber(String(c.contact_name)) ? (
                        <Bell size={13} className="text-rose-500" />
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{c.assignee_name || '—'}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[c.status] || STATUS_LABEL.def}`}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{c.inbox_name || ''}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detalhe */}
        <div className="flex h-[60vh] flex-col rounded-2xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="m-auto text-center text-sm text-slate-400">
              <p>Selecione uma conversa para ver as mensagens.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{selected.contact_name || 'Desconhecido'}</p>
                  <p className="text-xs text-slate-400">
                    {selected.assignee_name || '—'} · {selected.inbox_name || '—'} · {STATUS_LABEL[selected.status] || selected.status}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages && <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" />}
                {!loadingMessages && messages.length === 0 && (
                  <p className="text-center text-xs text-slate-400">Nenhuma mensagem encontrada.</p>
                )}
                {messages.map((m) => {
                  const isAgent = String(m.sender_type || '').toLowerCase() !== 'contact'
                  const mention = m.content && hasMagicNumber(m.content)
                  return (
                    <div key={m.chatwoot_id || m.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                          isAgent ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-700'
                        } ${mention ? 'ring-2 ring-rose-500' : ''}`}
                      >
                        {mention && (
                          <div className={`mb-1 flex items-center gap-1 text-[10px] font-bold ${isAgent ? 'text-amber-200' : 'text-rose-600'}`}>
                            <AlertTriangle size={11} /> Menção ao número da implantação
                          </div>
                        )}
                        <div className={isAgent ? 'font-semibold' : 'text-slate-500 font-semibold'}>
                          {m.sender_name || (isAgent ? 'Operador' : 'Cliente')}
                        </div>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                        <div className={`mt-1 text-[10px] ${isAgent ? 'text-blue-100' : 'text-slate-400'}`}>{formatTime(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Composer */}
              <div className="border-t border-slate-100 p-3">
                <textarea
                  className="field resize-none"
                  rows={2}
                  placeholder="Digite uma resposta… (Enter para enviar, Shift+Enter nova linha)"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    <strong className="text-blue-600">Sugerir resposta com IA</strong> prepara um rascunho — revise antes de enviar.
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs" onClick={sugerir} type="button">
                      <Sparkles size={14} /> Sugerir com IA
                    </button>
                    <button className="btn-primary text-xs" onClick={enviar} type="button">
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : toast.type === 'priority'
                  ? 'border-rose-300 bg-rose-50 text-rose-800 shadow-rose-200'
                  : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <div>
            <p className="font-bold">{toast.title}</p>
            <p className={toast.type === 'priority' ? 'text-rose-700' : 'text-xs opacity-80'}>{toast.text}</p>
          </div>
        </div>
      )}

      <AuditorFooter />
    </div>
  )
}