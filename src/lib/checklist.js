import { useEffect, useState } from 'react'
import { CHECKLIST_STATUS, CHECKLIST_CATEGORIAS, LIMITE_DIAS_PARADO_DEFAULT, APP_CONFIG_KEY_LIMITE } from './constants'
import { diasUteisEntre } from './format'

// Progresso do checklist (ignora itens nao_aplicaveis)
export function progressoChecklist(processos = []) {
  const total = processos.length
  const nAplicavel = processos.filter((p) => p.status === CHECKLIST_STATUS.NAO_APLICAVEL).length
  const aplicaveis = total - nAplicavel
  const feitos = processos.filter((p) => p.status === CHECKLIST_STATUS.FEITO).length
  const pct = aplicaveis > 0 ? Math.round((feitos / aplicaveis) * 100) : 0
  return {
    feitos,
    total,
    aplicaveis,
    nAplicavel,
    pct,
  }
}

// Progresso por categoria (tecnica / treinamento)
export function progressoPorCategoria(processos = []) {
  const out = {}
  Object.values(CHECKLIST_CATEGORIAS).forEach((cat) => {
    out[cat] = progressoChecklist(processos.filter((p) => p.categoria === cat))
  })
  return out
}

// Itens com status bloqueado
export function itensBloqueados(processos = []) {
  return processos.filter((p) => p.status === CHECKLIST_STATUS.BLOQUEADO)
}

export function ticketBloqueado(processos = []) {
  return itensBloqueados(processos).length > 0
}

// Ultima atividade do cliente: maior data entre o ticket pai e seus processos
export function ultimaAtividade(ticket, processos = []) {
  const dates = [ticket?.atualizado_em, ...processos.map((p) => p.atualizado_em)].filter(Boolean)
  if (dates.length === 0) return null
  return dates.map((d) => new Date(d).getTime()).sort((a, b) => b - a)[0]
}

// Dias uteis parado desde a ultima atividade
export function diasParado(ticket, processos = []) {
  const last = ultimaAtividade(ticket, processos)
  if (!last) return null
  return diasUteisEntre(new Date(last).toISOString(), new Date().toISOString())
}

// Estado de saude para o Kanban/dashboard
export function estadoTicket(ticket, processos = [], limiteDias = 5) {
  if (!ticket) return null
  const bloqueado = ticketBloqueado(processos)
  const dias = diasParado(ticket, processos)
  const parado = dias != null && dias > limiteDias
  return {
    bloqueado,
    itensBloqueados: bloqueado ? itensBloqueados(processos) : [],
    parado,
    diasParado: dias,
  }
}

// Configuracao do painel: limite de dias parado
export function useLimiteParado(supabase) {
  const [limite, setLimite] = useState(parseInt(LIMITE_DIAS_PARADO_DEFAULT, 10))
  const [config, setConfig] = useState(null)

  async function load() {
    const { data } = await supabase.from('app_config').select('*')
    if (!data) return
    const map = Object.fromEntries(data.map((c) => [c.key, c.value]))
    setConfig(map)
    setLimite(parseInt(map[APP_CONFIG_KEY_LIMITE] || LIMITE_DIAS_PARADO_DEFAULT, 10) || 5)
  }

  useEffect(() => {
    if (!supabase) return
    load()
    const channel = supabase
      .channel('app-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [supabase])

  return { limite, config, reload: load }
}