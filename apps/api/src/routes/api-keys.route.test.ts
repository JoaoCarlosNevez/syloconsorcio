// Tests: apiKeysRoute — Configurações > Integrações
//
// GET/POST /organization/api-keys e DELETE /organization/api-keys/:id; todas
// exigem integration.manage (só Dono).

import type {
  ApiKeyRecord,
  IActivityLogRepository,
  IApiKeyRepository,
  IAuthProvider,
  IMembershipRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { hashApiKey } from '../lib/api-keys'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const MANAGER_MEMBERSHIP: UserMembership = { ...ADMIN_MEMBERSHIP, role: Role.MANAGER }

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

const KEY_ID = '9b2f4c1e-7d3a-4f5b-8c6d-1e2f3a4b5c6d'

const API_KEY: ApiKeyRecord = {
  id: KEY_ID,
  organizationId: ORG_ID,
  name: 'Landing page',
  keyPrefix: 'sylo_abcdefgh',
  createdBy: { id: IDENTITY.id, name: 'Dono', email: IDENTITY.email },
  lastUsedAt: null,
  createdAt: new Date('2026-09-29T12:00:00Z'),
}

function buildApiKeyRepository(overrides: Partial<IApiKeyRepository> = {}): IApiKeyRepository {
  return {
    create: vi.fn().mockResolvedValue(API_KEY),
    listActiveByOrganization: vi.fn().mockResolvedValue([API_KEY]),
    revoke: vi.fn().mockResolvedValue(true),
    findActiveByHash: vi.fn(),
    markUsed: vi.fn(),
    ...overrides,
  }
}

function buildActivityLogRepository(): IActivityLogRepository {
  return { record: vi.fn(), list: vi.fn() }
}

function buildTestApp(
  membership: UserMembership,
  apiKeyRepository: IApiKeyRepository,
  activityLogRepository: IActivityLogRepository = buildActivityLogRepository(),
) {
  return buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
    apiKeyRepository,
    activityLogRepository,
  })
}

describe('/organization/api-keys', () => {
  it('returns 403 for a MANAGER (missing integration.manage)', async () => {
    const apiKeyRepository = buildApiKeyRepository()
    const app = buildTestApp(MANAGER_MEMBERSHIP, apiKeyRepository)

    const response = await app.inject({
      method: 'GET',
      url: '/organization/api-keys',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(apiKeyRepository.listActiveByOrganization).not.toHaveBeenCalled()
  })

  it('lists the active keys of the organization without the secret', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP, buildApiKeyRepository())

    const response = await app.inject({
      method: 'GET',
      url: '/organization/api-keys',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ items: Record<string, unknown>[] }>()
    expect(body.items[0]).toEqual(
      expect.objectContaining({ name: 'Landing page', keyPrefix: 'sylo_abcdefgh' }),
    )
    expect(body.items[0]).not.toHaveProperty('key')
    expect(body.items[0]).not.toHaveProperty('keyHash')
  })

  it('creates a key, stores only its hash and returns the full key once', async () => {
    const apiKeyRepository = buildApiKeyRepository()
    const activityLogRepository = buildActivityLogRepository()
    const app = buildTestApp(ADMIN_MEMBERSHIP, apiKeyRepository, activityLogRepository)

    const response = await app.inject({
      method: 'POST',
      url: '/organization/api-keys',
      headers: AUTH_HEADERS,
      payload: { name: '  Landing page  ' },
    })

    expect(response.statusCode).toBe(201)
    const { key } = response.json<{ key: string }>()
    expect(key).toMatch(/^sylo_[A-Za-z0-9_-]{43}$/)
    expect(apiKeyRepository.create).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: 'Landing page',
      keyPrefix: key.slice(0, 13),
      keyHash: hashApiKey(key),
      createdByUserId: IDENTITY.id,
    })
    expect(activityLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'organization.api_key_created',
        entityLabel: 'Landing page',
      }),
    )
  })

  it('returns 400 for a key without name', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP, buildApiKeyRepository())

    const response = await app.inject({
      method: 'POST',
      url: '/organization/api-keys',
      headers: AUTH_HEADERS,
      payload: { name: '   ' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('revokes a key of the organization and logs it', async () => {
    const apiKeyRepository = buildApiKeyRepository()
    const activityLogRepository = buildActivityLogRepository()
    const app = buildTestApp(ADMIN_MEMBERSHIP, apiKeyRepository, activityLogRepository)

    const response = await app.inject({
      method: 'DELETE',
      url: `/organization/api-keys/${KEY_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(apiKeyRepository.revoke).toHaveBeenCalledWith(KEY_ID, ORG_ID)
    expect(activityLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'organization.api_key_revoked' }),
    )
  })

  it('returns 404 when revoking a key from another organization', async () => {
    const apiKeyRepository = buildApiKeyRepository({
      listActiveByOrganization: vi.fn().mockResolvedValue([]),
    })
    const app = buildTestApp(ADMIN_MEMBERSHIP, apiKeyRepository)

    const response = await app.inject({
      method: 'DELETE',
      url: `/organization/api-keys/${KEY_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
    expect(apiKeyRepository.revoke).not.toHaveBeenCalled()
  })
})
