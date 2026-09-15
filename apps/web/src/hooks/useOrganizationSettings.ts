// useOrganizationSettings — server state da tela Configurações > Organização.
// Escopado pela organização ativa do usuário (ver useActiveOrganization).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  uploadOrganizationSettingsIcon,
} from '../lib/organization-settings-api'

const QUERY_KEY = (organizationId: string | null) => ['organization', 'settings', organizationId]

export function useOrganizationSettingsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEY(organizationId),
    queryFn: () => getOrganizationSettings(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useUpdateOrganizationSettings(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateOrganizationSettings>[1]) =>
      updateOrganizationSettings(organizationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(organizationId) })
    },
  })
}

export function useUploadOrganizationSettingsIcon(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadOrganizationSettingsIcon(organizationId as string, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(organizationId) })
    },
  })
}
