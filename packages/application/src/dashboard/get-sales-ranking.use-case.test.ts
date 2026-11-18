// Tests: GetSalesRankingUseCase — só Vendedores ativos, ordem por valor
// ganho (desempate: clientes ganhos, ofensiva), meta da operação.

import { Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { ILeadRepository, WonValueFilter } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import { GetSalesRankingUseCase } from './get-sales-ranking.use-case'

const NOW = new Date('2026-10-02T18:00:00Z')

function member(userId: string, role: Role, extra: Partial<TeamMember> = {}): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
    ...extra,
  }
}

const WON: Record<string, { cents: number; count: number }> = {
  ana: { cents: 300_000_00, count: 2 },
  bia: { cents: 500_000_00, count: 1 },
  caio: { cents: 300_000_00, count: 3 },
}

function setup(members: TeamMember[], orgGoal: number | null = null) {
  const leadRepository = {
    sumWonValueCentsInDefaultFunnel: vi.fn(async (f: WonValueFilter) =>
      f.assignedUserId ? (WON[f.assignedUserId]?.cents ?? 0) : 1_100_000_00,
    ),
    countWonInDefaultFunnel: vi.fn(async (f: WonValueFilter) =>
      f.assignedUserId ? (WON[f.assignedUserId]?.count ?? 0) : 6,
    ),
    wonTotalsByAssigneeInDefaultFunnel: vi.fn(async () => new Map(Object.entries(WON))),
  } as unknown as ILeadRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn().mockResolvedValue(members),
  } as unknown as IMembershipRepository
  const organizationRepository = {
    findById: vi.fn().mockResolvedValue({ name: 'Sylo', salesGoalCents: orgGoal }),
  } as unknown as IOrganizationRepository
  const streakRepository: IStreakRepository = {
    listActiveDays: vi.fn(),
    listActiveDaysByUser: vi.fn(
      async (userIds: string[]) =>
        new Map(
          userIds.map((id) => [id, id === 'caio' ? ['2026-10-01', '2026-10-02'] : ['2026-10-02']]),
        ),
    ),
  }
  return new GetSalesRankingUseCase(
    membershipRepository,
    leadRepository,
    organizationRepository,
    streakRepository,
  )
}

describe('GetSalesRankingUseCase — consultas', () => {
  it('reads the whole team in one query per metric, not one per seller', async () => {
    const leadRepository = {
      sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(0),
      wonTotalsByAssigneeInDefaultFunnel: vi.fn().mockResolvedValue(new Map()),
    } as unknown as ILeadRepository
    const streakRepository: IStreakRepository = {
      listActiveDays: vi.fn(),
      listActiveDaysByUser: vi.fn().mockResolvedValue(new Map()),
    }
    const sellers = ['a', 'b', 'c', 'd'].map((id) => member(id, Role.SELLER))
    const ranking = await new GetSalesRankingUseCase(
      { findActiveByOrganizationId: vi.fn().mockResolvedValue(sellers) } as never,
      leadRepository,
      { findById: vi.fn().mockResolvedValue(null) } as never,
      streakRepository,
    ).execute({ organizationId: 'org-01', now: NOW })

    expect(ranking.sellers).toHaveLength(4)
    expect(ranking.sellers[0]).toMatchObject({ wonCents: 0, wonCount: 0, streakDays: 0 })
    expect(leadRepository.wonTotalsByAssigneeInDefaultFunnel).toHaveBeenCalledTimes(1)
    expect(streakRepository.listActiveDaysByUser).toHaveBeenCalledWith(['a', 'b', 'c', 'd'])
    expect(streakRepository.listActiveDays).not.toHaveBeenCalled()
  })
})

describe('GetSalesRankingUseCase', () => {
  it('ranks active sellers by value won, then clients won', async () => {
    const ranking = await setup([
      member('ana', Role.SELLER, { salesGoalCents: 400_000_00 }),
      member('bia', Role.SELLER),
      member('caio', Role.SELLER),
      member('dono', Role.ADMIN),
      member('super', Role.MANAGER),
      member('saiu', Role.SELLER, { status: 'SUSPENDED' }),
    ]).execute({ organizationId: 'org-01', now: NOW })

    expect(ranking.sellers.map((s) => s.userId)).toEqual(['bia', 'caio', 'ana'])
    expect(ranking.sellers[1]).toMatchObject({
      wonCents: 300_000_00,
      wonCount: 3,
      streakDays: 2,
    })
    expect(ranking.sellers[2]).toMatchObject({ goalCents: 400_000_00 })
  })

  it("uses the organization's goal, or the sum of the members' goals", async () => {
    const withOrgGoal = await setup([member('ana', Role.SELLER)], 2_000_000_00).execute({
      organizationId: 'org-01',
      now: NOW,
    })
    expect(withOrgGoal.organization).toEqual({
      name: 'Sylo',
      goalCents: 2_000_000_00,
      achievedCents: 1_100_000_00,
    })

    const fromMembers = await setup([
      member('ana', Role.SELLER, { salesGoalCents: 100_00 }),
      member('super', Role.MANAGER, { salesGoalCents: 50_00 }),
    ]).execute({ organizationId: 'org-01', now: NOW })
    expect(fromMembers.organization.goalCents).toBe(150_00)
  })

  it('ranks by what was won this week, keeping the goal on the month', async () => {
    const ranking = await setup([
      member('ana', Role.SELLER, { salesGoalCents: 400_000_00 }),
    ]).execute({
      organizationId: 'org-01',
      period: 'week',
      now: NOW,
    })

    expect(ranking.period).toBe('week')
    expect(ranking.periodStart).toEqual(new Date('2026-09-28T03:00:00Z'))
    expect(ranking.periodEnd).toEqual(new Date('2026-10-05T03:00:00Z'))
    expect(ranking.sellers[0]).toMatchObject({ goalCents: 400_000_00, monthWonCents: 300_000_00 })
  })
})
