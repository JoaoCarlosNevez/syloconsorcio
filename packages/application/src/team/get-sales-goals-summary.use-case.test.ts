// Tests: GetSalesGoalsSummaryUseCase — meta pessoal, soma das metas da
// representação e janela do mês no fuso de Brasília.

import { Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { GetSalesGoalsSummaryUseCase } from './get-sales-goals-summary.use-case'

const ORG_ID = 'org-01'
const USER_ID = 'user-01'

function member(userId: string, salesGoalCents: number | null): TeamMember {
  return {
    userId,
    name: null,
    email: `${userId}@empresa.com`,
    avatarUrl: null,
    role: Role.SELLER,
    status: 'ACTIVE',
    salesGoalCents,
    tier: 'bronze',
  }
}

function build(
  members: TeamMember[],
  personalGoalCents: number | null = null,
  organizationGoalCents: number | null = null,
) {
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn().mockResolvedValue(members),
    findPersonalGoal: vi.fn().mockResolvedValue(personalGoalCents),
  } as unknown as IMembershipRepository
  const sumWonValueCentsInDefaultFunnel = vi
    .fn()
    .mockImplementation(({ assignedUserId }: { assignedUserId?: string }) =>
      Promise.resolve(assignedUserId ? 150_000_00 : 900_000_00),
    )
  const leadRepository = { sumWonValueCentsInDefaultFunnel } as unknown as ILeadRepository
  const organizationRepository = {
    findById: vi.fn().mockResolvedValue({ id: ORG_ID, salesGoalCents: organizationGoalCents }),
  } as unknown as IOrganizationRepository
  return {
    useCase: new GetSalesGoalsSummaryUseCase(
      membershipRepository,
      leadRepository,
      organizationRepository,
    ),
    sumWonValueCentsInDefaultFunnel,
  }
}

describe('GetSalesGoalsSummaryUseCase', () => {
  it('uses the personal goal for the personal card and sums the team goals for the organization', async () => {
    const { useCase } = build(
      [member(USER_ID, 500_000_00), member('user-02', 1_000_000_00), member('user-03', null)],
      800_000_00,
    )

    const summary = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID })

    expect(summary.personal).toEqual({
      goalCents: 800_000_00,
      teamGoalCents: 500_000_00,
      achievedCents: 150_000_00,
    })
    expect(summary.organization).toEqual({ goalCents: 1_500_000_00, achievedCents: 900_000_00 })
  })

  it('prefers the organization goal over the sum of the team goals', async () => {
    const { useCase } = build(
      [member(USER_ID, 500_000_00), member('user-02', 1_000_000_00)],
      null,
      5_000_000_00,
    )

    const summary = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID })

    expect(summary.organization.goalCents).toBe(5_000_000_00)
  })

  it('returns null goals when nobody has a goal defined', async () => {
    const { useCase } = build([member(USER_ID, null), member('user-02', null)])

    const summary = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID })

    expect(summary.personal.goalCents).toBeNull()
    expect(summary.organization.goalCents).toBeNull()
  })

  it('uses the current calendar month in Brasília time', async () => {
    const { useCase, sumWonValueCentsInDefaultFunnel } = build([])

    // 01/10 às 01h UTC ainda é 30/09 às 22h em Brasília.
    const summary = await useCase.execute({
      organizationId: ORG_ID,
      userId: USER_ID,
      now: new Date('2026-10-01T01:00:00Z'),
    })

    expect(summary.periodStart.toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(summary.periodEnd.toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(sumWonValueCentsInDefaultFunnel).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      assignedUserId: USER_ID,
      wonFrom: summary.periodStart,
      wonTo: summary.periodEnd,
    })
  })
})
