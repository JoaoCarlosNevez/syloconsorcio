// Tests: organizationSettingsRoute
//
// GET   /organization       — dados da organização ativa, qualquer role
// PATCH /organization       — exige organization.update (só ADMIN)
// POST  /organization/icon  — exige organization.update E isWhiteLabel=true

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'
import { buildTestPng } from '../test-utils/png'

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

const SELLER_MEMBERSHIP: UserMembership = {
  ...ADMIN_MEMBERSHIP,
  role: Role.SELLER,
}

const SAMPLE_ORG = {
  id: ORG_ID,
  name: 'Representação Teste',
  type: 'REPRESENTACAO' as const,
  parentOrganizationId: null,
  isWhiteLabel: false,
  branding: null,
  cnpj: null,
  phone: null,
  website: null,
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
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
    removeAllForUser: vi.fn(),
  }
}

function buildOrganizationRepository(
  overrides: Partial<IOrganizationRepository> = {},
): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(SAMPLE_ORG),
    update: vi.fn().mockResolvedValue(SAMPLE_ORG),
    ...overrides,
  }
}

function buildStorageProvider(): IStorageProvider {
  return {
    uploadPublicFile: vi.fn().mockResolvedValue({
      url: 'https://xvzsobntyhvxrbdfboax.supabase.co/storage/v1/object/public/organization-icons/org-rep-01/icon.png',
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

function buildTestApp(options: {
  membership?: UserMembership
  organizationRepository?: IOrganizationRepository
  storageProvider?: IStorageProvider
}) {
  return buildApp({
    authProvider: buildAuthProvider(),
    membershipRepository: buildMembershipRepository(options.membership ?? ADMIN_MEMBERSHIP),
    organizationRepository: options.organizationRepository ?? buildOrganizationRepository(),
    storageProvider: options.storageProvider ?? buildStorageProvider(),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /organization', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp({})

    const response = await app.inject({ method: 'GET', url: '/organization' })

    expect(response.statusCode).toBe(401)
  })

  it('returns 400 when X-Organization-Id header is absent', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/organization',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns the active organization for any role', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'GET',
      url: '/organization',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { id: string } }>()
    expect(body.organization.id).toBe(ORG_ID)
  })
})

describe('PATCH /organization', () => {
  it('returns 403 when a SELLER tries to update (missing organization.update)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Nome' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('allows an ADMIN to update name, cnpj, phone and website', async () => {
    const organizationRepository = buildOrganizationRepository({
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_ORG,
        name: 'Novo Nome',
        cnpj: '12.345.678/0001-90',
        phone: '(11) 99999-0000',
        website: 'https://example.com',
      }),
    })
    const app = buildTestApp({ organizationRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: {
        name: 'Novo Nome',
        cnpj: '12.345.678/0001-90',
        phone: '(11) 99999-0000',
        website: 'https://example.com',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { name: string; cnpj: string } }>()
    expect(body.organization.name).toBe('Novo Nome')
    expect(body.organization.cnpj).toBe('12.345.678/0001-90')
    expect(organizationRepository.update).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ name: 'Novo Nome' }),
    )
  })

  it('returns 400 for an empty payload field', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: { name: '' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('allows an ADMIN to update leadSegments', async () => {
    const organizationRepository = buildOrganizationRepository({
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_ORG,
        leadSegments: ['Imobiliário', 'Auto'],
      }),
    })
    const app = buildTestApp({ organizationRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: { leadSegments: ['Imobiliário', 'Auto'] },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { leadSegments: string[] } }>()
    expect(body.organization.leadSegments).toEqual(['Imobiliário', 'Auto'])
    expect(organizationRepository.update).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ leadSegments: ['Imobiliário', 'Auto'] }),
    )
  })

  it('allows an ADMIN to update leadSources', async () => {
    const organizationRepository = buildOrganizationRepository({
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_ORG,
        leadSources: ['Facebook', 'Indicação'],
      }),
    })
    const app = buildTestApp({ organizationRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: { leadSources: ['Facebook', 'Indicação'] },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { leadSources: string[] } }>()
    expect(body.organization.leadSources).toEqual(['Facebook', 'Indicação'])
    expect(organizationRepository.update).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ leadSources: ['Facebook', 'Indicação'] }),
    )
  })

  it('allows an ADMIN to update leadTags', async () => {
    const organizationRepository = buildOrganizationRepository({
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_ORG,
        leadTags: ['Quente', 'Frio'],
      }),
    })
    const app = buildTestApp({ organizationRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organization',
      headers: AUTH_HEADERS,
      payload: { leadTags: ['Quente', 'Frio'] },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ organization: { leadTags: string[] } }>()
    expect(body.organization.leadTags).toEqual(['Quente', 'Frio'])
    expect(organizationRepository.update).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ leadTags: ['Quente', 'Frio'] }),
    )
  })
})

describe('POST /organization/icon', () => {
  it('returns 403 when a SELLER tries to upload (missing organization.update)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', 'fake-image-bytes')
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 403 when the organization is not White Label — even for an ADMIN', async () => {
    const organizationRepository = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_ORG, isWhiteLabel: false }),
    })
    const app = buildTestApp({ organizationRepository })

    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', 'fake-image-bytes')
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('NOT_WHITE_LABEL')
  })

  it('uploads the icon when the ADMIN organization is White Label', async () => {
    const organizationRepository = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_ORG, isWhiteLabel: true }),
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_ORG,
        isWhiteLabel: true,
        branding: { iconUrl: 'https://example.com/icon.png' },
      }),
    })
    const storageProvider = buildStorageProvider()
    const app = buildTestApp({ organizationRepository, storageProvider })

    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', buildTestPng(64, 64))
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(200)
    expect(storageProvider.uploadPublicFile).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'organization-icons', path: `${ORG_ID}/icon.webp` }),
    )
  })

  it('returns 400 for an unsupported image format', async () => {
    const organizationRepository = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_ORG, isWhiteLabel: true }),
    })
    const app = buildTestApp({ organizationRepository })

    const { payload, headers } = buildMultipartUpload('icon.gif', 'image/gif', 'fake-image-bytes')
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when the image is not square', async () => {
    const organizationRepository = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_ORG, isWhiteLabel: true }),
    })
    const app = buildTestApp({ organizationRepository })

    const { payload, headers } = buildMultipartUpload(
      'icon.png',
      'image/png',
      buildTestPng(600, 300),
    )
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('NOT_SQUARE')
  })

  it('returns 400 when the image is larger than 2MB', async () => {
    const organizationRepository = buildOrganizationRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_ORG, isWhiteLabel: true }),
    })
    const app = buildTestApp({ organizationRepository })

    const oversizedContent = Buffer.alloc(2 * 1024 * 1024 + 1, 1)
    const { payload, headers } = buildMultipartUpload('icon.png', 'image/png', oversizedContent)
    const response = await app.inject({
      method: 'POST',
      url: '/organization/icon',
      headers: { ...AUTH_HEADERS, ...headers },
      payload,
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('FILE_TOO_LARGE')
  })
})
