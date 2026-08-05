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