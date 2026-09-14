// useOrganizations — server state do painel de Administração (Super Admin).
// Não confundir com useActiveOrganization (hooks/useOrganization.ts), que
// resolve a organização em que o usuário comum está operando.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRepresentation,
  getOrganizationMembers,
  listOrganizations,
  updateOrganization,
  uploadOrganizationIcon,
} from '../lib/organizations-api'

export function useOrganizationsQuery() {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: listOrganizations,
  })
}

export function useCreateRepresentation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRepresentation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
    },
  })
}

export function useOrganizationMembersQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['admin', 'organizations', organizationId, 'members'],
    queryFn: () => getOrganizationMembers(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string }) => updateOrganization(organizationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
    },
  })
}

export function useUploadOrganizationIcon(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadOrganizationIcon(organizationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
    },
  })
}
