// useActiveOrganization — resolve a organização em que o usuário está operando,
// e permite trocar entre as organizações do usuário (seletor na sidebar).
//
// Usa a primeira membership retornada por GET /auth/memberships por padrão,
// lembrando a última organização escolhida em localStorage.
//
// A organização selecionada vive no cache do TanStack Query (não em useState)
// justamente para ser compartilhada entre todo componente que chama este hook —
// um useState local não propagaria a troca de organização feita na sidebar
// para o restante da árvore (cada componente teria seu próprio estado isolado).

import type { Tier } from '@sylocrm/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { apiClient } from '../lib/api-client'
import { useAuth } from './useAuth'

export interface MembershipSummary {
  organizationId: string
  organizationType: 'INCORPORADORA' | 'MASTER' | 'REPRESENTACAO'
  organizationName: string
  organizationIconUrl: string | null
  /** Cor secundária White Label (#RRGGBB), null = âmbar padrão da Sylo. */
  organizationSecondaryColor: string | null
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
  /** Patente do usuário nesta organização (Configurações → Equipe). */
  tier: Tier
  dataScope: 'own' | 'representation' | 'master' | 'incorporadora'
  permissions: string[]
}

const ACTIVE_ORG_STORAGE_KEY = 'sylocrm.activeOrganizationId'
const SELECTED_ORG_QUERY_KEY = ['ui', 'selectedOrganizationId'] as const

function rememberOrganization(organizationId: string): void {
  try {
    localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId)
  } catch {
    // localStorage pode estar indisponível (ex: navegação privada) — não é crítico
  }
}

function getRememberedOrganization(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)
  } catch {
    return null
  }
}

async function fetchMemberships(): Promise<MembershipSummary[]> {
  const { memberships } = await apiClient.get<{ memberships: MembershipSummary[] }>(
    '/auth/memberships',
  )
  return memberships
}

export function useActiveOrganization() {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: memberships,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'memberships'],
    queryFn: fetchMemberships,
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  })

  // Lido do cache do TanStack Query (compartilhado por toda a árvore), com
  // localStorage só como valor inicial na primeira leitura.
  const { data: selectedOrganizationId } = useQuery({
    queryKey: SELECTED_ORG_QUERY_KEY,
    queryFn: getRememberedOrganization,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  const membership = useMemo(() => {
    if (!memberships || memberships.length === 0) return null
    const active =
      memberships.find((m) => m.organizationId === selectedOrganizationId) ?? memberships[0]
    return active ?? null
  }, [memberships, selectedOrganizationId])

  const setActiveOrganizationId = useCallback(
    (organizationId: string) => {
      rememberOrganization(organizationId)
      queryClient.setQueryData(SELECTED_ORG_QUERY_KEY, organizationId)
    },
    [queryClient],
  )

  return {
    organizationId: membership?.organizationId ?? null,
    membership,
    memberships: memberships ?? [],
    isLoading,
    error,
    setActiveOrganizationId,
  }
}
