export const ROLES = {
  ADMIN: 'admin',
  TECNICA: 'tecnica',
  TREINAMENTO: 'treinamento',
}

export const ROLE_LABEL = {
  admin: 'Admin',
  tecnica: 'Técnica',
  treinamento: 'Treinamento',
}

export const AREAS = { TECNICA: 'tecnica', TREINAMENTO: 'treinamento' }

export const AREA_LABEL = {
  tecnica: 'Técnica',
  treinamento: 'Treinamento',
}

export const STATUS = {
  ABERTO: 'aberto',
  EM_ANDAMENTO: 'em_andamento',
  PENDENCIA: 'pendencia',
  CONCLUIDO: 'concluido',
}

export const STATUS_ORDER = [STATUS.ABERTO, STATUS.EM_ANDAMENTO, STATUS.PENDENCIA, STATUS.CONCLUIDO]

export const STATUS_LABEL = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  pendencia: 'Pendência',
  concluido: 'Concluído',
}

export const STATUS_DOT = {
  aberto: 'bg-sky-500',
  em_andamento: 'bg-amber-500',
  pendencia: 'bg-rose-500',
  concluido: 'bg-emerald-500',
}

export const STATUS_CHIP = {
  aberto: 'text-sky-700 bg-sky-50 border-sky-200',
  em_andamento: 'text-amber-700 bg-amber-50 border-amber-200',
  pendencia: 'text-rose-700 bg-rose-50 border-rose-200',
  concluido: 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

export const PRIORITY = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
}

export const PRIORITY_LABEL = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const PRIORITY_BADGE = {
  baixa: 'text-slate-600 bg-slate-100 border-slate-200',
  media: 'text-amber-700 bg-amber-50 border-amber-200',
  alta: 'text-rose-700 bg-rose-50 border-rose-200',
}

export const CLIENT_STATUS = {
  ATIVO: 'ativo',
  CONCLUIDO: 'concluido',
}

export const CLIENT_STATUS_LABEL = {
  ativo: 'Ativo',
  concluido: 'Concluído',
}

export const CLIENT_STATUS_CHIP = {
  ativo: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  concluido: 'text-sky-700 bg-sky-50 border-sky-200',
}

export const AREA_BAR = {
  tecnica: 'bg-blue-500',
  treinamento: 'bg-violet-500',
}

export const AREA_CHIP = {
  tecnica: 'text-blue-700 bg-blue-50 border-blue-200',
  treinamento: 'text-violet-700 bg-violet-50 border-violet-200',
}

export const ROLE_SOLID = {
  admin: 'bg-amber-500',
  tecnica: 'bg-blue-500',
  treinamento: 'bg-violet-500',
}

// Fluxo de implantacao: ticket geral concluido na area tecnica vai automaticamente
// para 'aberto' na area de treinamento e registra quando a fase tecnica terminou.
export function FLUXO_TECNICA_TREINAMENTO(payload, isParent) {
  if (!isParent) return payload
  if (payload.area === AREAS.TECNICA && payload.status === STATUS.CONCLUIDO) {
    return {
      ...payload,
      area: AREAS.TREINAMENTO,
      status: STATUS.ABERTO,
      tecnica_concluido_em: new Date().toISOString(),
    }
  }
  return payload
}

// ---------- CHECKLIST DE IMPLANTACAO ----------

// Unico vocabulario de status aceito no sistema (sem texto livre)
export const CHECKLIST_STATUS = {
  FEITO: 'feito',
  PENDENTE: 'pendente',
  PARCIAL: 'parcial',
  BLOQUEADO: 'bloqueado',
  NAO_APLICAVEL: 'nao_aplicavel',
}

export const CHECKLIST_STATUS_ORDER = [
  CHECKLIST_STATUS.PENDENTE,
  CHECKLIST_STATUS.PARCIAL,
  CHECKLIST_STATUS.BLOQUEADO,
  CHECKLIST_STATUS.FEITO,
  CHECKLIST_STATUS.NAO_APLICAVEL,
]

export const CHECKLIST_STATUS_LABEL = {
  feito: 'Feito',
  pendente: 'Pendente',
  parcial: 'Parcial',
  bloqueado: 'Bloqueado',
  nao_aplicavel: 'Não aplicável',
}

export const CHECKLIST_STATUS_CHIP = {
  feito: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pendente: 'text-slate-600 bg-slate-100 border-slate-200',
  parcial: 'text-amber-700 bg-amber-50 border-amber-200',
  bloqueado: 'text-rose-700 bg-rose-50 border-rose-200',
  nao_aplicavel: 'text-sky-700 bg-sky-50 border-sky-200',
}

export const CHECKLIST_STATUS_DOT = {
  feito: 'bg-emerald-500',
  pendente: 'bg-slate-300',
  parcial: 'bg-amber-500',
  bloqueado: 'bg-rose-500',
  nao_aplicavel: 'bg-sky-400',
}

// Categorias do checklist (etapas da implantacao)
export const CHECKLIST_CATEGORIAS = {
  TECNICA: 'tecnica',
  TREINAMENTO: 'treinamento',
}

export const CHECKLIST_CATEGORIA_LABEL = {
  tecnica: 'Técnica',
  treinamento: 'Treinamento',
}

export const CHECKLIST_CATEGORIA_BAR = {
  tecnica: 'bg-blue-500',
  treinamento: 'bg-violet-500',
}

export const CHECKLIST_CATEGORIA_CHIP = {
  tecnica: 'text-blue-700 bg-blue-50 border-blue-200',
  treinamento: 'text-violet-700 bg-violet-50 border-violet-200',
}

// Tipo do bloqueio (de quem depende a chamada)
export const BLOQUEIO_TIPO = {
  INTERNO: 'interno',
  CLIENTE: 'cliente',
  TERCEIRO: 'terceiro',
}

export const BLOQUEIO_TIPO_ORDER = [BLOQUEIO_TIPO.INTERNO, BLOQUEIO_TIPO.CLIENTE, BLOQUEIO_TIPO.TERCEIRO]

export const BLOQUEIO_TIPO_LABEL = {
  interno: 'Interno',
  cliente: 'Cliente',
  terceiro: 'Terceiro',
}

// Itens padrao do checklist (mesma chave/ordem do seed SQL)
export const CHECKLIST_ITENS = [
  // Analista tecnico
  { chave: 'validacao_negocio', titulo: 'Analisar Validação do Negócio', categoria: 'tecnica', ordem: 1 },
  { chave: 'pasta_drive_reunioes', titulo: 'Criar pasta no Drive para reuniões gravadas e incluir o link no ticket', categoria: 'tecnica', ordem: 2 },
  { chave: 'ativar_apps', titulo: 'Ativar apps contratados', categoria: 'tecnica', ordem: 3 },
  { chave: 'integracao_erp', titulo: 'Integração do ERP ou Faturador', categoria: 'tecnica', ordem: 4 },
  { chave: 'integracao_marketplaces', titulo: 'Integração dos marketplaces e Lojas Virtuais', categoria: 'tecnica', ordem: 5 },
  { chave: 'config_fiscais', titulo: 'Configurações fiscais', categoria: 'tecnica', ordem: 6 },
  { chave: 'config_estoque', titulo: 'Configurações de estoque', categoria: 'tecnica', ordem: 7 },
  { chave: 'integracao_logistica', titulo: 'Integração Logística', categoria: 'tecnica', ordem: 8 },
  { chave: 'anuncios_tela_importacao', titulo: 'Garantir que todos os anúncios vieram para a tela de importação', categoria: 'tecnica', ordem: 9 },
  { chave: 'config_impressora_teste', titulo: 'Configuração da Impressora para realização do teste de expedição', categoria: 'tecnica', ordem: 10 },
  { chave: 'teste_expedicao', titulo: 'Teste de expedição', categoria: 'tecnica', ordem: 11 },
  { chave: 'abertura_tickets_n2', titulo: 'Abertura de todos os @tickets e N2 pertinentes para integrações (MKT, ERP e Integração logística)', categoria: 'tecnica', ordem: 12 },
  { chave: 'acompanhamento_demandas', titulo: 'Acompanhamento no grupo de demandas técnicas, customizações, dúvidas e possíveis testes de integração', categoria: 'tecnica', ordem: 13 },
  { chave: 'reportar_customizacoes', titulo: 'Reportar customizações', categoria: 'tecnica', ordem: 14 },
  { chave: 'acompanhar_tickets', titulo: 'Acompanhar os @tickets e retorná-los aos clientes', categoria: 'tecnica', ordem: 15 },
  { chave: 'documentacoes_tecnicas', titulo: 'Documentações técnicas e reporte de novos fluxos', categoria: 'tecnica', ordem: 16 },
  { chave: 'pausar_filas_estoque', titulo: 'Pausar filas de estoque (se necessário após kick off)', categoria: 'tecnica', ordem: 17 },
  { chave: 'ativar_feature_flags', titulo: 'Ativar Feature Flags (pedidos em processando, sankhya, descontos, etc.)', categoria: 'tecnica', ordem: 18 },
  { chave: 'conferir_comunicacao_estoque', titulo: 'Conferir comunicação de estoque', categoria: 'tecnica', ordem: 19 },
  { chave: 'validacao_pedidos', titulo: 'Validação de pedidos concluída', categoria: 'tecnica', ordem: 20 },
  // Analista de treinamento
  { chave: 'acompanhar_importacao_anuncios', titulo: 'Acompanhar importação de anúncios em tela ou conferir o upload da planilha de importação', categoria: 'treinamento', ordem: 1 },
  { chave: 'treinamento_importacao_anuncios', titulo: 'Treinamento de Importação dos anúncios', categoria: 'treinamento', ordem: 2 },
  { chave: 'cadastro_produtos', titulo: 'Cadastro de produtos simples, compostos e com variações', categoria: 'treinamento', ordem: 3 },
  { chave: 'mapeamento_categorias', titulo: 'Mapeamento de categorias e atributos', categoria: 'treinamento', ordem: 4 },
  { chave: 'publicacao_anuncios', titulo: 'Publicação de anúncio simples, kits e com variações', categoria: 'treinamento', ordem: 5 },
  { chave: 'gestao_anuncios', titulo: 'Gestão de anúncios já publicados', categoria: 'treinamento', ordem: 6 },
  { chave: 'treinamento_expedicao_pedidos', titulo: 'Treinamento de todo o módulo expedição e pedidos', categoria: 'treinamento', ordem: 7 },
  { chave: 'dashboard_status_pedidos', titulo: 'Dashboard e status dos pedidos', categoria: 'treinamento', ordem: 8 },
  { chave: 'precificacao_automatica', titulo: 'Precificação Automática', categoria: 'treinamento', ordem: 9 },
  { chave: 'modulo_mercado_livre', titulo: 'Módulo Mercado Livre', categoria: 'treinamento', ordem: 10 },
  { chave: 'relatorios', titulo: 'Relatórios', categoria: 'treinamento', ordem: 11 },
  { chave: 'modulo_compras', titulo: 'Módulo Compras', categoria: 'treinamento', ordem: 12 },
  { chave: 'modulo_financeiro', titulo: 'Módulo Financeiro', categoria: 'treinamento', ordem: 13 },
  { chave: 'sac_ml', titulo: 'SAC ML', categoria: 'treinamento', ordem: 14 },
  { chave: 'apresentar_aplicativos', titulo: 'Apresentar todos os aplicativos', categoria: 'treinamento', ordem: 15 },
  { chave: 'portal_cliente', titulo: "Acompanhar o cliente na criação do portal do cliente para acompanhar os tickets em aberto", categoria: 'treinamento', ordem: 16 },
  { chave: 'ativar_filas_estoque', titulo: 'Ativar filas de estoque', categoria: 'treinamento', ordem: 17 },
  { chave: 'retirar_flags_processamento', titulo: 'Retirar flags de processamento de pedidos', categoria: 'treinamento', ordem: 18 },
]

// Limite de dias uteis parado (fallback caso nao haja valor no app_config)
export const LIMITE_DIAS_PARADO_DEFAULT = '5'
export const APP_CONFIG_KEY_LIMITE = 'limite_dias_parado'