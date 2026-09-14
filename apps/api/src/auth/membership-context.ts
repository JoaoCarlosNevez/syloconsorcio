// buildMembershipContext — converte um UserMembership (dado bruto do repositório)
// em MembershipContext (com DataScope e Permissions calculados).
//
// Compartilhado entre tenantMiddleware e as rotas de auth para que o cálculo
// de DataScope/Permissions exista em um único lugar (ADR-04).

import type { MembershipContext, UserMembership } from '@sylocrm/application'
import { calculateDataScope } from './data-scope'
import { getPermissionsForRole } from './permissions'

export function buildMembershipContext(membership: UserMembership): MembershipContext {
  return {
    organizationId: membership.organizationId,
    organizationType: membership.organizationType,
    organizationName: membership.organizationName,
    organizationIconUrl: membership.organizationIconUrl,
    role: membership.role,
    dataScope: calculateDataScope(membership.organizationType, membership.role),
    permissions: getPermissionsForRole(membership.role),
  }
}
