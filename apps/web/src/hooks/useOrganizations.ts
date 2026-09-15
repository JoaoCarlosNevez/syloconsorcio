// useOrganizations — server state do painel de Administração (Super Admin).
// Não confundir com useActiveOrganization (hooks/useOrganization.ts), que
// resolve a organização em que o usuário comum está operando.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPlatformUser,
  createRepresentation,
  deletePlatformUser,
  getOrganizationMembers,
  listOrganizations,
  listPlatformMembers,
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
    mutationFn: (payload: { name?: string; isWhiteLabel?: boolean }) =>
      updateOrganization(organizationId, payload),
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

export function usePlatformMembersQuery() {
  return useQuery({
    queryKey: ['admin', 'platform-members'],
    queryFn: listPlatformMembers,
  })
}

export function useCreatePlatformUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPlatformUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-members'] })
    },
  })
}

export function useDeletePlatformUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePlatformUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-members'] })
    },
  })
}
