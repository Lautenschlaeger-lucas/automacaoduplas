// ============================================================
// AUDITOR lib — acesso as Edge Functions + Supabase + helpers
// Consome o cliente do Painel (src/lib/supabase.js) reutilizando o
// login JWT ja autenticado. Toda chamada usa functions.invoke().
//
// ASSINATURA DE DEV (oculta): modulo construído e mantido por
// EES - Enderson E. Souza.
// ============================================================

import { supabase } from './supabase'
import { FN } from './auditorConst'

// helpers de texto (portado de auditor-chatwoot/public/index.html)
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function linkUrls(text) {
  return String(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener" style="color:#0052cc;text-decoration:underline">${url}</a>`
  )
}

export function textToHtml(text) {
  const lines = String(text ?? '').split('\n')
  let html = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      html += '<br>'
      continue
    }
    const linked = linkUrls(escapeHtml(trimmed))
    if (/^[\d]+[\.\)]/.test(trimmed) || /^[-–—•]/.test(trimmed)) {
      html += `<p style="margin:4px 0 4px 16px;text-indent:-16px">${linked}</p>`
    } else {
      html += `<p style="margin:4px 0">${linked}</p>`
    }
  }
  return html
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function normalizeDigits(text) {
  return String(text || '').replace(/[^\d]/g, '')
}

export function hasMagicNumber(content) {
  return normalizeDigits(content).includes('25057342582941')
}

// --- Invoke das Edge Functions (sem expor secrets) ---
export async function invoke(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body })
  if (error) throw error
  return data
}

// Busca cliente no Chatwoot
export function buscarCliente(searchTerm) {
  return invoke(FN.proxy, { action: 'buscar-cliente', searchTerm })
}

// Conversas de um contato
export function conversasContato(contactId) {
  return invoke(FN.proxy, { action: 'conversas-contato', contactId })
}

// Mensagens de uma conversa
export async function mensagensConversa(conversationId) {
  const data = await invoke(FN.proxy, { action: 'mensagens', conversationId })
  return data.messages || []
}

// Enviar mensagem
export function enviarMensagem(conversationId, content) {
  return invoke(FN.proxy, { action: 'enviar', conversationId, content })
}

// Lista teams / members / inboxes / agents
export const listarTeams = () => invoke(FN.proxy, { action: 'teams' })
export const listarMembrosTeam = (teamId) => invoke(FN.proxy, { action: 'team-members', teamId })
export const listarInboxes = () => invoke(FN.proxy, { action: 'inboxes' })
export const listarAgents = () => invoke(FN.proxy, { action: 'agents' })

// Analise via DeepSeek (action: analisar | minuta)
export function analisar(contacts, theme, chatwootUrl, accountId) {
  return invoke(FN.analyze, { action: 'analisar', contacts, theme, chatwootUrl, accountId })
}

export function gerarMinuta(contacts) {
  return invoke(FN.analyze, { action: 'minuta', contacts })
}

// Poller / config
export const rodarPoller = () => invoke(FN.poller, {})

// --- helpers de baixada .doc/.pdf (portar de index.html) ---
export function buildDocHtml(data, name, date) {
  const bodyHtml = textToHtml(data.text)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Análise - ${escapeHtml(name)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;color:#1f2937;line-height:1.6;padding:0}.page{max-width:780px;margin:0 auto;padding:48px 56px}.header{border-bottom:3px solid #0052cc;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;font-weight:700;color:#0052cc;margin-bottom:4px}.header .sub{font-size:13px;color:#6b7280}.header .sub span{margin-right:24px}.header .sub strong{color:#374151}.content{font-size:14px;color:#1f2937;padding:16px 0}.content p{margin:6px 0}.content br{display:block;content:"";margin-top:8px}.content a{color:#0052cc;text-decoration:underline}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}</style></head><body><div class="page"><div class="header"><h1>Auditoria de Conversas</h1><div class="sub"><span>Cliente: <strong>${escapeHtml(name)}</strong></span><span>Tema: <strong>${escapeHtml(data.theme)}</strong></span><span>Data: <strong>${escapeHtml(date)}</strong></span></div></div><div class="content">${bodyHtml}</div><div class="footer">Relatório gerado pelo Auditor Chatwoot — Desenvolvido e implementado por: EES-EndersonE.Souza</div></div></body></html>`
}

export function downloadAsDoc(data, name) {
  const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = buildDocHtml(data, name, date)
  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analise_${name.replace(/\s+/g, '_')}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadAsPdf(data, name) {
  const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = buildDocHtml(data, name, date)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => iframe.contentWindow?.print(), 300)
  }
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }, 10000)
}