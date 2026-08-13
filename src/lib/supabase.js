import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error(
    'Configuração do Supabase ausente. Crie o arquivo .env a partir do .env.example (ver SUPABASE_SETUP.md).'
  )
}

export const supabase = createClient(url, anon)

// Busca todas as linhas de uma tabela com paginacao (a API limita em 1000/consulta)
export async function fetchAllRows(supabaseClient, table, rangeSize = 1000) {
  const rows = []
  let from = 0
  for (;;) {
    const { data, count, error } = await supabaseClient
      .from(table)
      .select('*', { count: 'exact' })
      .range(from, from + rangeSize - 1)
    if (error) return { data: null, error }
    const chunk = data || []
    rows.push(...chunk)
    if (chunk.length < rangeSize) break
    if (count != null && rows.length >= count) break
    from += rangeSize
  }
  return { data: rows, error: null }
}