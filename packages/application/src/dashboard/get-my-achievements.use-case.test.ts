// Tests: GetMyAchievementsUseCase — marcos de venda acumulada e do Pós-venda.

import { describe, expect, it, vi } from 'vitest'
import type { IAchievementsRepository } from '../ports/achievements.repository'
import { GetMyAchievementsUseCase } from './get-my-achievements.use-case'

const scope = { organizationId: 'org-01', userId: 'ana' }
const d = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`)

function setup(
  sales: { wonAt: Date; valueCents: number }[],
  assemblyAt: Date | null = null,
  contemplationAt: Date | null = null,
) {
  const repository: IAchievementsRepository = {
    listWonSales: vi.fn().mockResolvedValue(sales),
    firstPostSaleStageAt: vi
      .fn()
      .mockImplementation(async (_scope, stages: string[]) =>
        stages.includes('Em dia') ? assemblyAt : contemplationAt,
      ),
  }
  return { useCase: new GetMyAchievementsUseCase(repository), repository }
}

describe('GetMyAchievementsUseCase', () => {
  it('unlocks the sales milestones on the sale that crosses each mark', async () => {
    const { useCase } = setup([
      { wonAt: d(1), valueCents: 300_000_00 },
      { wonAt: d(5), valueCents: 300_000_00 }, // 600 mil → 500K
      { wonAt: d(9), valueCents: 500_000_00 }, // 1,1 mi → primeiro milhão
    ])

    const achievements = await useCase.execute(scope)
    const byId = Object.fromEntries(achievements.map((a) => [a.id, a]))

    expect(byId.first_quota?.unlockedAt).toEqual(d(1))
    expect(byId.sold_500k?.unlockedAt).toEqual(d(5))
    expect(byId.sold_1m?.unlockedAt).toEqual(d(9))
    expect(byId.sold_3m).toMatchObject({
      unlockedAt: null,
      progress: { currentCents: 1_100_000_00, targetCents: 3_000_000_00 },
    })
    expect(byId.sold_500k?.progress).toEqual({
      currentCents: 500_000_00,
      targetCents: 500_000_00,
    })
  })

  it('keeps everything locked without sales', async () => {
    const { useCase } = setup([])

    const achievements = await useCase.execute(scope)

    expect(achievements).toHaveLength(8)
    expect(achievements.every((a) => a.unlockedAt === null)).toBe(true)
  })

  it('uses the Pós-venda stages for the first assembly and contemplation', async () => {
    const { useCase, repository } = setup([], d(10), d(20))

    const achievements = await useCase.execute(scope)
    const byId = Object.fromEntries(achievements.map((a) => [a.id, a]))

    expect(byId.first_assembly?.unlockedAt).toEqual(d(10))
    expect(byId.first_contemplation?.unlockedAt).toEqual(d(20))
    expect(repository.firstPostSaleStageAt).toHaveBeenCalledWith(scope, [
      'Em dia',
      'Atrasado',
      'Contemplado',
    ])
  })
})
