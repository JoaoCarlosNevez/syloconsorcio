// useAdministrators — administradoras da organização via TanStack Query.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AdministratorPayload,
  createAdministrator,
  deleteAdministrator,
  listAdministrators,
  updateAdministrator,
} from '../lib/administrators-api'

export function useAdministratorsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['administrators', organizationId],
    queryFn: () => listAdministrators(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

function useInvalidate(organizationId: string | null) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['administrators', organizationId] })
}

export function useCreateAdministrator(organizationId: string | null) {
  const invalidate = useInvalidate(organizationId)
  return useMutation({
    mutationFn: (payload: AdministratorPayload) =>
      createAdministrator(organizationId as string, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateAdministrator(organizationId: string | null) {
  const invalidate = useInvalidate(organizationId)
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdministratorPayload }) =>
      updateAdministrator(organizationId as string, id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteAdministrator(organizationId: string | null) {
  const invalidate = useInvalidate(organizationId)
  return useMutation({
    mutationFn: (id: string) => deleteAdministrator(organizationId as string, id),
    onSuccess: invalidate,
  })
}
