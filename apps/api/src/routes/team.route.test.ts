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

function buildUserRepository(): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
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
