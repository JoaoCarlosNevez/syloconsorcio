// Tests: dashboardRoute
//
// GET /dashboard/me/monthly — números do mês de quem está logado (qualquer
// papel).

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  ITaskRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.SELLER,
  status: 'ACTIVE',
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildUserRepository(): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: IDENTITY.id,
      email: IDENTITY.email,
      name: null,
      isPlatformAdmin: false,
    }),
    upsert: vi.fn(),
    updateProfile: vi.fn(),
  }
}

function buildMembershipRepository(membership: UserMembership): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([membership]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
    findAllActive: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    findByUserAndOrganization: vi.fn().mockResolvedValue(null),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    updateSalesGoal: vi.fn(),
    updateTier: vi.fn(),
    findPersonalGoal: vi.fn().mockResolvedValue(null),
    updatePersonalGoal: vi.fn(),
    removeAllForUser: vi.fn(),
  }
}

function buildTestApp(membership: UserMembership) {
  const taskRepository = {
    count: vi.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(4),
  } as unknown as ITaskRepository
  const leadRepository = {
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(300_000_00),
    countWonInDefaultFunnel: vi.fn().mockResolvedValue(2),
  } as unknown as ILeadRepository
  const streakRepository = {
    listActiveDays: vi.fn().mockResolvedValue(['2026-01-01', '2026-01-02']),
  }
  const app = buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
    taskRepository,
    leadRepository,
    streakRepository,
  })
  return { app, taskRepository, leadRepository, streakRepository }
}

describe('GET /dashboard/me/monthly', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const { app } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/dashboard/me/monthly' })

    expect(response.statusCode).toBe(401)
  })

  it('returns the logged-in seller’s monthly numbers', async () => {
    const { app, taskRepository } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'GET',
      url: '/dashboard/me/monthly',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      meetingsScheduled: 6,
      meetingsCompleted: 4,
      wonTotalCents: 300_000_00,
      wonCount: 2,
      averageTicketCents: 150_000_00,
    })
    expect(taskRepository.count).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID, assignedUserId: IDENTITY.id }),
    )
  })
})

describe('GET /dashboard/me/streak', () => {
  it("returns the logged-in user's streak", async () => {
    const { app, streakRepository } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'GET',
      url: '/dashboard/me/streak',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(streakRepository.listActiveDays).toHaveBeenCalledWith(IDENTITY.id)
    const body = response.json<{ record: number; week: unknown[] }>()
    expect(body.record).toBe(2)
    expect(body.week).toHaveLength(7)
  })

  it('returns 401 without a token', async () => {
    const { app } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/dashboard/me/streak' })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /dashboard/ranking', () => {
  it('is open to sellers and returns the month ranking', async () => {
    const { app } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'GET',
      url: '/dashboard/ranking',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ sellers: unknown[]; organization: { achievedCents: number } }>()
    expect(body.sellers).toEqual([])
    expect(body.organization.achievedCents).toBe(300_000_00)
  })

  it('returns 401 without a token', async () => {
    const { app } = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/dashboard/ranking' })

    expect(response.statusCode).toBe(401)
  })
})
