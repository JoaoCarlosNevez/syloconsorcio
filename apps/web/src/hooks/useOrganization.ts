// useActiveOrganization — resolve a organização em que o usuário está operando.
//
// MVP: ainda não existe seletor de organização na UI, nem onboarding (AGENTS.md §9).
// Usa a primeira membership retornada por GET /auth/memberships, lembrando a
// última organização escolhida em localStorage para o caso de múltiplas membros.

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiClient } from '../lib/api-client'
import { useAuth } from './useAuth'

export interface MembershipSummary {
  organizationId: string
  organizationType: 'INCORPORADORA' | 'MASTER' | 'REPRESENTACAO'
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
  dataScope: 'own' | 'representation' | 'master' | 'incorporadora'
  permissions: string[]
}

const ACTIVE_ORG_STORAGE_KEY = 'sylocrm.activeOrganizationId'

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

  const membership = useMemo(() => {
    if (!memberships || memberships.length === 0) return null
    const rememberedId = getRememberedOrganization()
    const active = memberships.find((m) => m.organizationId === rememberedId) ?? memberships[0]
    if (active) rememberOrganization(active.organizationId)
    return active ?? null
  }, [memberships])

  return {
    organizationId: membership?.organizationId ?? null,
    membership,
    memberships: memberships ?? [],
    isLoading,
    error,
  }
}
