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
  aberto: 'bg-sky-400',
  em_andamento: 'bg-amber-400',
  pendencia: 'bg-rose-400',
  concluido: 'bg-emerald-400',
}

export const STATUS_CHIP = {
  aberto: 'text-sky-300 bg-sky-400/10 border-sky-400/30',
  em_andamento: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  pendencia: 'text-rose-300 bg-rose-400/10 border-rose-400/30',
  concluido: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
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
  baixa: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  media: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  alta: 'text-rose-300 bg-rose-400/10 border-rose-400/30',
}

export const CLIENT_STATUS = {
  ATIVO: 'ativo',
  CONCLUIDO: 'concluido',
  PAUSADO: 'pausado',
}

export const CLIENT_STATUS_LABEL = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  pausado: 'Pausado',
}

export const CLIENT_STATUS_CHIP = {
  ativo: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  concluido: 'text-sky-300 bg-sky-400/10 border-sky-400/30',
  pausado: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
}

export const AREA_BAR = {
  tecnica: 'from-cyan-400 to-indigo-400',
  treinamento: 'from-fuchsia-400 to-violet-400',
}

export const AREA_CHIP = {
  tecnica: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30',
  treinamento: 'text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/30',
}