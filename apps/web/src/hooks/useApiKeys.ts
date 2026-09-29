// useApiKeys — chaves de API da organização ativa (Configurações >
// Integrações) via TanStack Query (ADR-04).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ApiKey, createApiKey, listApiKeys, revokeApiKey } from '../lib/api-keys-api'

function apiKeysQueryKey(organizationId: string | null) {
  return ['api-keys', organizationId] as const
}

export function useApiKeysQuery(organizationId: string | null, enabled = true) {
  return useQuery<ApiKey[]>({
    queryKey: apiKeysQueryKey(organizationId),
    queryFn: () => listApiKeys(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  })
}

export function useCreateApiKey(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createApiKey(organizationId as string, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(organizationId) })
      queryClient.invalidateQueries({ queryKey: ['activity', organizationId] })
    },
  })
}

export function useRevokeApiKey(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeApiKey(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(organizationId) })
      queryClient.invalidateQueries({ queryKey: ['activity', organizationId] })
    },
  })
}
