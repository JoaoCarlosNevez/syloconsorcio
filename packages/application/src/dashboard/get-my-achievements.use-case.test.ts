// Tests: GetMyAchievementsUseCase — marcos de venda acumulada e do Pós-venda.

import { Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IAchievementsRepository } from '../ports/achievements.repository'
import { GetMyAchievementsUseCase } from './get-my-achievements.use-case'

const scope = { organizationId: 'org-01', userId: 'ana' }
const d = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`)

function setup(
  sales: { wonAt: Date; valueCents: number }[],
  assemblyAt: Date | null = null,
  contemplationAt: Date | null = null,
  checkAssemblyAt: Date | null = null,
) {
  const repository: IAchievementsRepository = {
    listWonSales: vi.fn().mockResolvedValue(sales),
    firstPostSaleStageAt: vi
      .fn()
      .mockImplementation(async (_scope, stages: string[]) =>
        stages.includes('Em dia') ? assemblyAt : contemplationAt,
      ),
    firstChecklistItemAt: vi
      .fn()
      .mockImplementation(async (_scope, keys: string[]) =>
        keys.includes('first_installment_paid') ? checkAssemblyAt : null,
      ),
    listEffectiveQuotaDates: vi.fn().mockResolvedValue([]),
    listChecklistCheckDates: vi.fn().mockResolvedValue([]),
    firstPaymentCheckAt: vi.fn().mockResolvedValue(null),
    firstPostSaleStageMoveAt: vi.fn().mockResolvedValue(null),
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
      progress: { current: 1_100_000_00, target: 3_000_000_00, unit: 'cents' },
    })
    expect(byId.sold_500k?.progress).toEqual({
      current: 500_000_00,
      target: 500_000_00,
      unit: 'cents',
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

  it('counts the checklist "1ª parcela paga" for the first assembly, whichever comes first', async () => {
    const { useCase } = setup([], d(15), null, d(12))

    const achievements = await useCase.execute(scope)

    expect(achievements.find((a) => a.id === 'first_assembly')?.unlockedAt).toEqual(d(12))
  })
})

describe('GetMyAchievementsUseCase — Administrativo', () => {
  const days = (count: number) => Array.from({ length: count }, (_, i) => d((i % 28) + 1))

  it('has its own wall, unlocked by the back-office work of the user', async () => {
    const { repository, useCase } = setup([{ wonAt: d(1), valueCents: 900_000_00 }])
    vi.mocked(repository.listEffectiveQuotaDates).mockResolvedValue([d(2), ...days(11)])
    vi.mocked(repository.listChecklistCheckDates).mockImplementation(async (_scope, keys) =>
      keys?.includes('first_installment_paid') ? [d(7)] : keys ? [] : days(40),
    )
    vi.mocked(repository.firstPaymentCheckAt).mockResolvedValue(d(9))
    vi.mocked(repository.firstPostSaleStageMoveAt).mockResolvedValue(d(20))

    const achievements = await useCase.execute({ ...scope, role: Role.BACKOFFICE })
    const byId = Object.fromEntries(achievements.map((a) => [a.id, a]))

    expect(achievements.map((a) => a.id)).toEqual([
      'first_effective',
      'effective_10',
      'effective_50',
      'effective_100',
      'checklist_100',
      'first_payment_check',
      'assembly_followed',
      'contemplation_followed',
    ])
    expect(byId.first_effective?.unlockedAt).toEqual(d(2))
    expect(byId.effective_10?.unlockedAt).toEqual(d(9)) // 10ª cota
    expect(byId.effective_50).toMatchObject({
      unlockedAt: null,
      progress: { current: 12, target: 50, unit: 'count' },
    })
    expect(byId.checklist_100).toMatchObject({
      unlockedAt: null,
      progress: { current: 40, target: 100 },
    })
    expect(byId.first_payment_check?.unlockedAt).toEqual(d(9))
    expect(byId.assembly_followed?.unlockedAt).toEqual(d(7))
    expect(byId.contemplation_followed?.unlockedAt).toEqual(d(20))
    // As vendas não entram no Mural dele.
    expect(repository.listWonSales).not.toHaveBeenCalled()
  })
})
