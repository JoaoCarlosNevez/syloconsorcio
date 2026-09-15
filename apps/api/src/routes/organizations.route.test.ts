// Tests: organizationsRoute
//
// POST  /organizations             — só Super Admin; cria Representação + dono (ADMIN)
// GET   /organizations             — lista todas as organizações
// PATCH /organizations/:id         — edita nome
// POST  /organizations/:id/icon    — upload de ícone
// GET   /organizations/:id/members — equipe de uma organização qualquer

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  IUserRepository,
} from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'
import { buildTestPng } from '../test-utils/png'

function buildStorageProvider(): IStorageProvider {
  return {
    uploadPublicFile: vi.fn().mockResolvedValue({
      url: 'https://xvzsobntyhvxrbdfboax.supabase.co/storage/v1/object/public/organization-icons/org-uuid/icon.png',
    }),
  }
}

/** Monta um corpo multipart/form-data mínimo com um único arquivo. */
function buildMultipartUpload(filename: string, contentType: string, content: Buffer | string) {
  const boundary = '----sylocrmTestBoundary'
  const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const payload = Buffer.concat([header, contentBuffer, footer])

  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

const IDENTITY = { id: 'admin-uuid', email: 'admin@sylo.app' }
const AUTH_HEADERS = { authorization: 'Bearer valid-token' }

function buildAuthProvider(createUserResult?: { id: string; email: string }): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi
      .fn()
      .mockResolvedValue(createUserResult ?? { id: 'owner-uuid', email: 'dono@empresa.com' }),
    deleteUser: vi.fn(),
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
      branding: null,
    }),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  }
}

function buildMembershipRepository(): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(null),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
    findAllActive: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    findByUserAndOrganization: vi.fn().mockResolvedValue(null),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    removeAllForUser: vi.fn(),
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

// ── GET /organizations ──────────────────────────────────────────────────────

describe('GET /organizations', () => {
  it('returns 403 when the caller is not a platform admin', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it('lists all organizations for a platform admin', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.list = vi.fn().mockResolvedValue([
      {
        id: 'org-1',
        name: 'Representação A',
        type: 'REPRESENTACAO',
        parentOrganizationId: null,
        branding: null,
      },
    ])
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organizations: { id: string }[] }>()
    expect(body.organizations).toHaveLength(1)
  })
})

// ── GET /organizations/members ────────────────────────────────────────────────

describe('GET /organizations/members', () => {
  it('returns 403 when the caller is not a platform admin', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it('lists members across every organization for a platform admin', async () => {
    const membershipRepository = buildMembershipRepository()
    membershipRepository.findAll = vi.fn().mockResolvedValue([
      {
        userId: 'u1',
        name: 'Dono',
        email: 'dono@empresa.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        organizationId: 'org-1',
        organizationName: 'Representação A',
      },
    ])
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ members: { organizationId: string }[] }>()
    expect(body.members).toHaveLength(1)
    expect(body.members[0]?.organizationId).toBe('org-1')
  })
})

// ── POST /organizations/members ─────────────────────────────────────────────

describe('POST /organizations/members', () => {
  const validMemberPayload = {
    organizationId: 'org-uuid',
    name: 'Novo Supervisor',
    email: 'supervisor@empresa.com',
    role: 'MANAGER',
  }

  it('returns 403 when the caller is not a platform admin', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: validMemberPayload,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 400 for an invalid role', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: { ...validMemberPayload, role: 'SUPER' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the target organization does not exist', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: validMemberPayload,
    })

    expect(response.statusCode).toBe(404)
  })

  it('creates an ADMIN for an existing organization that has none yet', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: false,
      branding: null,
    })
    const membershipRepository = buildMembershipRepository()
    const app = buildApp({
      authProvider: buildAuthProvider({ id: 'new-user-uuid', email: 'novo-admin@empresa.com' }),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: { ...validMemberPayload, email: 'novo-admin@empresa.com', role: 'ADMIN' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ member: { role: string; temporaryPassword: string } }>()
    expect(body.member.role).toBe('ADMIN')
    expect(body.member.temporaryPassword).toBeTruthy()
    expect(membershipRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-uuid', role: 'ADMIN' }),
    )
  })

  it('returns 409 when the email is already registered', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: false,
      branding: null,
    })
    const authProvider = buildAuthProvider()
    authProvider.createUser = vi.fn().mockRejectedValue(new ConflictError('E-mail já cadastrado'))
    const app = buildApp({
      authProvider,
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: validMemberPayload,
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 409 when the organization already has an ADMIN', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: false,
      branding: null,
    })
    const membershipRepository = buildMembershipRepository()
    membershipRepository.findActiveByOrganizationId = vi.fn().mockResolvedValue([
      {
        userId: 'existing-admin-uuid',
        name: 'Dono Existente',
        email: 'dono@empresa.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    ])
    const app = buildApp({
      authProvider: buildAuthProvider({ id: 'new-user-uuid', email: 'segundo-admin@empresa.com' }),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/members',
      headers: AUTH_HEADERS,
      payload: { ...validMemberPayload, email: 'segundo-admin@empresa.com', role: 'ADMIN' },
    })

    expect(response.statusCode).toBe(409)
    expect(membershipRepository.create).not.toHaveBeenCalled()
  })
})

// ── PATCH /organizations/:id ─────────────────────────────────────────────────

describe('PATCH /organizations/:id', () => {
  it('returns 404 when the organization does not exist', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/does-not-exist',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Nome' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('updates the organization name for a platform admin', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.update = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Novo Nome',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      branding: null,
    })
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/org-uuid',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Nome' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { name: string } }>()
    expect(body.organization.name).toBe('Novo Nome')
  })
})

// ── POST /organizations/:id/icon ─────────────────────────────────────────────

describe('POST /organizations/:id/icon', () => {
  it('returns 404 when the organization does not exist', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
      storageProvider: buildStorageProvider(),
    })

    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', 'fake-image-bytes')
    const response = await app.inject({
      method: 'POST',
      url: '/organizations/does-not-exist/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(404)
  })

  it('uploads the icon and updates the organization branding regardless of White Label', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: false,
      branding: null,
    })
    organizationRepository.update = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: false,
      branding: { iconUrl: 'https://example.com/icon.png' },
    })
    const storageProvider = buildStorageProvider()
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
      storageProvider,
    })

    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', buildTestPng(64, 64))
    const response = await app.inject({
      method: 'POST',
      url: '/organizations/org-uuid/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(200)
    expect(storageProvider.uploadPublicFile).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'organization-icons', path: 'org-uuid/icon.png' }),
    )
    expect(organizationRepository.update).toHaveBeenCalledWith(
      'org-uuid',
      expect.objectContaining({
        branding: expect.objectContaining({ iconUrl: expect.any(String) }),
      }),
    )
  })

  it('returns 400 for an unsupported image format', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: true,
      branding: null,
    })
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
      storageProvider: buildStorageProvider(),
    })

    const { payload, headers } = buildMultipartUpload('icon.gif', 'image/gif', 'fake-image-bytes')
    const response = await app.inject({
      method: 'POST',
      url: '/organizations/org-uuid/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when the image is not square', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: true,
      branding: null,
    })
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
      storageProvider: buildStorageProvider(),
    })

    const { payload, headers } = buildMultipartUpload(
      'icon.png',
      'image/png',
      buildTestPng(600, 300),
    )
    const response = await app.inject({
      method: 'POST',
      url: '/organizations/org-uuid/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('NOT_SQUARE')
  })

  it('returns 400 when the image is larger than 2MB', async () => {
    const organizationRepository = buildOrganizationRepository()
    organizationRepository.findById = vi.fn().mockResolvedValue({
      id: 'org-uuid',
      name: 'Representação',
      type: 'REPRESENTACAO',
      parentOrganizationId: null,
      isWhiteLabel: true,
      branding: null,
    })
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository,
      membershipRepository: buildMembershipRepository(),
      storageProvider: buildStorageProvider(),
    })

    const oversizedContent = Buffer.alloc(2 * 1024 * 1024 + 1, 1)
    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', oversizedContent)
    const response = await app.inject({
      method: 'POST',
      url: '/organizations/org-uuid/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('FILE_TOO_LARGE')
  })
})

// ── GET /organizations/:id/members ───────────────────────────────────────────

describe('GET /organizations/:id/members', () => {
  it('returns 403 when the caller is not a platform admin', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/org-uuid/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it("lists any organization's team for a platform admin", async () => {
    const membershipRepository = buildMembershipRepository()
    membershipRepository.findActiveByOrganizationId = vi
      .fn()
      .mockResolvedValue([
        { userId: 'u1', name: 'Dono', email: 'dono@empresa.com', role: 'ADMIN', status: 'ACTIVE' },
      ])
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/org-uuid/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ members: unknown[] }>()
    expect(body.members).toHaveLength(1)
    expect(membershipRepository.findActiveByOrganizationId).toHaveBeenCalledWith('org-uuid')
  })
})

// ── DELETE /organizations/members/:userId ───────────────────────────────────

describe('DELETE /organizations/members/:userId', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository: buildMembershipRepository(),
    })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/members/target-user-uuid',
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
      method: 'DELETE',
      url: '/organizations/members/target-user-uuid',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 403 when the platform admin tries to delete their own account', async () => {
    const authProvider = buildAuthProvider()
    const membershipRepository = buildMembershipRepository()
    const app = buildApp({
      authProvider,
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/organizations/members/${IDENTITY.id}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('AUTHORIZATION_ERROR')
    expect(authProvider.deleteUser).not.toHaveBeenCalled()
    expect(membershipRepository.removeAllForUser).not.toHaveBeenCalled()
  })

  it('deletes the auth identity and all memberships, keeping the users row', async () => {
    const authProvider = buildAuthProvider()
    const membershipRepository = buildMembershipRepository()
    const app = buildApp({
      authProvider,
      userRepository: buildUserRepository(true),
      organizationRepository: buildOrganizationRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/members/target-user-uuid',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.removeAllForUser).toHaveBeenCalledWith('target-user-uuid')
    expect(authProvider.deleteUser).toHaveBeenCalledWith('target-user-uuid')
  })
})
