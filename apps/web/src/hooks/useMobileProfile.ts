// useMobileProfile — perfil do app do celular na organização ativa (ver
// lib/mobile-profile.ts).

import { canAssignLeads, mobileProfile } from '../lib/mobile-profile'
import { useActiveOrganization } from './useOrganization'

export function useMobileProfile() {
  const { membership, memberships, isLoading } = useActiveOrganization()
  return {
    profile: mobileProfile(membership),
    canAssign: canAssignLeads(membership),
    /** Membership num Master — pra oferecer "voltar pra rede" de dentro de
     * uma Representação. */
    masterMembership: memberships.find((m) => m.organizationType === 'MASTER') ?? null,
    isLoading,
  }
}
