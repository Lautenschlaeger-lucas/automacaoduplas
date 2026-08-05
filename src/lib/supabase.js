import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error(
    'Configuração do Supabase ausente. Crie o arquivo .env a partir do .env.example (ver SUPABASE_SETUP.md).'
  )
}

export const supabase = createClient(url, anon)