// Tests: authRoute
//
// Verifica os contratos das rotas de autenticação:
//   GET  /auth/me          — retorna identidade quando token válido; 401 quando ausente
//   GET  /auth/memberships — lista memberships ativas do usuário autenticado
//   GET  /auth/context     — resolve o AuthenticatedContext via tenantMiddleware
//   POST /auth/logout      — retorna 200 sempre que autenticado; tolera falha do provider
//
// Usa buildApp() com authProvider/membershipRepository mockados via DI — sem Supabase real.

import type { IAuthProvider, IMembershipRepository, IStorageProvider } from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'
import { buildTestPng } from '../test-utils/png'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }

function buildTestApp(authProvider: IAuthProvider, membershipRepository?: IMembershipRepository) {
  return buildApp({ authProvider, membershipRepository })
}

function buildStorageProvider(): IStorageProvider {
  return {
    deleteFolderFiles: vi.fn(),
    uploadPublicFile: vi.fn().mockResolvedValue({
      url: 'https://xvzsobntyhvxrbdfboax.supabase.co/storage/v1/object/public/user-avatars/user-uuid/avatar.png',
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

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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

// ── PATCH /auth/me ───────────────────────────────────────────────────────────

describe('PATCH /auth/me', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me',
      payload: { name: 'Novo Nome' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 400 for an empty payload field', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
      payload: { name: '' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('updates name, instagramHandle (stripping a leading @) and location', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const updateProfile = vi.fn().mockResolvedValue({
      id: MOCK_IDENTITY.id,
      email: MOCK_IDENTITY.email,
      name: 'Sara Sylo',
      instagramHandle: 'sara.sylo',
      location: 'São Paulo, SP',
      isPlatformAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const app = buildApp({
      authProvider: mockProvider,
      userRepository: {
        findById: vi.fn(),
        upsert: vi.fn(),
        updateProfile,
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
    })

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
      payload: { name: 'Sara Sylo', instagramHandle: '@sara.sylo', location: 'São Paulo, SP' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ name: string; instagramHandle: string; location: string }>()
    expect(body.name).toBe('Sara Sylo')
    expect(body.instagramHandle).toBe('sara.sylo')
    expect(body.location).toBe('São Paulo, SP')
    expect(updateProfile).toHaveBeenCalledWith(MOCK_IDENTITY.id, {
      name: 'Sara Sylo',
      instagramHandle: 'sara.sylo',
      location: 'São Paulo, SP',
    })
  })

  it('saves notification preferences and returns them resolved', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const preferences = {
      push: {
        'task.assigned': true,
        'task.due_soon': false,
        'task.overdue': true,
        'task.completed': false,
        'lead.received': false,
        'lead.offered': false,
        'proposal.viewed': false,
      },
      sound: false,
    }
    const updateProfile = vi.fn().mockResolvedValue({
      id: MOCK_IDENTITY.id,
      email: MOCK_IDENTITY.email,
      name: null,
      instagramHandle: null,
      location: null,
      avatarUrl: null,
      isPlatformAdmin: false,
      notificationPreferences: preferences,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const app = buildApp({
      authProvider: mockProvider,
      userRepository: {
        findById: vi.fn(),
        upsert: vi.fn(),
        updateProfile,
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
    })

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
      payload: { notificationPreferences: preferences },
    })

    expect(response.statusCode).toBe(200)
    expect(updateProfile).toHaveBeenCalledWith(MOCK_IDENTITY.id, {
      notificationPreferences: preferences,
    })
    expect(response.json<{ notificationPreferences: unknown }>().notificationPreferences).toEqual(
      preferences,
    )
  })

  it('returns 400 for incomplete notification preferences', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
      payload: { notificationPreferences: { push: { 'task.assigned': true }, sound: true } },
    })

    expect(response.statusCode).toBe(400)
  })
})

// ── POST /auth/me/avatar ─────────────────────────────────────────────────────

describe('POST /auth/me/avatar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildApp({ authProvider: mockProvider, storageProvider: buildStorageProvider() })

    const { payload, headers } = buildMultipartUpload(
      'avatar.png',
      'image/png',
      buildTestPng(64, 64),
    )
    const response = await app.inject({
      method: 'POST',
      url: '/auth/me/avatar',
      headers,
      payload,
    })

    expect(response.statusCode).toBe(401)
  })

  it('accepts a non-square image (avatars are cropped visually, not rejected)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const storageProvider = buildStorageProvider()
    const updateProfile = vi.fn().mockResolvedValue({
      id: MOCK_IDENTITY.id,
      email: MOCK_IDENTITY.email,
      name: null,
      instagramHandle: null,
      location: null,
      avatarUrl:
        'https://xvzsobntyhvxrbdfboax.supabase.co/storage/v1/object/public/user-avatars/user-uuid/avatar.png',
      isPlatformAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const app = buildApp({
      authProvider: mockProvider,
      storageProvider,
      userRepository: {
        findById: vi.fn(),
        upsert: vi.fn(),
        updateProfile,
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
    })

    const { payload, headers } = buildMultipartUpload(
      'avatar.png',
      'image/png',
      buildTestPng(600, 300),
    )
    const response = await app.inject({
      method: 'POST',
      url: '/auth/me/avatar',
      headers: { ...headers, authorization: 'Bearer valid-token' },
      payload,
    })

    expect(response.statusCode).toBe(200)
  })

  it('uploads the avatar and updates the profile', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const storageProvider = buildStorageProvider()
    const updateProfile = vi.fn().mockResolvedValue({
      id: MOCK_IDENTITY.id,
      email: MOCK_IDENTITY.email,
      name: null,
      instagramHandle: null,
      location: null,
      avatarUrl:
        'https://xvzsobntyhvxrbdfboax.supabase.co/storage/v1/object/public/user-avatars/user-uuid/avatar.png',
      isPlatformAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const app = buildApp({
      authProvider: mockProvider,
      storageProvider,
      userRepository: {
        findById: vi.fn(),
        upsert: vi.fn(),
        updateProfile,
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
    })

    const { payload, headers } = buildMultipartUpload(
      'avatar.png',
      'image/png',
      buildTestPng(64, 64),
    )
    const response = await app.inject({
      method: 'POST',
      url: '/auth/me/avatar',
      headers: { ...headers, authorization: 'Bearer valid-token' },
      payload,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ avatarUrl: string }>()
    expect(body.avatarUrl).toContain('user-avatars')
    expect(storageProvider.uploadPublicFile).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'user-avatars', path: `${MOCK_IDENTITY.id}/avatar.webp` }),
    )
    expect(storageProvider.deleteFolderFiles).toHaveBeenCalledWith({
      bucket: 'user-avatars',
      folder: MOCK_IDENTITY.id,
      keepPath: `${MOCK_IDENTITY.id}/avatar.webp`,
    })
    expect(updateProfile).toHaveBeenCalledWith(
      MOCK_IDENTITY.id,
      expect.objectContaining({ avatarUrl: expect.stringContaining('user-avatars') }),
    )
  })
})

// ── DELETE /auth/me/avatar ───────────────────────────────────────────────────

describe('DELETE /auth/me/avatar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'DELETE', url: '/auth/me/avatar' })

    expect(response.statusCode).toBe(401)
  })

  it('clears the avatar and deletes the file from the Storage', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const updateProfile = vi.fn().mockResolvedValue({
      id: MOCK_IDENTITY.id,
      email: MOCK_IDENTITY.email,
      name: null,
      instagramHandle: null,
      location: null,
      avatarUrl: null,
      isPlatformAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const storageProvider = buildStorageProvider()
    const app = buildApp({
      authProvider: mockProvider,
      userRepository: {
        findById: vi.fn(),
        upsert: vi.fn(),
        updateProfile,
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
      storageProvider,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: '/auth/me/avatar',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ avatarUrl: string | null }>()
    expect(body.avatarUrl).toBeNull()
    expect(updateProfile).toHaveBeenCalledWith(MOCK_IDENTITY.id, { avatarUrl: null })
    expect(storageProvider.deleteFolderFiles).toHaveBeenCalledWith({
      bucket: 'user-avatars',
      folder: MOCK_IDENTITY.id,
    })
  })
})

// ── GET /auth/memberships ────────────────────────────────────────────────────

describe('GET /auth/memberships', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'GET', url: '/auth/memberships' })

    expect(response.statusCode).toBe(401)
  })

  it('returns memberships with dataScope/permissions calculated', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
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

  it('includes every organization for a platform admin, synthesizing ADMIN where there is no real membership', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([
        {
          organizationId: 'org-rep-01',
          organizationType: OrganizationType.REPRESENTACAO,
          organizationName: 'Representação Um',
          organizationIconUrl: null,
          organizationSecondaryColor: null,
          tier: 'bronze',
          role: Role.SELLER,
          status: 'ACTIVE',
        },
      ]),
      findActiveByUserAndOrganization: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
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
    const app = buildApp({
      authProvider: mockProvider,
      membershipRepository: mockRepo,
      userRepository: {
        findById: vi.fn().mockResolvedValue({
          id: MOCK_IDENTITY.id,
          email: MOCK_IDENTITY.email,
          name: null,
          isPlatformAdmin: true,
        }),
        upsert: vi.fn(),
        updateProfile: vi.fn(),
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
      organizationRepository: {
        findChildOrganizationIds: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        list: vi.fn().mockResolvedValue([
          {
            id: 'org-rep-01',
            name: 'Representação Um',
            type: 'REPRESENTACAO',
            parentOrganizationId: null,
            isWhiteLabel: false,
            branding: null,
            cnpj: null,
            phone: null,
            website: null,
          },
          {
            id: 'org-rep-02',
            name: 'Representação Dois',
            type: 'REPRESENTACAO',
            parentOrganizationId: null,
            isWhiteLabel: false,
            branding: null,
            cnpj: null,
            phone: null,
            website: null,
          },
        ]),
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/auth/memberships',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ memberships: { organizationId: string; role: string }[] }>()
    expect(body.memberships).toHaveLength(2)
    const org1 = body.memberships.find((m) => m.organizationId === 'org-rep-01')
    const org2 = body.memberships.find((m) => m.organizationId === 'org-rep-02')
    // Real membership role wins for the org they actually belong to
    expect(org1?.role).toBe('SELLER')
    // No real membership — synthesized as ADMIN
    expect(org2?.role).toBe('ADMIN')
  })

  it('hides organizationIconUrl for synthesized memberships when White Label is off', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const mockRepo: IMembershipRepository = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserAndOrganization: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
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
    const app = buildApp({
      authProvider: mockProvider,
      membershipRepository: mockRepo,
      userRepository: {
        findById: vi.fn().mockResolvedValue({
          id: MOCK_IDENTITY.id,
          email: MOCK_IDENTITY.email,
          name: null,
          isPlatformAdmin: true,
        }),
        upsert: vi.fn(),
        updateProfile: vi.fn(),
        listPlatformAdmins: vi.fn().mockResolvedValue([]),
      },
      organizationRepository: {
        findChildOrganizationIds: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        list: vi.fn().mockResolvedValue([
          {
            id: 'org-formerly-white-label',
            name: 'Ex White Label',
            type: 'REPRESENTACAO',
            parentOrganizationId: null,
            // White Label desligado, mas o ícone antigo ainda está salvo em
            // branding — não deve mais aparecer (bug real que motivou este teste).
            isWhiteLabel: false,
            branding: { iconUrl: 'https://old-icon.example.com/logo.png' },
            cnpj: null,
            phone: null,
            website: null,
          },
          {
            id: 'org-white-label',
            name: 'White Label Ativo',
            type: 'REPRESENTACAO',
            parentOrganizationId: null,
            isWhiteLabel: true,
            branding: { iconUrl: 'https://active-icon.example.com/logo.png' },
            cnpj: null,
            phone: null,
            website: null,
          },
        ]),
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/auth/memberships',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{
      memberships: { organizationId: string; organizationIconUrl: string | null }[]
    }>()
    const formerlyWhiteLabel = body.memberships.find(
      (m) => m.organizationId === 'org-formerly-white-label',
    )
    const stillWhiteLabel = body.memberships.find((m) => m.organizationId === 'org-white-label')
    expect(formerlyWhiteLabel?.organizationIconUrl).toBeNull()
    expect(stillWhiteLabel?.organizationIconUrl).toBe('https://active-icon.example.com/logo.png')
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      findActiveByOrganizationId: vi.fn(),
      findAllActive: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
      createUser: vi.fn(),
      deleteUser: vi.fn(),
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
