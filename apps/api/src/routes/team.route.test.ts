// Tests: teamRoute
//
// GET  /team/members — lista a equipe da organização ativa
// POST /team/members — convida Supervisor/Vendedor, respeitando a hierarquia
//                      de Role (canGrantRole)

import type {
  IAuthProvider,
  IMembershipRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
  status: 'ACTIVE',
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn().mockResolvedValue({ id: 'new-user-uuid', email: 'novo@empresa.com' }),
  }
}

function buildUserRepository(isPlatformAdmin = false): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: IDENTITY.id,
      email: IDENTITY.email,
      name: null,
      isPlatformAdmin,
    }),
    upsert: vi.fn().mockResolvedValue({
      id: 'new-user-uuid',
      email: 'novo@empresa.com',
      name: 'Novo Membro',
      isPlatformAdmin: false,
    }),
  }
}

function buildMembershipRepository(membership: UserMembership): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([membership]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([
      {
        userId: IDENTITY.id,
        name: null,
        email: IDENTITY.email,
        role: membership.role,
        status: 'ACTIVE',
      },
    ]),
    findAllActive: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    remove: vi.fn(),
  }
}

function buildTestApp(membership: UserMembership) {
  return buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /team/members', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/team/members' })

    expect(response.statusCode).toBe(401)
  })

  it('returns the active members of the organization for any role', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'GET',
      url: '/team/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ members: unknown[] }>()
    expect(body.members).toHaveLength(1)
  })
})

describe('POST /team/members', () => {
  it('returns 403 when a SELLER tries to invite (missing user.invite)', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'SELLER' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 403 when a MANAGER tries to invite another MANAGER', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'MANAGER' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('AUTHORIZATION_ERROR')
  })

  it('allows a MANAGER to invite a SELLER', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Vendedor', email: 'novo@empresa.com', role: 'SELLER' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ member: { role: string; temporaryPassword: string } }>()
    expect(body.member.role).toBe('SELLER')
    expect(body.member.temporaryPassword).toBeTruthy()
  })

  it('allows an ADMIN to invite a MANAGER', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Supervisor', email: 'supervisor@empresa.com', role: 'MANAGER' },
    })

    expect(response.statusCode).toBe(201)
  })

  it('returns 400 for an invalid role', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'ADMIN' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('DELETE /team/members/:userId', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildDeleteMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership | null,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      remove: vi.fn(),
    }
  }

  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await app.inject({ method: 'DELETE', url: `/team/members/${TARGET_ID}` })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when a SELLER tries to remove someone (missing user.remove)', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 404 when the target member does not exist', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, null),
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 403 when trying to remove yourself', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${IDENTITY.id}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('AUTHORIZATION_ERROR')
    expect(membershipRepository.remove).not.toHaveBeenCalled()
  })

  it('returns 403 when a MANAGER tries to remove an ADMIN', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      MANAGER_MEMBERSHIP,
      ADMIN_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.remove).not.toHaveBeenCalled()
  })

  it('allows a MANAGER to remove a SELLER', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      MANAGER_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.remove).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })

  it('allows an ADMIN to remove a MANAGER', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      ADMIN_MEMBERSHIP,
      MANAGER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
  })

  it('returns 403 when an ADMIN (not a platform admin) tries to remove another ADMIN', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.remove).not.toHaveBeenCalled()
  })

  it('allows a platform admin to remove another ADMIN, bypassing the hierarchy', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.remove).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })
})
