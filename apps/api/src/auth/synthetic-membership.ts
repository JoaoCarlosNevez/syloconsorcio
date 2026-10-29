// Memberships sintéticas — acesso a uma organização sem vínculo real nela.
//
// Duas origens (nunca persistidas; calculadas a cada requisição):
//   - Super Admin da plataforma (users.isPlatformAdmin): qualquer organização.
//   - Membro de um MASTER: as Representações ligadas a ele
//     (parent_organization_id), como Dono — vê e opera tudo nelas.
//
// Quando há membership real na organização, o Role real prevalece — a
// sintética é só o fallback pra quando não há vínculo algum.

import type { OrganizationRecord, UserMembership } from '@sylocrm/application'
import { DEFAULT_MEMBER_TIER, OrganizationType, Role } from '@sylocrm/domain'

/** Membership ADMIN (Dono) sintética na organização informada. */
export function synthesizeOwnerMembership(organization: OrganizationRecord): UserMembership {
  return {
    organizationId: organization.id,
    organizationType: organization.type,
    organizationName: organization.name,
    organizationIconUrl: organization.isWhiteLabel
      ? (organization.branding?.iconUrl ?? null)
      : null,
    organizationSecondaryColor: organization.isWhiteLabel
      ? (organization.branding?.secondaryColor ?? null)
      : null,
    role: Role.ADMIN,
    status: 'ACTIVE',
    tier: DEFAULT_MEMBER_TIER,
  }
}

/** A organização é uma Representação ligada a um Master do qual o usuário é membro? */
export function isInMasterNetwork(
  organization: OrganizationRecord,
  memberships: readonly UserMembership[],
): boolean {
  if (organization.type !== OrganizationType.REPRESENTACAO) return false
  if (!organization.parentOrganizationId) return false
  return memberships.some(
    (membership) =>
      membership.organizationType === OrganizationType.MASTER &&
      membership.status === 'ACTIVE' &&
      membership.organizationId === organization.parentOrganizationId,
  )
}
