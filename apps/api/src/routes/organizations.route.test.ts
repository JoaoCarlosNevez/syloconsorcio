// Tests: organizationsRoute
//
// POST /organizations — só Super Admin; cria Representação + dono (ADMIN)

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

const IDENTITY = { id: 'admin-uuid', email: 'admin@sylo.app' }
const AUTH_HEADERS = { authorization: 'Bearer valid-token' }

function buildAuthProvider(createUserResult?: { id: string; email: string }): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi
      .fn()
      .mockResolvedValue(createUserResult ?? { id: 'owner-uuid', email: 'dono@empresa.com' }),
  }
}

function buildUserRepository(isPlatformAdmin: boolean): IUserRepository {
  return {
    findById: vi
      .fn()
      .mockResolvedValue({ id: IDENTITY.id, email: IDENTITY.email, name: null, isPlatformAdmin }),
    upsert: vi.fn().mockResolvedValue({
      id: 'owner-uuid',
      email: 'dono@empresa.com',
      name: 'Dono',
      isPlatformAdmin: false,
    }),
  }
}

function buildOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Nova Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
    }),
  }
}

function buildMembershipRepository(): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(null),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  }
}

const validPayload = {
  organizationName: 'Nova Representação',
  ownerName: 'Dono',
  ownerEmail: 'dono@empresa.com',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /organizations', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      payload: validPayload,
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when the caller is not a platform admin', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 400 when required fields are missing', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: AUTH_HEADERS,
      payload: { organizationName: 'Só o nome' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates the organization and its owner when the caller is a platform admin', async () => {
    const organizationRepository = buildOrganizationRepository()
    const membershipRepository = buildMembershipRepository()
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{
      organization: { id: string; type: string }
      owner: { email: string; temporaryPassword: string }
    }>()
    expect(body.organization.type).toBe('REPRESENTACAO')
    expect(body.owner.email).toBe('dono@empresa.com')
    expect(body.owner.temporaryPassword).toBeTruthy()
    expect(membershipRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-uuid', role: 'ADMIN' }),
    )
  })

  it('returns 409 when the owner email is already registered', async () => {
    const authProvider = buildAuthProvider()
    authProvider.createUser = vi.fn().mockRejectedValue(new ConflictError('E-mail já cadastrado'))

    const app = buildApp({
      authProvider,
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(409)
  })
})
