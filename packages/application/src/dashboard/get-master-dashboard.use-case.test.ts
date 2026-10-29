import { AuthorizationError, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type {
  GetManagementDashboardUseCase,
  ManagementDashboard,
  SellerPerformance,
} from './get-management-dashboard.use-case'
import {
  GetMasterDashboardUseCase,
  GetMasterRepresentationDashboardUseCase,
} from './get-master-dashboard.use-case'

const NOW = new Date('2026-10-15T15:00:00Z')

function seller(userId: string, wonValueCents: number, wonCount = 1): SellerPerformance {
  return {
    userId,
    name: userId,
    avatarUrl: null,
    supervisorName: null,
    openLeads: 0,
    newLeads: 0,
    wonCount,
    wonValueCents,
    conversionPercent: null,
    goalCents: null,
    goalPercent: null,
    staleLeads: 0,
  }
}

function dashboard(
  name: string,
  summary: Partial<ManagementDashboard['summary']>,
  sellers: SellerPerformance[] = [],
): ManagementDashboard {
  return {
    period: 'month',
    periodStart: new Date('2026-10-01T03:00:00Z'),
    periodEnd: new Date('2026-11-01T03:00:00Z'),
    scope: { kind: 'organization', label: name },
    filters: { supervisors: [], sellers: [] },
    summary: {
      openLeads: 0,
      newLeads: 0,
      wonCount: 0,
      wonValueCents: 0,
      conversionPercent: null,
      avgTicketCents: null,
      goalCents: null,
      projectedCents: null,
      ...summary,
    },
    health: { unassigned: 0, staleAttention: 1, staleRisk: 0, pendingQueue: 0 },
    salesFunnels: [],
    salesFunnel: null,
    backoffice: {
      id: 'adm',
      stages: [{ id: 's', name: 'S', color: '#000', count: 3, avgDaysInStage: 1, staleCount: 1 }],
      staleCount: 1,
      oldest: [],
    },
    postSale: { id: 'ps', stages: [], activeCount: 5, lateCount: 2 },
    sellers,
    supervisors: [],
  }
}

function setup(children: string[], byOrg: Record<string, ManagementDashboard>) {
  const management = {
    execute: vi.fn(async ({ organizationId }: { organizationId: string }) => {
      const result = byOrg[organizationId]
      if (!result) throw new Error(`unexpected org ${organizationId}`)
      return result
    }),
  }
  const organizationRepository = {
    findChildOrganizationIds: vi.fn().mockResolvedValue(children),
  } as unknown as IOrganizationRepository
  return {
    management,
    organizationRepository,
    useCase: new GetMasterDashboardUseCase(
      management as unknown as GetManagementDashboardUseCase,
      organizationRepository,
    ),
  }
}

describe('GetMasterDashboardUseCase', () => {
  it('compares every linked representação, best seller first, seen as the owner', async () => {
    const { useCase, management } = setup(['a', 'b'], {
      a: dashboard('Alfa', { wonValueCents: 100_000, wonCount: 1, goalCents: 200_000 }, [
        seller('ana', 100_000),
      ]),
      b: dashboard('Beta', { wonValueCents: 300_000, wonCount: 2 }, [
        seller('bia', 250_000),
        seller('bob', 50_000),
      ]),
    })

    const result = await useCase.execute({ masterOrganizationId: 'm', userId: 'u', now: NOW })

    expect(management.execute).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'a', viewer: { userId: 'u', role: Role.ADMIN } }),
    )
    expect(result.representations.map((r) => r.name)).toEqual(['Beta', 'Alfa'])
    expect(result.representations[1]?.goalPercent).toBe(50)
    expect(result.representations[0]?.backoffice).toEqual({ openCount: 3, staleCount: 1 })
    expect(result.representations[0]?.postSale).toEqual({ activeCount: 5, lateCount: 2 })
    expect(result.sellers.map((s) => [s.userId, s.representationName])).toEqual([
      ['bia', 'Beta'],
      ['ana', 'Alfa'],
      ['bob', 'Beta'],
    ])
  })

  it('adds up the network: conversion weighted by new leads, ticket = value ÷ sales', async () => {
    const { useCase } = setup(['a', 'b'], {
      a: dashboard('Alfa', {
        newLeads: 10,
        conversionPercent: 10,
        wonCount: 1,
        wonValueCents: 100_000,
        goalCents: 400_000,
      }),
      b: dashboard('Beta', {
        newLeads: 30,
        conversionPercent: 30,
        wonCount: 3,
        wonValueCents: 500_000,
        projectedCents: 900_000,
      }),
    })

    const { totals } = await useCase.execute({ masterOrganizationId: 'm', userId: 'u', now: NOW })

    expect(totals.newLeads).toBe(40)
    expect(totals.conversionPercent).toBe(25)
    expect(totals.avgTicketCents).toBe(150_000)
    expect(totals.goalCents).toBe(400_000)
    expect(totals.goalPercent).toBe(150)
    expect(totals.projectedCents).toBe(900_000)
    expect(totals.postSaleLate).toBe(4)
  })

  it('works with no representação linked yet', async () => {
    const { useCase } = setup([], {})

    const result = await useCase.execute({ masterOrganizationId: 'm', userId: 'u', now: NOW })

    expect(result.representations).toEqual([])
    expect(result.totals.conversionPercent).toBeNull()
    expect(result.totals.goalCents).toBeNull()
    expect(result.periodStart.toISOString()).toBe('2026-10-01T03:00:00.000Z')
  })
})

describe('GetMasterRepresentationDashboardUseCase', () => {
  it('opens the owner dashboard of a linked representação', async () => {
    const { management, organizationRepository } = setup(['a'], { a: dashboard('Alfa', {}) })
    const useCase = new GetMasterRepresentationDashboardUseCase(
      management as unknown as GetManagementDashboardUseCase,
      organizationRepository,
    )

    const result = await useCase.execute({
      masterOrganizationId: 'm',
      representationId: 'a',
      userId: 'u',
    })

    expect(result.scope.label).toBe('Alfa')
  })

  it('refuses a representação of another Master', async () => {
    const { management, organizationRepository } = setup(['a'], {})
    const useCase = new GetMasterRepresentationDashboardUseCase(
      management as unknown as GetManagementDashboardUseCase,
      organizationRepository,
    )

    await expect(
      useCase.execute({ masterOrganizationId: 'm', representationId: 'z', userId: 'u' }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(management.execute).not.toHaveBeenCalled()
  })
})
