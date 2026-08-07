// ============================================================
// AUDITOR AUDITORIA — busca de cliente -> tema -> analise (DeepSeek)
// -> resultado com download .doc/.pdf.
// Portado de auditor-chatwoot/public/index.html (tab Auditoria).
// Desenvolvido e implementado por: EES — Enderson E. Souza.
// ============================================================

import { useState } from 'react'
import {
  Search, User, Building2, Mail, Phone, FileDown, FileText,
  Sparkles, Loader2, RotateCcw,
} from 'lucide-react'
import {
  buscarCliente, conversasContato, mensagensConversa, analisar, downloadAsDoc, downloadAsPdf,
} from '../lib/auditor'
import { AuditorTitle, AuditorFooter } from './AuditorLayout'

const STEPS = [
  { time: 0, text: 'Iniciando análise...' },
  { time: 2000, text: 'Conectando ao Chatwoot...' },
  { time: 5000, text: 'Buscando conversas do cliente...' },
  { time: 8000, text: 'Extraindo mensagens dos atendimentos...' },
  { time: 12000, text: 'Analisando com DeepSeek...' },
  { time: 20000, text: 'Ainda processando... Quanto mais dados, mais demora' },
  { time: 35000, text: 'Finalizando...' },
]

export default function AuditorAuditoria() {
  const [searchTerm, setSearchTerm] = useState('')
  const [theme, setTheme] = useState('')
  const [contact, setContact] = useState(null)
  const [result, setResult] = useState(null)
  const [buscaLoading, setBuscaLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [stepText, setStepText] = useState('')
  const [error, setError] = useState(null)

  async function onBuscar() {
    const term = searchTerm.trim()
    if (!term) return
    setBuscaLoading(true)
    setError(null)
    setContact(null)
    setResult(null)
    try {
      const data = await buscarCliente(term)
      if (data.found) {
        setContact(data.contact)
      } else {
        setError(data.message || 'Cliente não encontrado.')
      }
    } catch (e) {
      setError(e.message || 'Erro de conexão com o servidor.')
    } finally {
      setBuscaLoading(false)
    }
  }

  async function onAnalisar() {
    const t = theme.trim()
    if (!contact || !t) return
    setAnalyzeLoading(true)
    setError(null)
    setResult(null)
    setStepText(STEPS[0].text)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      let idx = 0
      while (idx < STEPS.length - 1 && elapsed >= STEPS[idx + 1].time) idx++
      setStepText(STEPS[idx].text)
    }, 1000)
    try {
      const convs = await conversasContato(contact.id)
      const list = Array.isArray(convs.conversations) ? convs.conversations : []
      const enriched = []
      for (const cv of list) {
        const msgs = await mensagensConversa(cv.id)
        enriched.push({
          id: cv.id,
          assignee_name: cv.assigned_agent?.name || cv.meta?.assignee?.name || cv.assignee_name || null,
          messages: msgs || [],
        })
      }
      const data = await analisar(enriched, t)
      setResult({ text: data.result, theme: t })
    } catch (e) {
      setError(e.message || 'Erro inesperado na análise.')
    } finally {
      clearInterval(timer)
      setAnalyzeLoading(false)
    }
  }

  function voltar() {
    setContact(null)
    setResult(null)
    setTheme('')
    setError(null)
    setSearchTerm('')
  }

  return (
    <div>
      <AuditorTitle />

      {/* Input de busca */}
      {!contact && (
        <div className="flex items-center gap-2">
          <input
            className="field"
            placeholder="ID, nome, e-mail ou telefone do cliente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
          />
          <button className="btn-primary shrink-0" onClick={onBuscar} disabled={buscaLoading}>
            {buscaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </div>
      )}

      {buscaLoading && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando cliente no Chatwoot...
        </p>
      )}

      {/* Card do contato + tema */}
      {contact && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{contact.name || '—'}</h2>
                <div className="mt-1 space-y-1 text-sm text-slate-600">
                  {contact.company && (
                    <p className="flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /> {contact.company}</p>
                  )}
                  {contact.email && (
                    <p className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {contact.email}</p>
                  )}
                  {contact.phone && (
                    <p className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {contact.phone}</p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">ID: {contact.id}</p>
                </div>
              </div>
              <button onClick={voltar} className="btn-ghost shrink-0 text-xs">
                <RotateCcw size={14} /> Nova busca
              </button>
            </div>
          </div>

          {/* Tema */}
          <div className="flex items-center gap-2">
            <input
              className="field"
              placeholder="Tema da análise (ex: estoque, prazo de entrega, devolução)"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAnalisar()}
            />
            <button
              className="btn-primary shrink-0"
              onClick={onAnalisar}
              disabled={analyzeLoading || !theme.trim()}
            >
              {analyzeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={16} />}
              Analisar
            </button>
          </div>

          {analyzeLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {stepText}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Resultado da análise</h3>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => downloadAsDoc(result, contact?.name || 'Cliente')}>
                <FileDown size={14} /> DOC
              </button>
              <button className="btn-ghost text-xs" onClick={() => downloadAsPdf(result, contact?.name || 'Cliente')}>
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700">
            {result.text}
          </div>
        </div>
      )}

      <AuditorFooter />
    </div>
  )
}