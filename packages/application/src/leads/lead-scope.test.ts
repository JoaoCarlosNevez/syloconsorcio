// Tests: resolveLeadScope — Supervisor com time vê só o time.

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { resolveLeadScope } from './lead-scope'

const MANAGER: MembershipContext = {
  organizationId: 'org-01',
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Sylo',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.MANAGER,
  dataScope: DataScope.REPRESENTATION,
  permissions: [],
}
const organizationRepository = {
  findChildOrganizationIds: vi.fn(),
} as unknown as IOrganizationRepository

describe('resolveLeadScope', () => {
  it('limits a supervisor with a team to the team and to themselves', async () => {
    const scope = await resolveLeadScope(
      { ...MANAGER, teamUserIds: ['ana', 'bia'] },
      'carlos',
      organizationRepository,
    )

    expect(scope).toEqual({ organizationIds: ['org-01'], teamUserIds: ['ana', 'bia', 'carlos'] })
  })

  it('keeps the whole representation for a supervisor without a team', async () => {
    const scope = await resolveLeadScope(MANAGER, 'carlos', organizationRepository)

    expect(scope).toEqual({ organizationIds: ['org-01'] })
  })
})
