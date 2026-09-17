// Supabase browser client — autenticação do lado do frontend.
//
// ADR-06: O frontend usa @supabase/supabase-js diretamente para auth.
// O access token resultante é enviado como Bearer para a API.
//
// Configuração de storage: sessionStorage em vez de localStorage.
// Tokens são limpos quando o browser fecha — menor janela de exposição.
//
// As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são públicas
// (anon key tem permissões limitadas e é projetada para ser exposta).

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
      'Authentication will not work. Set them in .env.local.',
  )
}

/**
 * Custom storage adapter using sessionStorage.
 * Tokens are cleared when the browser tab closes.
 */
const sessionStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      // sessionStorage may be unavailable in some contexts (e.g., private browsing)
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
  },
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: sessionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
