// useCurrentUser — perfil do usuário no domínio SyloCRM (GET /auth/me).
//
// Diferente de useAuth (sessão do Supabase): este hook expõe dados que só
// existem no nosso backend, como isPlatformAdmin — usado para decidir se a
// tela de Administração deve aparecer.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { useAuth } from './useAuth'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  isPlatformAdmin: boolean
}

export function useCurrentUser() {
  const { isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<CurrentUser>('/auth/me'),
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}
