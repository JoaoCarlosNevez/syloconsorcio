// Tests: funnelsRoute
//
// GET    /funnels      — leitura livre pra qualquer membership ativa
// POST   /funnels      — exige organization.update (só ADMIN)
// PATCH  /funnels/:id  — exige organization.update; guardas de negócio (ver
//                        update-funnel.use-case.test.ts) retornam 400
// DELETE /funnels/:id  — exige organization.update; guardas retornam 400
//
// Usa buildApp() com todos os repositórios mockados via DI — sem banco real.

import type {
  FunnelRecord,
  IAuthProvider,
  IFunnelRepository,
  IMembershipRepository,
  IOrganizationRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'

const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
  status: 'ACTIVE',
}

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const FUNNEL_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_FUNNEL_ID = '22222222-2222-4222-8222-222222222222'
const STAGE_1_ID = '33333333-3333-4333-8333-333333333333'
const STAGE_2_ID = '44444444-4444-4444-8444-444444444444'

const SAMPLE_FUNNEL: FunnelRecord = {
  id: FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [
    { id: STAGE_1_ID, funnelId: FUNNEL_ID, name: 'Lead', color: '#94a3b8', position: 0 },
    { id: STAGE_2_ID, funnelId: FUNNEL_ID, name: 'Fechado', color: '#0ea5e9', position: 1 },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const OTHER_FUNNEL: FunnelRecord = {
  ...SAMPLE_FUNNEL,
  id: OTHER_FUNNEL_ID,
  name: 'Imobiliário',
  isDefault: false,
  duplicateToFunnelId: null,
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildMembershipRepository(
  membership: UserMembership = ADMIN_MEMBERSHIP,
): IMembershipRepository {
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

function buildOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  }
}

function buildFunnelRepository(overrides: Partial<IFunnelRepository> = {}): IFunnelRepository {
  return {
    listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL]),
    findById: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    create: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    update: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    delete: vi.fn().mockResolvedValue(true),
    countLeadsByStage: vi.fn().mockResolvedValue(0),
    countLeadsByFunnel: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function buildTestApp(options: {
  membership?: UserMembership
  funnelRepository?: IFunnelRepository
}) {
  return buildApp({
    authProvider: buildAuthProvider(),
    membershipRepository: buildMembershipRepository(options.membership),
    organizationRepository: buildOrganizationRepository(),
    funnelRepository: options.funnelRepository ?? buildFunnelRepository(),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ── GET /funnels ────────────────────────────────────────────────────────────────

describe('GET /funnels', () => {
  it('returns the funnels of the active organization for any membership', async () => {
    const funnelRepository = buildFunnelRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, funnelRepository })

    const response = await app.inject({ method: 'GET', url: '/funnels', headers: AUTH_HEADERS })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ funnels: FunnelRecord[] }>()
    expect(body.funnels).toHaveLength(1)
    expect(funnelRepository.listByOrganization).toHaveBeenCalledWith(ORG_ID)
  })
})

// ── POST /funnels ───────────────────────────────────────────────────────────────

describe('POST /funnels', () => {
  it('returns 403 for a SELLER (missing organization.update)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'POST',
      url: '/funnels',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Funil', stages: [{ name: 'Lead' }] },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 400 when no stages are provided', async () => {
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP })

    const response = await app.inject({
      method: 'POST',
      url: '/funnels',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Funil', stages: [] },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates the funnel for an ADMIN and returns 201', async () => {
    const funnelRepository = buildFunnelRepository()
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/funnels',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Funil', stages: [{ name: 'Lead', color: '#94a3b8' }] },
    })

    expect(response.statusCode).toBe(201)
    expect(funnelRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID, name: 'Novo Funil' }),
    )
  })
})

// ── PATCH /funnels/:id ────────────────────────────────────────────────────────────

describe('PATCH /funnels/:id', () => {
  it('returns 403 for a SELLER (missing organization.update)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      payload: { name: 'Renomeado' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 404 when the funnel does not belong to the organization', async () => {
    const funnelRepository = buildFunnelRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/funnels/does-not-exist',
      headers: AUTH_HEADERS,
      payload: { name: 'Renomeado' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('renames the funnel and reorders/renames stages', async () => {
    const funnelRepository = buildFunnelRepository()
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      payload: {
        name: 'Padrão Renomeado',
        stages: [
          { id: STAGE_2_ID, name: 'Fechado' },
          { id: STAGE_1_ID, name: 'Lead' },
          { name: 'Pós-venda' },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(funnelRepository.update).toHaveBeenCalledWith(
      FUNNEL_ID,
      ORG_ID,
      expect.objectContaining({ name: 'Padrão Renomeado' }),
    )
  })

  it('sets duplicateToFunnelId when it points to another existing funnel', async () => {
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) =>
        Promise.resolve(id === OTHER_FUNNEL_ID ? OTHER_FUNNEL : SAMPLE_FUNNEL),
      ),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      payload: { duplicateToFunnelId: OTHER_FUNNEL_ID },
    })

    expect(response.statusCode).toBe(200)
    expect(funnelRepository.update).toHaveBeenCalledWith(
      FUNNEL_ID,
      ORG_ID,
      expect.objectContaining({ duplicateToFunnelId: OTHER_FUNNEL_ID }),
    )
  })

  it('returns 400 when duplicateToFunnelId points to itself', async () => {
    const funnelRepository = buildFunnelRepository()
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      payload: { duplicateToFunnelId: FUNNEL_ID },
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.update).not.toHaveBeenCalled()
  })

  it('returns 400 when duplicateToFunnelId points to a funnel that does not exist', async () => {
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) => Promise.resolve(id === FUNNEL_ID ? SAMPLE_FUNNEL : null)),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      payload: { duplicateToFunnelId: OTHER_FUNNEL_ID },
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.update).not.toHaveBeenCalled()
  })

  it('returns 400 when removing a stage that still has leads', async () => {
    const funnelRepository = buildFunnelRepository({
      countLeadsByStage: vi.fn().mockResolvedValue(2),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
      // omite STAGE_2_ID da lista
      payload: { stages: [{ id: STAGE_1_ID, name: 'Lead' }] },
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.update).not.toHaveBeenCalled()
  })
})

// ── DELETE /funnels/:id ───────────────────────────────────────────────────────────

describe('DELETE /funnels/:id', () => {
  it('returns 403 for a SELLER (missing organization.update)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'DELETE',
      url: `/funnels/${OTHER_FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 400 when deleting the default funnel', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL, OTHER_FUNNEL]),
      findById: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/funnels/${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('returns 400 when deleting the only funnel of the organization', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([OTHER_FUNNEL]),
      findById: vi.fn().mockResolvedValue(OTHER_FUNNEL),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/funnels/${OTHER_FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('returns 400 when the funnel still has leads', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL, OTHER_FUNNEL]),
      findById: vi.fn().mockResolvedValue(OTHER_FUNNEL),
      countLeadsByFunnel: vi.fn().mockResolvedValue(4),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/funnels/${OTHER_FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('deletes a non-default, empty funnel and returns 204', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL, OTHER_FUNNEL]),
      findById: vi.fn().mockResolvedValue(OTHER_FUNNEL),
    })
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, funnelRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/funnels/${OTHER_FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(funnelRepository.delete).toHaveBeenCalledWith(OTHER_FUNNEL_ID, ORG_ID)
  })
})
