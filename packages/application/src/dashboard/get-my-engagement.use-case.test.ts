// Tests: GetMyEngagementUseCase — últimos 30 dias vs os 30 anteriores.

import { describe, expect, it, vi } from 'vitest'
import type { IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import { GetMyEngagementUseCase } from './get-my-engagement.use-case'

const NOW = new Date('2026-10-21T15:00:00Z')

describe('GetMyEngagementUseCase', () => {
  it('counts the last 30 days and the 30 before them', async () => {
    const engagementRepository: IEngagementRepository = {
      countLeadsWorked: vi.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(8),
      proposalStats: vi.fn().mockResolvedValue({ created: 6, shared: 4, opened: 3 }),
    }
    const leadRepository = {
      countWonInDefaultFunnel: vi.fn().mockResolvedValue(2),
      sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(300_000_00),
    } as unknown as ILeadRepository
    const useCase = new GetMyEngagementUseCase(engagementRepository, leadRepository)

    const result = await useCase.execute({ organizationId: 'org-01', userId: 'ana', now: NOW })

    expect(result).toMatchObject({
      leadsWorked: 12,
      leadsWorkedPrevious: 8,
      proposalsCreated: 6,
      proposalsShared: 4,
      proposalsOpened: 3,
      wonCount: 2,
      wonValueCents: 300_000_00,
    })
    expect(result.periodStart.toISOString()).toBe('2026-09-21T15:00:00.000Z')
    expect(engagementRepository.countLeadsWorked).toHaveBeenLastCalledWith({
      organizationId: 'org-01',
      userId: 'ana',
      from: new Date('2026-08-22T15:00:00Z'),
      to: result.periodStart,
    })
    expect(leadRepository.countWonInDefaultFunnel).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: 'ana', wonFrom: result.periodStart, wonTo: NOW }),
    )
  })
})
