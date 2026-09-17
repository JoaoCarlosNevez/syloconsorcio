// Tests: tenantMiddleware
//
// Verifica os contratos de autorização multi-tenant definidos no ADR-06:
//   - 401 quando authIdentity não está presente (authMiddleware não rodou)
//   - 400 quando X-Organization-Id ausente
//   - 403 quando membership não encontrada
//   - 403 quando membership inativa/suspensa
//   - authContext preenchido corretamente quando membership válida
//   - DataScope e Permissions calculados conforme ADR-05
//   - availableMemberships inclui todas as orgs ativas do usuário
//
// Usa Fastify inject() — sem binding de porta real.
// O membershipRepository é mockado via DI — sem dependência do banco.

import type {
  AuthIdentity,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { DataScope, OrganizationType, Permission, Role } from '@sylocrm/domain'
import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthErrorCode } from '../auth/errors'
import { createTenantMiddleware } from './tenant.middleware'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDENTITY: AuthIdentity = { id: 'user-uuid', email: 'user@empresa.com' }

const ACTIVE_REPRESENTACAO_SELLER: UserMembership = {
  organizationId: 'org-rep-01',
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
  status: 'ACTIVE',
}

const ACTIVE_REPRESENTACAO_ADMIN: UserMembership = {
  organizationId: 'org-rep-01',
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const ACTIVE_MASTER: UserMembership = {
  organizationId: 'org-master-01',
  organizationType: OrganizationType.MASTER,
  organizationName: 'Master Teste',
  organizationIconUrl: null,
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const SUSPENDED_MEMBERSHIP: UserMembership = {
  organizationId: 'org-rep-01',
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
  status: 'SUSPENDED',
}

// ── Test app builder ───────────────────────────────────────────────────────────

/** Por padrão, não é Super Admin — não afeta os testes que já existiam. */
function buildUserRepository(isPlatformAdmin = false): IUserRepository {
  return {
    findById: vi
      .fn()
      .mockResolvedValue({ id: IDENTITY.id, email: IDENTITY.email, name: null, isPlatformAdmin }),
    upsert: vi.fn(),
    updateProfile: vi.fn(),
  }
}

function buildOrganizationRepository(
  overrides: Partial<IOrganizationRepository> = {},
): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
    ...overrides,
  }
}

function buildTestApp(
  mockRepo: IMembershipRepository,
  /** Pre-set authIdentity on every request (simulates authMiddleware having run). */
  identity: AuthIdentity | undefined = IDENTITY,
  userRepo: IUserRepository = buildUserRepository(),
  organizationRepo: IOrganizationRepository = buildOrganizationRepository(),
) {
  const app = Fastify({ logger: false })

  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  const tenantMiddleware = createTenantMiddleware(mockRepo, userRepo, organizationRepo)

  // Simulate authMiddleware by setting authIdentity before preHandler
  app.addHook('preHandler', async (request) => {
    request.authIdentity = identity
  })

  app.get('/business', { preHandler: [tenantMiddleware] }, async (request) => {
    return request.authContext
  })

  return app
}

/** App where authMiddleware did NOT run (authIdentity stays undefined). */
function buildTestAppWithoutAuth(mockRepo: IMembershipRepository) {
  const app = Fastify({ logger: false })

  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  const tenantMiddleware = createTenantMiddleware(
    mockRepo,
    buildUserRepository(),
    buildOrganizationRepository(),
  )

  app.get('/business', { preHandler: [tenantMiddleware] }, async (request) => {
    return request.authContext
  })

  return app
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('tenantMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when authIdentity is not set (authMiddleware did not run)', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn(),
      findActiveByUserAndOrganization: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestAppWithoutAuth(mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
    expect(mockRepo.findActiveByUserAndOrganization).not.toHaveBeenCalled()
  })

  it('returns 400 when X-Organization-Id header is absent', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn(),
      findActiveByUserAndOrganization: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    const response = await app.inject({ method: 'GET', url: '/business' })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TENANT_HEADER_MISSING)
    expect(mockRepo.findActiveByUserAndOrganization).not.toHaveBeenCalled()
  })

  it('returns 403 when user has no membership in the requested organization', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-unknown' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.MEMBERSHIP_NOT_FOUND)
  })

  it('returns 403 for a platform admin when the requested organization does not exist', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(
      mockRepo,
      IDENTITY,
      buildUserRepository(true),
      buildOrganizationRepository(),
    )

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-unknown' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.MEMBERSHIP_NOT_FOUND)
  })

  it('synthesizes an ADMIN membership for a platform admin with no real membership in an existing organization', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const organizationRepo = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({
        id: 'org-rep-01',
        name: 'Representação Teste',
        type: OrganizationType.REPRESENTACAO,
        parentOrganizationId: null,
        isWhiteLabel: false,
        branding: null,
        cnpj: null,
        phone: null,
        website: null,
      }),
    })
    const app = buildTestApp(mockRepo, IDENTITY, buildUserRepository(true), organizationRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(200)
    const ctx = response.json<{ currentMembership: { role: string; organizationId: string } }>()
    expect(ctx.currentMembership.role).toBe('ADMIN')
    expect(ctx.currentMembership.organizationId).toBe('org-rep-01')
  })

  it('uses the real membership role for a platform admin who is also a real member', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_SELLER]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo, IDENTITY, buildUserRepository(true))

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(200)
    const ctx = response.json<{ currentMembership: { role: string } }>()
    expect(ctx.currentMembership.role).toBe('SELLER')
  })

  it('returns 403 when membership exists but is suspended', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(SUSPENDED_MEMBERSHIP),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.MEMBERSHIP_INACTIVE)
  })

  it('injects authContext when membership is valid', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_SELLER]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(response.statusCode).toBe(200)
    const ctx = response.json<{
      identityId: string
      currentMembership: { organizationId: string; role: string; dataScope: string }
    }>()
    expect(ctx.identityId).toBe(IDENTITY.id)
    expect(ctx.currentMembership.organizationId).toBe('org-rep-01')
    expect(ctx.currentMembership.role).toBe(Role.SELLER)
  })

  it('calls repository with correct userId and organizationId', async () => {
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_SELLER]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    expect(mockRepo.findActiveByUserAndOrganization).toHaveBeenCalledWith(IDENTITY.id, 'org-rep-01')
    expect(mockRepo.findActiveByUserId).toHaveBeenCalledWith(IDENTITY.id)
  })

  describe('DataScope calculation', () => {
    it('assigns DataScope.OWN to SELLER in REPRESENTACAO', async () => {
      const mockRepo: IMembershipRepository = {
        findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_SELLER]),
        findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
        findActiveByOrganizationId: vi.fn(),
        findAllActive: vi.fn(),
        create: vi.fn(),
        findByUserAndOrganization: vi.fn().mockResolvedValue(null),
        findByOrganizationId: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        deactivate: vi.fn(),
        reactivate: vi.fn(),
        removeAllForUser: vi.fn(),
      }
      const app = buildTestApp(mockRepo)

      const response = await app.inject({
        method: 'GET',
        url: '/business',
        headers: { 'x-organization-id': 'org-rep-01' },
      })

      const ctx = response.json<{ currentMembership: { dataScope: string } }>()
      expect(ctx.currentMembership.dataScope).toBe(DataScope.OWN)
    })

    it('assigns DataScope.REPRESENTATION to ADMIN in REPRESENTACAO', async () => {
      const mockRepo: IMembershipRepository = {
        findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_ADMIN]),
        findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_ADMIN),
        findActiveByOrganizationId: vi.fn(),
        findAllActive: vi.fn(),
        create: vi.fn(),
        findByUserAndOrganization: vi.fn().mockResolvedValue(null),
        findByOrganizationId: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        deactivate: vi.fn(),
        reactivate: vi.fn(),
        removeAllForUser: vi.fn(),
      }
      const app = buildTestApp(mockRepo)

      const response = await app.inject({
        method: 'GET',
        url: '/business',
        headers: { 'x-organization-id': 'org-rep-01' },
      })

      const ctx = response.json<{ currentMembership: { dataScope: string } }>()
      expect(ctx.currentMembership.dataScope).toBe(DataScope.REPRESENTATION)
    })

    it('assigns DataScope.MASTER to any role in MASTER organization', async () => {
      const mockRepo: IMembershipRepository = {
        findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_MASTER]),
        findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_MASTER),
        findActiveByOrganizationId: vi.fn(),
        findAllActive: vi.fn(),
        create: vi.fn(),
        findByUserAndOrganization: vi.fn().mockResolvedValue(null),
        findByOrganizationId: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        deactivate: vi.fn(),
        reactivate: vi.fn(),
        removeAllForUser: vi.fn(),
      }
      const app = buildTestApp(mockRepo)

      const response = await app.inject({
        method: 'GET',
        url: '/business',
        headers: { 'x-organization-id': 'org-master-01' },
      })

      const ctx = response.json<{ currentMembership: { dataScope: string } }>()
      expect(ctx.currentMembership.dataScope).toBe(DataScope.MASTER)
    })
  })

  describe('Permissions calculation', () => {
    it('grants only LEAD_READ/CREATE/UPDATE to SELLER', async () => {
      const mockRepo: IMembershipRepository = {
        findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_SELLER]),
        findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
        findActiveByOrganizationId: vi.fn(),
        findAllActive: vi.fn(),
        create: vi.fn(),
        findByUserAndOrganization: vi.fn().mockResolvedValue(null),
        findByOrganizationId: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        deactivate: vi.fn(),
        reactivate: vi.fn(),
        removeAllForUser: vi.fn(),
      }
      const app = buildTestApp(mockRepo)

      const response = await app.inject({
        method: 'GET',
        url: '/business',
        headers: { 'x-organization-id': 'org-rep-01' },
      })

      const ctx = response.json<{ currentMembership: { permissions: string[] } }>()
      expect(ctx.currentMembership.permissions).toContain(Permission.LEAD_READ)
      expect(ctx.currentMembership.permissions).toContain(Permission.LEAD_CREATE)
      expect(ctx.currentMembership.permissions).toContain(Permission.LEAD_UPDATE)
      expect(ctx.currentMembership.permissions).not.toContain(Permission.LEAD_DELETE)
      expect(ctx.currentMembership.permissions).not.toContain(Permission.REPORTS_READ)
    })

    it('grants REPORTS_READ to ADMIN but not to SELLER', async () => {
      const mockRepo: IMembershipRepository = {
        findActiveByUserId: vi.fn().mockResolvedValue([ACTIVE_REPRESENTACAO_ADMIN]),
        findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_ADMIN),
        findActiveByOrganizationId: vi.fn(),
        findAllActive: vi.fn(),
        create: vi.fn(),
        findByUserAndOrganization: vi.fn().mockResolvedValue(null),
        findByOrganizationId: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        deactivate: vi.fn(),
        reactivate: vi.fn(),
        removeAllForUser: vi.fn(),
      }
      const app = buildTestApp(mockRepo)

      const response = await app.inject({
        method: 'GET',
        url: '/business',
        headers: { 'x-organization-id': 'org-rep-01' },
      })

      const ctx = response.json<{ currentMembership: { permissions: string[] } }>()
      expect(ctx.currentMembership.permissions).toContain(Permission.REPORTS_READ)
    })
  })

  it('exposes all available memberships in authContext', async () => {
    const allMemberships = [ACTIVE_REPRESENTACAO_SELLER, ACTIVE_MASTER]
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue(allMemberships),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(ACTIVE_REPRESENTACAO_SELLER),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      removeAllForUser: vi.fn(),
    }
    const app = buildTestApp(mockRepo)

    const response = await app.inject({
      method: 'GET',
      url: '/business',
      headers: { 'x-organization-id': 'org-rep-01' },
    })

    const ctx = response.json<{ availableMemberships: { organizationId: string }[] }>()
    expect(ctx.availableMemberships).toHaveLength(2)
    const orgIds = ctx.availableMemberships.map((m) => m.organizationId)
    expect(orgIds).toContain('org-rep-01')
    expect(orgIds).toContain('org-master-01')
  })
})
