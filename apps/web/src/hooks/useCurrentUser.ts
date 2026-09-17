// useCurrentUser — perfil do usuário no domínio SyloCRM (GET/PATCH /auth/me).
//
// Diferente de useAuth (sessão do Supabase): este hook expõe dados que só
// existem no nosso backend, como isPlatformAdmin — usado para decidir se a
// tela de Administração deve aparecer.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { useAuth } from './useAuth'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  /** Handle do Instagram, sem o "@" (ex: "sara.sylo"). */
  instagramHandle: string | null
  /** Cidade/região livre (ex: "São Paulo, SP"). */
  location: string | null
  isPlatformAdmin: boolean
  /** ISO 8601 — quando a conta foi criada. */
  createdAt: string | null
}

export interface UpdateProfilePayload {
  name?: string
  instagramHandle?: string | null
  location?: string | null
}

const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const

export function useCurrentUser() {
  const { isSignedIn } = useAuth()

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiClient.get<CurrentUser>('/auth/me'),
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiClient.patch<CurrentUser>('/auth/me', payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updated)
    },
  })
}
