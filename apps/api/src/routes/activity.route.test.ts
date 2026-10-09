// Tests: activityRoute
//
// GET /activity — log de atividades da organização ativa; exige activity.read
// (Dono e Supervisor), paginado e filtrável por categoria.

import type {
  IActivityLogRepository,
  IAuthProvider,
  IMembershipRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const SELLER_MEMBERSHIP: UserMembership = { ...MANAGER_MEMBERSHIP, role: Role.SELLER }

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
    listPlatformAdmins: vi.fn().mockResolvedValue([]),
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
    updateRole: vi.fn(),
    findPersonalGoal: vi.fn().mockResolvedValue(null),
    updatePersonalGoal: vi.fn(),
    removeAllForUser: vi.fn(),
  }
}

function buildActivityLogRepository(): IActivityLogRepository {
  return {
    record: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'act-01',
          organizationId: ORG_ID,
          actor: { id: IDENTITY.id, name: 'Fulano', email: IDENTITY.email, avatarUrl: null },
          action: 'lead.created',
          entityType: 'lead',
          entityId: 'lead-01',
          entityLabel: 'Cliente X',
          metadata: { valueCents: 100_000_00 },
          createdAt: new Date('2026-09-25T12:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 30,
    }),
  }
}

function buildTestApp(membership: UserMembership, activityLogRepository: IActivityLogRepository) {
  return buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
    activityLogRepository,
  })
}

describe('GET /activity', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP, buildActivityLogRepository())

    const response = await app.inject({ method: 'GET', url: '/activity' })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a SELLER (missing activity.read)', async () => {
    const activityLogRepository = buildActivityLogRepository()
    const app = buildTestApp(SELLER_MEMBERSHIP, activityLogRepository)

    const response = await app.inject({ method: 'GET', url: '/activity', headers: AUTH_HEADERS })

    expect(response.statusCode).toBe(403)
    expect(activityLogRepository.list).not.toHaveBeenCalled()
  })

  it('lists the active organization events for a MANAGER, filtered by category', async () => {
    const activityLogRepository = buildActivityLogRepository()
    const app = buildTestApp(MANAGER_MEMBERSHIP, activityLogRepository)

    const response = await app.inject({
      method: 'GET',
      url: '/activity?entityType=lead&page=2&pageSize=500',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(activityLogRepository.list).toHaveBeenCalledWith(
      { organizationId: ORG_ID, entityType: 'lead' },
      2,
      100,
    )
    const body = response.json<{ items: { action: string; createdAt: string }[] }>()
    expect(body.items[0]).toEqual(
      expect.objectContaining({ action: 'lead.created', createdAt: '2026-09-25T12:00:00.000Z' }),
    )
  })

  it('returns 400 for an unknown category', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP, buildActivityLogRepository())

    const response = await app.inject({
      method: 'GET',
      url: '/activity?entityType=churrasco',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
  })
})
