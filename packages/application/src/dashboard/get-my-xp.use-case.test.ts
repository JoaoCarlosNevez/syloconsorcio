// Tests: GetMyXpUseCase — XP do mês, XP acumulado e nível.

import { describe, expect, it, vi } from 'vitest'
import type { IAchievementsRepository } from '../ports/achievements.repository'
import type { IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import { GetMyAchievementsUseCase } from './get-my-achievements.use-case'
import { GetMyXpUseCase, levelFor } from './get-my-xp.use-case'

// 15/10/2026 em Brasília.
const NOW = new Date('2026-10-15T15:00:00Z')
const inOctober = (range: { from: Date }) => range.from.getUTCFullYear() === 2026

function setup() {
  // Outubro: 10 leads, 4 propostas (2 enviadas), 1 cota. Desde sempre: o dobro.
  const engagementRepository: IEngagementRepository = {
    countLeadsWorked: vi.fn(async (range) => (inOctober(range) ? 10 : 20)),
    proposalStats: vi.fn(async (range) =>
      inOctober(range)
        ? { created: 4, shared: 2, opened: 1 }
        : { created: 8, shared: 4, opened: 2 },
    ),
  }
  const leadRepository = {
    countWonInDefaultFunnel: vi.fn(async (filter: { wonFrom: Date }) =>
      filter.wonFrom.getUTCFullYear() === 2026 ? 1 : 3,
    ),
  } as unknown as ILeadRepository
  const streakRepository: IStreakRepository = {
    listActiveDays: vi.fn().mockResolvedValue(['2026-09-30', '2026-10-01', '2026-10-02']),
  }
  const achievementsRepository: IAchievementsRepository = {
    listWonSales: vi.fn().mockResolvedValue([
      { wonAt: new Date('2026-09-10T12:00:00Z'), valueCents: 100_000_00 },
      { wonAt: new Date('2026-10-05T12:00:00Z'), valueCents: 450_000_00 }, // cruza 500K
    ]),
    firstPostSaleStageAt: vi.fn().mockResolvedValue(null),
    firstChecklistItemAt: vi.fn().mockResolvedValue(null),
  }
  return new GetMyXpUseCase(
    engagementRepository,
    leadRepository,
    streakRepository,
    new GetMyAchievementsUseCase(achievementsRepository),
  )
}

describe('GetMyXpUseCase', () => {
  it('adds up the month XP from real actions and achievements unlocked in the month', async () => {
    const result = await setup().execute({ organizationId: 'org-01', userId: 'ana', now: NOW })

    expect(result.month.items.map((i) => [i.key, i.count, i.xp])).toEqual([
      ['leads', 10, 20],
      ['proposals', 4, 12],
      ['shared', 2, 10],
      ['quotas', 1, 40],
      ['streak', 2, 10], // 01 e 02/10 (30/09 é do mês anterior)
      ['achievements', 1, 150], // 500K em outubro (Primeira cota foi em setembro)
    ])
    expect(result.month.total).toBe(242)
  })

  it('levels up from the all-time XP', async () => {
    const result = await setup().execute({ organizationId: 'org-01', userId: 'ana', now: NOW })

    // 20×2 + 8×3 + 4×5 + 3×40 + 3×5 + (100 + 150) = 469
    expect(result.totalXp).toBe(469)
    expect(result.level).toMatchObject({ level: 1, name: 'Iniciante Sylo' })
    expect(result.nextLevel).toMatchObject({ level: 2, minXp: 500 })
  })
})

describe('levelFor', () => {
  it('picks the highest level reached and the next one', () => {
    expect(levelFor(0).level.level).toBe(1)
    expect(levelFor(1000)).toMatchObject({ level: { level: 3 }, next: { level: 4 } })
    expect(levelFor(9999)).toMatchObject({ level: { level: 5 }, next: null })
  })
})
