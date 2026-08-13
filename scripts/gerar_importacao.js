// Gerador: supabase/dadosimplantacao.sql (planilha antiga) -> supabase/importar_dadosimplantacao.sql (schema atual)
// Uso: node scripts/gerar_importacao.js
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'supabase', 'dadosimplantacao.sql')
const OUT = join(ROOT, 'supabase', 'importar_dadosimplantacao.sql')

// Mapeamento dos itens antigos da planilha -> (nova etapa, nova chave)
// null = sem correspondencia direta: vira item customizado (aparece em "Itens adicionais")
const MAP = {
  importacao_produtos: ['tecnica', 'anuncios_tela_importacao'],
  cadastro_produto: ['treinamento', 'cadastro_produtos'],
  categoria_atributos: ['treinamento', 'mapeamento_categorias'],
  variacao: ['treinamento', 'cadastro_produtos'], // colisao com cadastro_produto
  publicacao: ['treinamento', 'publicacao_anuncios'],
  estoque: ['tecnica', 'config_estoque'],
  loja_virtual: ['tecnica', 'integracao_marketplaces'],
  logistica: ['tecnica', 'integracao_logistica'],
  gestao: ['treinamento', 'gestao_anuncios'],
  metrica: ['treinamento', 'dashboard_status_pedidos'],
  precificacao: ['treinamento', 'precificacao_automatica'],
  treinamento_importacao_anuncios: ['treinamento', 'treinamento_importacao_anuncios'],
  importacao_anuncios: ['treinamento', 'acompanhar_importacao_anuncios'],
  virada: null, // custom: 'Virada'
  acompanhamento: null, // custom: 'Acompanhamento'
}

const CUSTOM_TITULO = {
  virada: 'Virada',
  acompanhamento: 'Acompanhamento',
}

// Status texto da planilha -> enum do painel
const STATUS = {
  feito: 'feito',
  pendente: 'pendente',
  parcial: 'parcial',
  bloqueado: 'bloqueado',
  nao_mapeado: 'nao_aplicavel', // sem informacao na planilha => nao conta no progresso
  nao_aplicavel: 'nao_aplicavel',
}

const PESO = { nao_aplicavel: 0, pendente: 0, parcial: 1, feito: 2, bloqueado: 3 }

function sqlUnescape(s) {
  return s.replace(/''/g, "'")
}

// Divide o conteudo entre parenteses em argumentos, respeitando aspas e '' escapado.
// Valores entre aspas simples saem sem as aspas (escapados no meio).
function splitArgs(inner) {
  const args = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (inQuote) {
      if (c === "'") {
        if (inner[i + 1] === "'") {
          cur += "'"
          i++
        } else {
          inQuote = false
        }
      } else {
        cur += c
      }
    } else if (c === "'") {
      inQuote = true
    } else if (c === ',') {
      args.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  args.push(cur)
  return args.map((a) => a.trim())
}

function findValuesBlock(text, from) {
  const start = text.indexOf('VALUES (', from)
  if (start === -1) return null
  let i = start + 'VALUES ('.length
  let depth = 1
  let inQuote = false
  for (; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === "'") {
        if (text[i + 1] === "'") i++
        else inQuote = false
      }
    } else if (c === "'") {
      inQuote = true
    } else if (c === '(') {
      depth++
    } else if (c === ')') {
      depth--
      if (depth === 0) break
    }
  }
  return { inner: text.slice(start + 'VALUES ('.length, i), end: i }
}

const text = readFileSync(SRC, 'utf8')
const clientes = new Map() // codigo -> { nome, motivo }
const itens = new Map() // codigo -> [{ item, status }]

let pos = 0
while (pos < text.length) {
  const tIdx = text.indexOf('INSERT INTO tickets ', pos)
  const cIdx = text.indexOf('INSERT INTO checklist_items ', pos)
  let pick = null
  if (tIdx !== -1 && (cIdx === -1 || tIdx < cIdx)) pick = { kind: 'ticket', at: tIdx }
  else if (cIdx !== -1) pick = { kind: 'item', at: cIdx }
  if (!pick) break
  const block = findValuesBlock(text, pick.at)
  if (!block) break
  const args = splitArgs(block.inner)
  if (pick.kind === 'ticket') {
    const [cod, nome, motivo, tipo] = args.map((a) => (a === 'NULL' ? null : a))
    clientes.set(cod, { nome, motivo, tipo })
    itens.set(cod, [])
  } else {
    const [cod, cat, item, status] = args.map((a) => (a === 'NULL' ? null : a))
    if (!itens.has(cod)) itens.set(cod, [])
    itens.get(cod).push({ item, status })
  }
  pos = block.end + 1
}

// Resolve colisoes (ex: cadastro_produto + variacao -> cadastro_produtos): maior peso vence
const finalPorCliente = new Map()
const customPorCliente = new Map()
for (const [cod, lista] of itens) {
  const final = new Map() // chave -> { chave, status, origem }
  const customs = []
  for (const { item, status } of lista) {
    const mapped = MAP[item]
    const st = STATUS[status]
    if (!st) continue
    if (!mapped) {
      customs.push({ chave: `legado_${item}`, titulo: CUSTOM_TITULO[item] || item, status: st })
      continue
    }
    const chave = mapped[1]
    const prev = final.get(chave)
    const peso = PESO[st] ?? 0
    if (!prev || peso > (PESO[prev.status] ?? 0) || (peso === (PESO[prev.status] ?? 0) && item === 'cadastro_produto')) {
      final.set(chave, { chave, status: st, origem: item })
    }
  }
  finalPorCliente.set(cod, [...final.values()])
  if (customs.length) customPorCliente.set(cod, customs)
}

// ---- Geracao do SQL ----
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const lines = []
lines.push('-- ============================================================')
lines.push('-- IMPORTACAO: dados da planilha (dadosimplantacao.sql) -> painel')
lines.push('-- Gerado por scripts/gerar_importacao.js. NAO edite a mao.')
lines.push('-- Requisito: rodar checklist_migration.sql antes (funcao seed_checklist_itens).')
lines.push('-- --')
lines.push(`-- Todos os tickets tem ${finalPorCliente.size} clientes; status da planilha aplicado nos itens padrao.`)
lines.push('-- --')
lines.push('-- MAPEAMENTO itens antigos -> chaves novas:')
for (const [item, m] of Object.entries(MAP)) {
  lines.push(`--   ${item}${m ? ` -> ${m[0]}/${m[1]}` : ' -> item customizado'}`)
}
lines.push('--   status nao_mapeado -> nao_aplicavel (nao conta no progresso).')
lines.push('-- ============================================================')

// 1) Garante ticket geral (pai) por cliente; atualiza nome se ja existir
lines.push('\n-- 1) Tickets gerais por cliente (cria se nao existir; trigger semeia o checklist)')
lines.push('insert into public.tickets (codigo_cliente, nome_cliente, titulo, area, status)')
lines.push('select v.codigo, v.nome, v.nome, \'tecnica\', \'aberto\'')
lines.push('from (values')
lines.push(
  [...clientes.entries()].map(([cod, c]) => `  (${q(cod)}, ${q(c.nome)})`).join(',\n')
)
lines.push(') as v(codigo, nome)')
lines.push('on conflict (codigo_cliente) where parent_id is null')
lines.push(`do update set nome_cliente = excluded.nome_cliente;`)

// 2) Status por chave (agrupado por chave nova em statement unico)
const porChave = new Map()
for (const [cod, finals] of finalPorCliente) {
  for (const { chave, status } of finals) {
    if (!porChave.has(chave)) porChave.set(chave, [])
    porChave.get(chave).push([cod, status])
  }
}
const IMPLICA = { nao_aplicavel: '0', pendente: '1', parcial: '2', feito: '3', bloqueado: '4' }
lines.push('\n-- 2) Status da planilha aplicados nos itens padrao (idempotente)')
for (const [chave, list] of porChave) {
  lines.push(`update public.processos p`)
  lines.push(`set status = v.status`)
  lines.push(`from (values`)
  lines.push(list.map(([cod, st]) => `  (${q(cod)}, ${q(st)})`).join(',\n'))
  lines.push(`) as v(codigo, status)`)
  lines.push(`join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null`)
  lines.push(`where p.ticket_pai_id = t.id and p.chave = ${q(chave)} and p.tipo = 'padrao'`)
  lines.push(`  and p.status <> v.status;`)
  lines.push('')
}

// 3) Motivo de bloqueio nos itens bloqueados
const clientesComMotivo = [...clientes.entries()].filter(
  ([, c]) => c.motivo && c.motivo.trim() && c.motivo.trim().toUpperCase() !== 'OK'
)
if (clientesComMotivo.length) {
  lines.push('-- 3) Motivo de bloqueio (observacao da planilha) nos itens bloqueados')
  lines.push('update public.processos p')
  lines.push('set motivo = v.motivo')
  lines.push('from (values')
  lines.push(clientesComMotivo.map(([cod, c]) => `  (${q(cod)}, ${q(c.motivo.trim())})`).join(',\n'))
  lines.push(') as v(codigo, motivo)')
  lines.push(`join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null`)
  lines.push(`where p.ticket_pai_id = t.id and p.tipo = 'padrao' and p.status = 'bloqueado' and p.motivo is distinct from v.motivo;`)
  // Clientes com motivo mas sem item bloqueado -> motivo vai para a descricao do ticket
  lines.push('')
  lines.push('-- 3b) Motivo sem item bloqueado -> registrado na descricao do ticket geral')
  lines.push('update public.tickets t')
  lines.push('set descricao = case')
  lines.push("  when t.descricao like '%Bloqueio (planilha)%' then 'Bloqueio (planilha): ' || v.motivo")
  lines.push("  when t.descricao is null or t.descricao = '' then 'Bloqueio (planilha): ' || v.motivo")
  lines.push("  else t.descricao || E'\\nBloqueio (planilha): ' || v.motivo end")
  lines.push('from (values')
  lines.push(clientesComMotivo.map(([cod, c]) => `  (${q(cod)}, ${q(c.motivo.trim())})`).join(',\n'))
  lines.push(') as v(codigo, motivo)')
  lines.push(`where t.codigo_cliente = v.codigo and t.parent_id is null`)
  lines.push(`  and not exists (select 1 from public.processos pp where pp.ticket_pai_id = t.id and pp.status = 'bloqueado');`)
}

// 4) Itens sem correspondencia -> customizados
if (customPorCliente.size) {
  lines.push('')
  lines.push('-- 4) Itens da planilha sem correspondencia na lista nova -> itens customizados')
  lines.push('insert into public.processos (ticket_pai_id, titulo, tipo, chave, status, ordem)')
  lines.push('select t.id, v.titulo, \'custom\', v.chave, v.status, 100')
  lines.push('from (values')
  const customRows = []
  for (const [cod, customs] of customPorCliente) {
    for (const c of customs) customRows.push(`  (${q(cod)}, ${q(c.titulo)}, ${q(c.chave)}, ${q(c.status)})`)
  }
  lines.push(customRows.join(',\n'))
  lines.push(') as v(codigo, titulo, chave, status)')
  lines.push(`join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null`)
  lines.push('on conflict (ticket_pai_id, chave) where chave is not null')
  lines.push('do update set status = excluded.status, titulo = excluded.titulo;')
}

lines.push('')
lines.push('-- 5) Conferencia: progresso por cliente apos a importacao')
lines.push("select t.codigo_cliente, t.nome_cliente,")
lines.push("       count(*) filter (where p.status = 'feito') as feitos,")
lines.push("       count(*) filter (where p.status = 'bloqueado') as bloqueados,")
lines.push("       count(*) as total")
lines.push(`from public.tickets t`)
lines.push(`join public.processos p on p.ticket_pai_id = t.id`)
lines.push(`where t.parent_id is null and t.codigo_cliente in (${[...clientes.keys()].map(q).join(',')})`)
lines.push(`group by 1, 2 order by 1;`)

writeFileSync(OUT, lines.join('\n'))
const nStatus = [...finalPorCliente.values()].flat().length
const nCustom = [...customPorCliente.values()].flat().length
console.log(`Clientes: ${clientes.size}`)
console.log(`Itens mapeados: ${nStatus} | customizados: ${nCustom}`)
console.log(`Motivos de bloqueio: ${clientesComMotivo.length}`)
console.log(`Gerado: ${OUT}`)