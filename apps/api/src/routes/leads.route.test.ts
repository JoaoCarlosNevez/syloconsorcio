// Tests: leadsRoute
//
// Verifica os contratos das rotas de leads:
//   GET    /leads      — lista paginada, exige lead.read
//   POST   /leads      — cria na organização ativa, exige lead.create
//   GET    /leads/:id  — 404 quando fora do escopo/inexistente
//   PATCH  /leads/:id  — exige lead.update; reatribuir exige lead.assign também
//   DELETE /leads/:id  — exige lead.delete
//
// Usa buildApp() com todos os repositórios mockados via DI — sem banco real.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  LeadRecord,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const OLD_USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
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

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const SAMPLE_LEAD: LeadRecord = {
  id: 'lead-01',
  organizationId: ORG_ID,
  name: 'Fulano de Tal',
  phone: '(11) 90000-0000',
  email: null,
  segment: 'Imobiliário',
  valueCents: 35_000_000,
  quotaCount: 1,
  source: 'FACEBOOK',
  stage: 'LEAD',
  assignedUserId: null,
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildMembershipRepository(
  membership: UserMembership = SELLER_MEMBERSHIP,
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

function buildLeadRepository(overrides: Partial<ILeadRepository> = {}): ILeadRepository {
  return {
    list: vi.fn().mockResolvedValue({ items: [SAMPLE_LEAD], total: 1, page: 1, pageSize: 25 }),
    findById: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    create: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    update: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    delete: vi.fn().mockResolvedValue(true),
    recordAssignmentChange: vi.fn(),
    ...overrides,
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

function buildTestApp(options: { membership?: UserMembership; leadRepository?: ILeadRepository }) {
  return buildApp({
    authProvider: buildAuthProvider(),
    membershipRepository: buildMembershipRepository(options.membership),
    leadRepository: options.leadRepository ?? buildLeadRepository(),
    organizationRepository: buildOrganizationRepository(),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ── GET /leads ────────────────────────────────────────────────────────────────

describe('GET /leads', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp({})

    const response = await app.inject({ method: 'GET', url: '/leads' })

    expect(response.statusCode).toBe(401)
  })

  it('returns 400 when X-Organization-Id header is absent', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/leads',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns a paginated page of leads when authorized', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({ method: 'GET', url: '/leads', headers: AUTH_HEADERS })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ items: LeadRecord[]; total: number }>()
    expect(body.items).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(leadRepository.list).toHaveBeenCalled()
  })

  it('returns 400 on an invalid stage filter', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/leads?stage=NOT_A_STAGE',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
  })
})

// ── POST /leads ───────────────────────────────────────────────────────────────

describe('POST /leads', () => {
  const validPayload = {
    name: 'Nova Lead',
    phone: '(11) 91111-1111',
    segment: 'Auto',
    valueCents: 12_000_000,
    source: 'SITE',
  }

  it('returns 400 when required fields are missing', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: { name: 'Sem telefone' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates the lead in the active organization, ignoring any organizationId in the body', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, organizationId: 'some-other-org' },
    })

    expect(response.statusCode).toBe(201)
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID, name: 'Nova Lead' }),
    )
  })
})

// ── GET /leads/:id ────────────────────────────────────────────────────────────

describe('GET /leads/:id', () => {
  it('returns 404 when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads/does-not-exist',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns the lead when found within scope', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<LeadRecord>().id).toBe('lead-01')
  })
})

// ── PATCH /leads/:id ──────────────────────────────────────────────────────────

describe('PATCH /leads/:id', () => {
  it('returns 403 when a SELLER tries to reassign a lead (missing lead.assign)', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
    expect(leadRepository.update).not.toHaveBeenCalled()
  })

  it('allows a MANAGER to reassign a lead and records the assignment history', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, assignedUserId: OLD_USER_ID }),
      update: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, assignedUserId: OTHER_USER_ID }),
    })
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(200)
    expect(leadRepository.recordAssignmentChange).toHaveBeenCalledWith(
      expect.objectContaining({ fromUserId: OLD_USER_ID, toUserId: OTHER_USER_ID }),
    )
  })

  it('allows a SELLER to update non-assignment fields', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { stage: 'ATENDIMENTO' },
    })

    expect(response.statusCode).toBe(200)
  })

  it('returns 404 when updating a lead outside the scope', async () => {
    const leadRepository = buildLeadRepository({ update: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { stage: 'ATENDIMENTO' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('marks a lead as lost without requiring lead.assign', async () => {
    const update = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, lostAt: new Date() })
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { lost: true },
    })

    expect(response.statusCode).toBe(200)
    expect(update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ lost: true }),
    )
    expect(response.json<{ lostAt: string | null }>().lostAt).not.toBeNull()
  })

  it('reopens a lost lead with lost: false', async () => {
    const update = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, lostAt: null })
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { stage: 'VENDA', lost: false },
    })

    expect(response.statusCode).toBe(200)
    expect(update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ stage: 'VENDA', lost: false }),
    )
  })
})

// ── DELETE /leads/:id ─────────────────────────────────────────────────────────

describe('DELETE /leads/:id', () => {
  it('returns 403 when a SELLER attempts to delete (missing lead.delete)', async () => {
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP })

    const response = await app.inject({
      method: 'DELETE',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 204 when an ADMIN deletes an existing lead', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: ADMIN_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(leadRepository.delete).toHaveBeenCalled()
  })
})
