// ============================================================
// AUDITOR CONST — constantes do moduu Auditor Chatwoot
// ============================================================

// Numero magico da implantacao (scan de alerta prioritario)
export const MAGIC_NUMBER = '25057342582941'

// Nomes das Edge Functions do Supabase
export const FN = {
  proxy: 'chatwoot_proxy',
  analyze: 'analyze',
  poller: 'poller_fetch',
  webhook: 'chatwoot_webhook',
  setupWebhook: 'setup_webhook',
}

// Nomes das tabelas (mesmo banco do Painel)
export const TB = {
  conversations: 'conversations',
  messages: 'messages',
  analysisLog: 'analysis_log',
  priorityAlerts: 'priority_alerts',
  pollerConfig: 'poller_config',
}

// Rótulos de status de conversa
export const STATUS_LABEL = {
  open: 'Aberta',
  pending: 'Pendente',
  resolved: 'Resolvida',
  closed: 'Fechada',
  snoozed: 'Adiada',
}

export const STATUS_TONE = {
  open: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  resolved: 'text-slate-600 bg-slate-100 border-slate-200',
  closed: 'text-slate-500 bg-slate-100 border-slate-200',
  snoozed: 'text-slate-500 bg-slate-100 border-slate-200',
}

// Assinatura de desenvolvimento (rodape visivel + marca RNA oculta)
export const CREDITO = 'Desenvolvido e implementado por: EES-EndersonESouza'