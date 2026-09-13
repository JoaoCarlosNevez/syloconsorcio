// Tests: authRoute
//
// Verifica os contratos das rotas de autenticação:
//   GET  /auth/me          — retorna identidade quando token válido; 401 quando ausente
//   GET  /auth/memberships — lista memberships ativas do usuário autenticado
//   GET  /auth/context     — resolve o AuthenticatedContext via tenantMiddleware
//   POST /auth/logout      — retorna 200 sempre que autenticado; tolera falha do provider
//
// Usa buildApp() com authProvider/membershipRepository mockados via DI — sem Supabase real.

import type { IAuthProvider, IMembershipRepository } from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }

function buildTestApp(authProvider: IAuthProvider, membershipRepository?: IMembershipRepository) {
  return buildApp({ authProvider, membershipRepository })
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'GET', url: '/auth/me' })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
  })

  it('returns 401 when token is invalid (provider returns null)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_INVALID)
  })

  it('returns user identity when token is valid', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ id: string; email: string }>()
    expect(body.id).toBe(MOCK_IDENTITY.id)
    expect(body.email).toBe(MOCK_IDENTITY.email)
  })

  it('calls verifyToken with the raw token (without "Bearer " prefix)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer my-jwt-token' },
    })

    expect(mockProvider.verifyToken).toHaveBeenCalledWith('my-jwt-token')
  })
})

// ── GET /auth/memberships ────────────────────────────────────────────────────

describe('GET /auth/memberships', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = { verifyToken: vi.fn(), signOut: vi.fn() }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'GET', url: '/auth/memberships' })

    expect(response.statusCode).toBe(401)
  })

  it('returns memberships with dataScope/permissions calculated', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([
        {
          organizationId: 'org-rep-01',
          organizationType: OrganizationType.REPRESENTACAO,
          role: Role.SELLER,
          status: 'ACTIVE',
        },
      ]),
      findActiveByUserAndOrganization: vi.fn(),
    }
    const app = buildTestApp(mockProvider, mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/memberships',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ memberships: { organizationId: string; dataScope: string }[] }>()
    expect(body.memberships).toHaveLength(1)
    expect(body.memberships[0]?.organizationId).toBe('org-rep-01')
    expect(mockRepo.findActiveByUserId).toHaveBeenCalledWith(MOCK_IDENTITY.id)
  })
})

// ── GET /auth/context ─────────────────────────────────────────────────────────

describe('GET /auth/context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when X-Organization-Id header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/context',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TENANT_HEADER_MISSING)
  })

  it('returns the resolved authContext when membership is valid', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const membership = {
      organizationId: 'org-rep-01',
      organizationType: OrganizationType.REPRESENTACAO,
      role: Role.ADMIN,
      status: 'ACTIVE' as const,
    }
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([membership]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership),
    }
    const app = buildTestApp(mockProvider, mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/context',
      headers: { authorization: 'Bearer valid-token', 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ currentMembership: { organizationId: string; role: string } }>()
    expect(body.currentMembership.organizationId).toBe('org-rep-01')
    expect(body.currentMembership.role).toBe(Role.ADMIN)
  })
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'POST', url: '/auth/logout' })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
    expect(mockProvider.signOut).not.toHaveBeenCalled()
  })

  it('returns 200 and calls signOut when token is valid', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ message: string }>()
    expect(body.message).toBeTruthy()
    expect(mockProvider.signOut).toHaveBeenCalledWith('valid-token')
  })

  it('returns 200 even when signOut throws (graceful degradation)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn().mockRejectedValue(new Error('Supabase unreachable')),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer valid-token' },
    })

    // Server-side signOut failure must not break the client logout flow
    expect(response.statusCode).toBe(200)
  })

  it('returns 401 when token is invalid (provider returns null)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer bad-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(mockProvider.signOut).not.toHaveBeenCalled()
  })
})
