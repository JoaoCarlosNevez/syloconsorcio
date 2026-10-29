// Supabase browser client — autenticação do lado do frontend.
//
// ADR-06: O frontend usa @supabase/supabase-js diretamente para auth.
// O access token resultante é enviado como Bearer para a API.
//
// Configuração de storage: sessionStorage em vez de localStorage.
// Tokens são limpos quando o browser fecha — menor janela de exposição.
// Exceção: o app do celular instalado (PWA, display-mode standalone) usa
// localStorage — senão o vendedor teria que entrar de novo toda vez que
// abrisse o app pela tela de início.
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

function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
  )
}

/**
 * Custom storage adapter: sessionStorage (tokens are cleared when the tab
 * closes), or localStorage inside the installed mobile app.
 */
function browserStorage(): Storage {
  return isInstalledApp() ? localStorage : sessionStorage
}

const sessionStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      return browserStorage().getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      browserStorage().setItem(key, value)
    } catch {
      // storage may be unavailable in some contexts (e.g., private browsing)
    }
  },
  removeItem: (key: string): void => {
    try {
      browserStorage().removeItem(key)
    } catch {
      // storage may be unavailable in some contexts
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
