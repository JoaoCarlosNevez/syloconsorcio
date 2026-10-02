// Tests: GetActivityRankingUseCase — ligações e visitas concluídas no período
// por Vendedor ativo, ordem pelo total.

import { Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import type { ITaskRepository, TaskCountFilter } from '../ports/task.repository'
import { GetActivityRankingUseCase } from './get-activity-ranking.use-case'

const NOW = new Date('2026-10-02T18:00:00Z')

function member(userId: string, role: Role): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
  }
}

const DONE: Record<string, { Ligação: number; Visita: number }> = {
  ana: { Ligação: 5, Visita: 1 },
  bia: { Ligação: 2, Visita: 4 },
  caio: { Ligação: 1, Visita: 0 },
}

function setup() {
  const count = vi.fn(
    async (f: TaskCountFilter) => DONE[f.assignedUserId]?.[f.type as 'Ligação' | 'Visita'] ?? 0,
  )
  const taskRepository = { count } as unknown as ITaskRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi
      .fn()
      .mockResolvedValue([
        member('ana', Role.SELLER),
        member('bia', Role.SELLER),
        member('caio', Role.SELLER),
        member('dono', Role.ADMIN),
      ]),
  } as unknown as IMembershipRepository
  const streakRepository: IStreakRepository = { listActiveDays: vi.fn().mockResolvedValue([]) }
  return {
    useCase: new GetActivityRankingUseCase(membershipRepository, taskRepository, streakRepository),
    count,
  }
}

describe('GetActivityRankingUseCase', () => {
  it('ranks sellers by calls + visits, visits breaking ties', async () => {
    const { useCase } = setup()

    const ranking = await useCase.execute({ organizationId: 'org-01', now: NOW })

    expect(ranking.sellers.map((s) => [s.userId, s.calls, s.visits, s.total])).toEqual([
      ['bia', 2, 4, 6],
      ['ana', 5, 1, 6],
      ['caio', 1, 0, 1],
    ])
  })

  it('counts completed tasks by completion date in the week by default', async () => {
    const { useCase, count } = setup()

    const ranking = await useCase.execute({ organizationId: 'org-01', now: NOW })

    expect(ranking.period).toBe('week')
    expect(count).toHaveBeenCalledWith({
      organizationId: 'org-01',
      assignedUserId: 'ana',
      type: 'Visita',
      status: 'concluida',
      completedFrom: new Date('2026-09-28T03:00:00Z'),
      completedTo: new Date('2026-10-05T03:00:00Z'),
    })
  })

  it('uses the month when asked', async () => {
    const { useCase, count } = setup()

    await useCase.execute({ organizationId: 'org-01', period: 'month', now: NOW })

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        completedFrom: new Date('2026-10-01T03:00:00Z'),
        completedTo: new Date('2026-11-01T03:00:00Z'),
      }),
    )
  })
})
