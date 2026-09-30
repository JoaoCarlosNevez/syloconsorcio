// Tests: GetMyMonthlyStatsUseCase — cards do início (agendamentos, visitas
// realizadas, valor ganho e tíquete médio) do próprio usuário no mês.

import { describe, expect, it, vi } from 'vitest'
import type { ILeadRepository } from '../ports/lead.repository'
import type { ITaskRepository, TaskCountFilter } from '../ports/task.repository'
import { GetMyMonthlyStatsUseCase } from './get-my-monthly-stats.use-case'

const ORG_ID = 'org-01'
const USER_ID = 'user-01'
// 29/09/2026 15:00 em Brasília → mês de setembro.
const NOW = new Date('2026-09-29T18:00:00Z')
const SEPT_START = new Date('2026-09-01T03:00:00Z')
const OCT_START = new Date('2026-10-01T03:00:00Z')

function build(options: { scheduled: number; completed: number; wonCents: number; won: number }) {
  const taskRepository = {
    count: vi
      .fn()
      .mockImplementation((filter: TaskCountFilter) =>
        Promise.resolve(filter.status === 'concluida' ? options.completed : options.scheduled),
      ),
  } as unknown as ITaskRepository
  const leadRepository = {
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(options.wonCents),
    countWonInDefaultFunnel: vi.fn().mockResolvedValue(options.won),
  } as unknown as ILeadRepository
  return {
    taskRepository,
    leadRepository,
    useCase: new GetMyMonthlyStatsUseCase(taskRepository, leadRepository),
  }
}

describe('GetMyMonthlyStatsUseCase', () => {
  it('counts the user’s meetings due this month and the completed ones', async () => {
    const { useCase, taskRepository } = build({ scheduled: 8, completed: 5, wonCents: 0, won: 0 })

    const stats = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID, now: NOW })

    expect(stats.meetingsScheduled).toBe(8)
    expect(stats.meetingsCompleted).toBe(5)
    const expected = {
      organizationId: ORG_ID,
      assignedUserId: USER_ID,
      type: 'Reunião',
      dueFrom: SEPT_START,
      dueTo: OCT_START,
    }
    expect(taskRepository.count).toHaveBeenCalledWith(expected)
    expect(taskRepository.count).toHaveBeenCalledWith({ ...expected, status: 'concluida' })
  })

  it('returns the won total and the average ticket for the user this month', async () => {
    const { useCase, leadRepository } = build({
      scheduled: 0,
      completed: 0,
      wonCents: 500_000_00,
      won: 3,
    })

    const stats = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID, now: NOW })

    expect(stats.wonTotalCents).toBe(500_000_00)
    expect(stats.wonCount).toBe(3)
    expect(stats.averageTicketCents).toBe(Math.round(500_000_00 / 3))
    expect(leadRepository.countWonInDefaultFunnel).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      assignedUserId: USER_ID,
      wonFrom: SEPT_START,
      wonTo: OCT_START,
    })
  })

  it('has no average ticket when nothing was won', async () => {
    const { useCase } = build({ scheduled: 0, completed: 0, wonCents: 0, won: 0 })

    const stats = await useCase.execute({ organizationId: ORG_ID, userId: USER_ID, now: NOW })

    expect(stats.averageTicketCents).toBeNull()
  })
})
