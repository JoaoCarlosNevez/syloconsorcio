// Tests: GetManagementDashboardUseCase — resumo do período, saúde do pipeline,
// conversão por etapa, funil ADM, recorte (time/supervisor/vendedor) e o
// desempenho por vendedor e por supervisor.

import { AuthorizationError, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type {
  AssigneePeriodStats,
  IManagementDashboardRepository,
  OpenLeadSnapshot,
} from '../ports/management-dashboard.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import {
  type GetManagementDashboardInput,
  GetManagementDashboardUseCase,
} from './get-management-dashboard.use-case'

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
const POST = funnel('pos', 'POST_SALE', ['Em dia', 'Atrasado'])

function member(userId: string, role: Role, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@x.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
    supervisorUserId: null,
    ...overrides,
  }
}

// Carlos supervisiona Ana e Bia; Duda está sem supervisor.
const MEMBERS = [
  member('dono', Role.ADMIN),
  member('carlos', Role.MANAGER),
  member('ana', Role.SELLER, { supervisorUserId: 'carlos', salesGoalCents: 500_000_00 }),
  member('bia', Role.SELLER, { supervisorUserId: 'carlos', salesGoalCents: 300_000_00 }),
  member('duda', Role.SELLER),
]

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

function stats(
  assignedUserId: string | null,
  overrides: Partial<AssigneePeriodStats> = {},
): AssigneePeriodStats {
  return {
    assignedUserId,
    created: 0,
    wonOfCreated: 0,
    wonCount: 0,
    wonValueCents: 0,
    ...overrides,
  }
}

const STATS = [
  stats('ana', { created: 6, wonOfCreated: 2, wonCount: 3, wonValueCents: 300_000_00 }),
  stats('bia', { created: 2, wonOfCreated: 0, wonCount: 1, wonValueCents: 100_000_00 }),
  stats('duda', { created: 2, wonOfCreated: 0 }),
]

function setup(
  openLeads: OpenLeadSnapshot[],
  options: { wonInFunnel?: number; funnels?: FunnelRecord[]; stats?: AssigneePeriodStats[] } = {},
) {
  const dashboardRepository: IManagementDashboardRepository = {
    listOpenLeads: vi.fn().mockResolvedValue(openLeads),
    statsByAssignee: vi.fn().mockResolvedValue(options.stats ?? STATS),
    countPendingQueueOffers: vi.fn().mockResolvedValue(3),
    wonInFunnelByAssignee: vi
      .fn()
      .mockResolvedValue([{ assignedUserId: 'ana', count: options.wonInFunnel ?? 0 }]),
  }
  const funnelRepository = {
    listByOrganization: vi.fn().mockResolvedValue(options.funnels ?? [SALES, ADM]),
  } as unknown as IFunnelRepository
  const organizationRepository = {
    findById: vi.fn().mockResolvedValue({ name: 'Sylo', salesGoalCents: 1_000_000_00 }),
  } as unknown as IOrganizationRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn().mockResolvedValue(MEMBERS),
  } as unknown as IMembershipRepository
  const useCase = new GetManagementDashboardUseCase(
    dashboardRepository,
    funnelRepository,
    organizationRepository,
    membershipRepository,
  )
  return { useCase, dashboardRepository }
}

const OWNER: GetManagementDashboardInput = {
  organizationId: 'org-01',
  viewer: { userId: 'dono', role: Role.ADMIN },
  now: NOW,
}
const SUPERVISOR: GetManagementDashboardInput = {
  ...OWNER,
  viewer: { userId: 'carlos', role: Role.MANAGER, teamUserIds: ['ana', 'bia'] },
}

describe('GetManagementDashboardUseCase', () => {
  it('summarizes the period: new leads, sales, cohort conversion, ticket and projection', async () => {
    const { useCase } = setup([lead({}), lead({})])

    const result = await useCase.execute(OWNER)

    expect(result.scope).toEqual({ kind: 'organization', label: 'Sylo' })
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
    const { useCase, dashboardRepository } = setup([])

    const result = await useCase.execute({ ...OWNER, period: 'last_month' })

    expect(result.periodStart.toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(result.periodEnd.toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(result.summary.projectedCents).toBeNull()
    expect(dashboardRepository.statsByAssignee).toHaveBeenCalledWith(
      'org-01',
      result.periodStart,
      result.periodEnd,
    )
  })

  it('flags unassigned and stale sales leads, ignoring the ADM funnel', async () => {
    const { useCase } = setup([
      lead({ assignedUserId: null }),
      lead({ stageChangedAt: daysAgo(8) }),
      lead({ stageChangedAt: daysAgo(20) }),
      lead({ funnelId: ADM.id, stageId: 'adm-conferencia', stageChangedAt: daysAgo(30) }),
    ])

    const result = await useCase.execute(OWNER)

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
      { wonInFunnel: 2 },
    )

    const result = await useCase.execute(OWNER)
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

    const result = await useCase.execute(OWNER)

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
      sellerName: 'ana',
    })
    expect(result.backoffice?.oldest[1]?.sellerName).toBeNull()
  })

  it('charts the requested sales funnel', async () => {
    const other = funnel('outro', 'SALES', ['a'])
    const { useCase } = setup([], { funnels: [SALES, other, ADM] })

    const result = await useCase.execute({ ...OWNER, funnelId: 'outro' })

    expect(result.salesFunnel?.id).toBe('outro')
    expect(result.salesFunnels.map((f) => f.id)).toEqual(['padrao', 'outro'])
  })

  describe('recorte e desempenho', () => {
    const LEADS = [
      lead({ assignedUserId: 'ana' }),
      lead({ assignedUserId: 'bia', stageChangedAt: daysAgo(9) }),
      lead({ assignedUserId: 'duda' }),
      lead({ assignedUserId: null }),
    ]

    it('gives the owner every seller and the supervisors comparison', async () => {
      const { useCase } = setup(LEADS)

      const result = await useCase.execute(OWNER)

      expect(result.filters.supervisors).toEqual([{ userId: 'carlos', name: 'carlos' }])
      expect(result.filters.sellers.map((s) => s.userId)).toEqual(['ana', 'bia', 'duda'])
      expect(result.sellers.map((s) => s.userId)).toEqual(['ana', 'bia', 'duda'])
      expect(result.sellers[0]).toMatchObject({
        userId: 'ana',
        supervisorName: 'carlos',
        openLeads: 1,
        newLeads: 6,
        wonCount: 3,
        wonValueCents: 300_000_00,
        conversionPercent: 33.3,
        goalCents: 500_000_00,
        goalPercent: 60,
      })
      expect(result.supervisors).toEqual([
        expect.objectContaining({
          userId: 'carlos',
          teamSize: 2,
          openLeads: 2,
          wonValueCents: 400_000_00,
          goalCents: 800_000_00,
          goalPercent: 50,
          staleLeads: 1,
        }),
        expect.objectContaining({ userId: null, name: 'Sem supervisor', teamSize: 1 }),
      ])
    })

    it('limits a supervisor with a team to the team, themselves and unassigned leads', async () => {
      const { useCase } = setup(LEADS)

      const result = await useCase.execute(SUPERVISOR)

      expect(result.scope).toEqual({ kind: 'team', label: 'Meu time' })
      expect(result.summary.openLeads).toBe(3) // ana, bia e o sem responsável
      expect(result.summary.wonValueCents).toBe(400_000_00)
      expect(result.summary.goalCents).toBe(800_000_00)
      expect(result.sellers.map((s) => s.userId)).toEqual(['ana', 'bia'])
      expect(result.filters).toEqual({
        supervisors: [],
        sellers: [
          { userId: 'ana', name: 'ana' },
          { userId: 'bia', name: 'bia' },
        ],
      })
      expect(result.supervisors).toBeNull()
    })

    it('filters by seller', async () => {
      const { useCase } = setup(LEADS)

      const result = await useCase.execute({ ...SUPERVISOR, sellerUserId: 'bia' })

      expect(result.scope).toEqual({ kind: 'seller', label: 'bia' })
      expect(result.summary).toMatchObject({ openLeads: 1, wonCount: 1, goalCents: 300_000_00 })
      expect(result.health.unassigned).toBe(0)
      expect(result.sellers.map((s) => s.userId)).toEqual(['bia'])
    })

    it('does not let a supervisor see a seller outside the team', async () => {
      const { useCase } = setup(LEADS)

      await expect(useCase.execute({ ...SUPERVISOR, sellerUserId: 'duda' })).rejects.toBeInstanceOf(
        AuthorizationError,
      )
    })

    it('lets only the owner filter by supervisor', async () => {
      const { useCase } = setup(LEADS)

      const result = await useCase.execute({ ...OWNER, supervisorUserId: 'carlos' })

      expect(result.scope).toEqual({ kind: 'supervisor', label: 'Time de carlos' })
      expect(result.summary.openLeads).toBe(2)
      expect(result.sellers.map((s) => s.userId)).toEqual(['ana', 'bia'])
      expect(result.supervisors).toBeNull()
      await expect(
        useCase.execute({ ...SUPERVISOR, supervisorUserId: 'carlos' }),
      ).rejects.toBeInstanceOf(AuthorizationError)
    })
  })

  it('counts active and late quotas in the Pós-venda funnel', async () => {
    const { useCase } = setup(
      [
        lead({ funnelId: POST.id, stageId: 'pos-Em dia' }),
        lead({ funnelId: POST.id, stageId: 'pos-Atrasado' }),
        lead({ funnelId: POST.id, stageId: 'pos-Atrasado', assignedUserId: 'duda' }),
      ],
      { funnels: [SALES, ADM, POST] },
    )

    const owner = await useCase.execute(OWNER)
    expect(owner.postSale).toMatchObject({ activeCount: 3, lateCount: 2 })

    // Supervisor vê só o time (Duda é de fora).
    const supervisor = await useCase.execute(SUPERVISOR)
    expect(supervisor.postSale).toMatchObject({ activeCount: 2, lateCount: 1 })
  })
})
