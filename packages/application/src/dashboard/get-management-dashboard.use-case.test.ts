// Tests: GetManagementDashboardUseCase — resumo do período, saúde do pipeline,
// conversão por etapa e o funil ADM.

import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type {
  IManagementDashboardRepository,
  OpenLeadSnapshot,
} from '../ports/management-dashboard.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { GetManagementDashboardUseCase } from './get-management-dashboard.use-case'

// 15/10/2026 12:00 em Brasília.
const NOW = new Date('2026-10-15T15:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY)

function funnel(id: string, kind: 'SALES' | 'BACKOFFICE', stages: string[], isDefault = false) {
  return {
    id,
    organizationId: 'org-01',
    name: kind === 'BACKOFFICE' ? 'ADM' : id,
    isDefault,
    duplicateToFunnelId: null,
    kind,
    stages: stages.map((name, position) => ({
      id: `${id}-${name}`,
      funnelId: id,
      name,
      color: '#000',
      position,
    })),
    createdAt: NOW,
    updatedAt: NOW,
  } satisfies FunnelRecord
}

const SALES = funnel('padrao', 'SALES', ['lead', 'proposta', 'fechado'], true)
const ADM = funnel('adm', 'BACKOFFICE', ['conferencia', 'digitado'])

function lead(overrides: Partial<OpenLeadSnapshot>): OpenLeadSnapshot {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Cliente',
    funnelId: SALES.id,
    stageId: 'padrao-lead',
    assignedUserId: 'ana',
    valueCents: 100_000_00,
    stageChangedAt: daysAgo(1),
    ...overrides,
  }
}

function setup(
  openLeads: OpenLeadSnapshot[],
  wonInFunnel = 0,
  funnels: FunnelRecord[] = [SALES, ADM],
) {
  const dashboardRepository: IManagementDashboardRepository = {
    listOpenLeads: vi.fn().mockResolvedValue(openLeads),
    countCreatedInSalesFunnels: vi.fn().mockResolvedValue({ created: 10, wonOfCreated: 2 }),
    countPendingQueueOffers: vi.fn().mockResolvedValue(3),
    countWonInFunnel: vi.fn().mockResolvedValue(wonInFunnel),
  }
  const funnelRepository = {
    listByOrganization: vi.fn().mockResolvedValue(funnels),
  } as unknown as IFunnelRepository
  const leadRepository = {
    countWonInDefaultFunnel: vi.fn().mockResolvedValue(4),
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(400_000_00),
  } as unknown as ILeadRepository
  const organizationRepository = {
    findById: vi.fn().mockResolvedValue({ salesGoalCents: 1_000_000_00 }),
  } as unknown as IOrganizationRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi
      .fn()
      .mockResolvedValue([{ userId: 'ana', name: 'Ana', email: 'ana@x.com' }]),
  } as unknown as IMembershipRepository
  const useCase = new GetManagementDashboardUseCase(
    dashboardRepository,
    funnelRepository,
    leadRepository,
    organizationRepository,
    membershipRepository,
  )
  return { useCase, dashboardRepository, leadRepository }
}

describe('GetManagementDashboardUseCase', () => {
  it('summarizes the period: new leads, sales, cohort conversion, ticket and projection', async () => {
    const { useCase } = setup([lead({}), lead({})])

    const result = await useCase.execute({ organizationId: 'org-01', now: NOW })

    expect(result.summary).toEqual({
      openLeads: 2,
      newLeads: 10,
      wonCount: 4,
      wonValueCents: 400_000_00,
      conversionPercent: 20,
      avgTicketCents: 100_000_00,
      goalCents: 1_000_000_00,
      // 400 mil em ~14,5 de 31 dias → ~855 mil no fim do mês.
      projectedCents: expect.any(Number),
    })
    expect(result.summary.projectedCents).toBeGreaterThan(800_000_00)
    expect(result.summary.projectedCents).toBeLessThan(900_000_00)
  })

  it('uses the previous month for last_month, without projection', async () => {
    const { useCase, leadRepository } = setup([])

    const result = await useCase.execute({
      organizationId: 'org-01',
      period: 'last_month',
      now: NOW,
    })

    expect(result.periodStart.toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(result.periodEnd.toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(result.summary.projectedCents).toBeNull()
    expect(leadRepository.countWonInDefaultFunnel).toHaveBeenCalledWith(
      expect.objectContaining({ wonFrom: result.periodStart, wonTo: result.periodEnd }),
    )
  })

  it('flags unassigned and stale sales leads, ignoring the ADM funnel', async () => {
    const { useCase } = setup([
      lead({ assignedUserId: null }),
      lead({ stageChangedAt: daysAgo(8) }),
      lead({ stageChangedAt: daysAgo(20) }),
      lead({ funnelId: ADM.id, stageId: 'adm-conferencia', stageChangedAt: daysAgo(30) }),
    ])

    const result = await useCase.execute({ organizationId: 'org-01', now: NOW })

    expect(result.health).toEqual({
      unassigned: 1,
      staleAttention: 2,
      staleRisk: 1,
      pendingQueue: 3,
    })
    expect(result.summary.openLeads).toBe(3)
  })

  it('computes count, value, time in stage and conversion per stage', async () => {
    const { useCase } = setup(
      [
        lead({ stageId: 'padrao-lead', stageChangedAt: daysAgo(2) }),
        lead({ stageId: 'padrao-lead', stageChangedAt: daysAgo(4) }),
        lead({ stageId: 'padrao-proposta', valueCents: 50_000_00 }),
        lead({ stageId: 'padrao-fechado' }),
      ],
      2,
    )

    const result = await useCase.execute({ organizationId: 'org-01', now: NOW })
    const [first, second, last] = result.salesFunnel?.stages ?? []

    // alcançou: lead 2+1+1+2 = 6, proposta 1+1+2 = 4, fechado 1+2 = 3, ganho 2.
    expect(first).toMatchObject({ count: 2, avgDaysInStage: 3, conversionPercent: 66.7 })
    expect(second).toMatchObject({ count: 1, valueCents: 50_000_00, conversionPercent: 75 })
    expect(last).toMatchObject({ count: 1, conversionPercent: 66.7 })
    expect(result.salesFunnel?.wonCount).toBe(2)
  })

  it('shows the ADM funnel with stale cards and the oldest ones first', async () => {
    const { useCase } = setup([
      lead({
        funnelId: ADM.id,
        stageId: 'adm-conferencia',
        name: 'Novo',
        stageChangedAt: daysAgo(1),
      }),
      lead({
        funnelId: ADM.id,
        stageId: 'adm-conferencia',
        name: 'Velho',
        stageChangedAt: daysAgo(5),
      }),
      lead({
        funnelId: ADM.id,
        stageId: 'adm-digitado',
        assignedUserId: null,
        stageChangedAt: daysAgo(3),
      }),
    ])

    const result = await useCase.execute({ organizationId: 'org-01', now: NOW })

    expect(result.backoffice?.stages.map((s) => [s.count, s.staleCount])).toEqual([
      [2, 1],
      [1, 1],
    ])
    expect(result.backoffice?.staleCount).toBe(2)
    expect(result.backoffice?.oldest[0]).toEqual({
      leadId: expect.any(String),
      name: 'Velho',
      stageName: 'conferencia',
      daysInStage: 5,
      sellerName: 'Ana',
    })
    expect(result.backoffice?.oldest[1]?.sellerName).toBeNull()
  })

  it('charts the requested sales funnel', async () => {
    const other = funnel('outro', 'SALES', ['a'])
    const { useCase } = setup([], 0, [SALES, other, ADM])

    const result = await useCase.execute({ organizationId: 'org-01', funnelId: 'outro', now: NOW })

    expect(result.salesFunnel?.id).toBe('outro')
    expect(result.salesFunnels.map((f) => f.id)).toEqual(['padrao', 'outro'])
  })
})
