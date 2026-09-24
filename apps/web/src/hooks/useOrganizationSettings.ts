// useOrganizationSettings — server state da tela Configurações > Organização.
// Escopado pela organização ativa do usuário (ver useActiveOrganization).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrganizationSettings,
  updateOrganizationBranding,
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
      // A meta da organização alimenta o card "Meta da Representação" do início.
      queryClient.invalidateQueries({ queryKey: ['team', 'goals', 'summary', organizationId] })
    },
  })
}

export function useUploadOrganizationSettingsIcon(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadOrganizationSettingsIcon(organizationId as string, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(organizationId) })
      // Ícone/cor chegam na sidebar e no tema via GET /auth/memberships.
      queryClient.invalidateQueries({ queryKey: ['auth', 'memberships'] })
    },
  })
}

export function useUpdateOrganizationBranding(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (secondaryColor: string | null) =>
      updateOrganizationBranding(organizationId as string, { secondaryColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(organizationId) })
      queryClient.invalidateQueries({ queryKey: ['auth', 'memberships'] })
    },
  })
}
