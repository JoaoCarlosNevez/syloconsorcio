// Tests: leadsRoute
//
// Verifica os contratos das rotas de leads:
//   GET    /leads              — lista paginada, exige lead.read
//   POST   /leads              — cria na organização ativa, exige lead.create
//   GET    /leads/:id          — 404 quando fora do escopo/inexistente
//   GET    /leads/:id/history  — histórico combinado (atribuição + comentários)
//   POST   /leads/:id/comments — cria comentário
//   PATCH  /leads/:id          — exige lead.update; reatribuir exige lead.assign também
//   DELETE /leads/:id          — exige lead.delete
//
// Usa buildApp() com todos os repositórios mockados via DI — sem banco real.

import type {
  IAuthProvider,
  IFunnelRepository,
  ILeadProposalRepository,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  LeadCommentRecord,
  LeadProposalRecord,
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

const FUNNEL_ID = '33333333-3333-4333-8333-333333333333'
const LEAD_STAGE_ID = '44444444-4444-4444-8444-444444444444'
const ATENDIMENTO_STAGE_ID = '55555555-5555-4555-8555-555555555555'
const FECHADO_STAGE_ID = '66666666-6666-4666-8666-666666666666'
const TARGET_FUNNEL_ID = '77777777-7777-4777-8777-777777777777'
const TARGET_STAGE_ID = '88888888-8888-4888-8888-888888888888'

const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.SELLER,
  status: 'ACTIVE',
}

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
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
  funnelId: FUNNEL_ID,
  stageId: LEAD_STAGE_ID,
  assignedUserId: null,
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: [],
  notes: null,
  profession: null,
  incomeCents: null,
  maritalStatus: null,
  cpf: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const SAMPLE_COMMENT: LeadCommentRecord = {
  id: 'comment-01',
  leadId: 'lead-01',
  userId: IDENTITY.id,
  text: 'Cliente confirmou interesse.',
  createdAt: new Date('2026-01-02T00:00:00Z'),
}

const SAMPLE_PROPOSAL: LeadProposalRecord = {
  id: 'proposal-01',
  leadId: 'lead-01',
  downPaymentCents: 5_000_00,
  termMonths: 24,
  createdAt: new Date('2026-01-05T00:00:00Z'),
}

const SAMPLE_FUNNEL = {
  id: FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [
    { id: LEAD_STAGE_ID, funnelId: FUNNEL_ID, name: 'Lead', color: '#94a3b8', position: 0 },
    {
      id: ATENDIMENTO_STAGE_ID,
      funnelId: FUNNEL_ID,
      name: 'Em Atendimento',
      color: '#f59e0b',
      position: 1,
    },
    { id: FECHADO_STAGE_ID, funnelId: FUNNEL_ID, name: 'Fechado', color: '#0ea5e9', position: 2 },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const TARGET_FUNNEL = {
  id: TARGET_FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Instalação',
  isDefault: false,
  duplicateToFunnelId: null,
  stages: [
    { id: TARGET_STAGE_ID, funnelId: TARGET_FUNNEL_ID, name: 'Novo', color: '#000', position: 0 },
  ],
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
    updateSalesGoal: vi.fn(),
    updateTier: vi.fn(),
    findPersonalGoal: vi.fn().mockResolvedValue(null),
    updatePersonalGoal: vi.fn(),
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
    listAssignmentHistory: vi.fn().mockResolvedValue([]),
    listComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue(SAMPLE_COMMENT),
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(0),
    findByPhone: vi.fn().mockResolvedValue(null),
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

function buildLeadProposalRepository(
  overrides: Partial<ILeadProposalRepository> = {},
): ILeadProposalRepository {
  return {
    listByLead: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(SAMPLE_PROPOSAL),
    ...overrides,
  }
}

function buildTestApp(options: {
  membership?: UserMembership
  leadRepository?: ILeadRepository
  funnelRepository?: IFunnelRepository
  leadProposalRepository?: ILeadProposalRepository
}) {
  return buildApp({
    authProvider: buildAuthProvider(),
    membershipRepository: buildMembershipRepository(options.membership),
    leadRepository: options.leadRepository ?? buildLeadRepository(),
    organizationRepository: buildOrganizationRepository(),
    funnelRepository: options.funnelRepository ?? buildFunnelRepository(),
    leadProposalRepository: options.leadProposalRepository ?? buildLeadProposalRepository(),
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

  it('returns 400 on an invalid stageId filter', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/leads?stageId=not-a-uuid',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
  })

  it('filters by funnelId when provided', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: `/leads?funnelId=${FUNNEL_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(leadRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ funnelId: FUNNEL_ID }),
      expect.anything(),
      expect.anything(),
    )
  })

  it('returns 403 when a SELLER requests outcome=perdido (missing lead.manage_lost)', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads?outcome=perdido',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(leadRepository.list).not.toHaveBeenCalled()
  })

  it('allows a MANAGER to request outcome=perdido', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads?outcome=perdido',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(leadRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'perdido' }),
      expect.anything(),
      expect.anything(),
    )
  })

  it('allows a SELLER to request outcome=ganho', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads?outcome=ganho',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
  })

  it('parses the comma-separated tags filter and passes it through', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads?tags=Quente,Frio',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(leadRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['Quente', 'Frio'] }),
      expect.anything(),
      expect.anything(),
    )
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
    funnelId: FUNNEL_ID,
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
      expect.objectContaining({
        organizationId: ORG_ID,
        name: 'Nova Lead',
        stageId: LEAD_STAGE_ID,
      }),
    )
  })

  it('returns 400 when the funnel does not exist', async () => {
    const funnelRepository = buildFunnelRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ funnelRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when a lead with the same phone already exists in the organization', async () => {
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(400)
    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('forces assignedUserId to the creator for a SELLER (missing lead.assign), ignoring any value sent', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(201)
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: IDENTITY.id }),
    )
  })

  it('allows a MANAGER (has lead.assign) to assign the lead to someone else', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(201)
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: OTHER_USER_ID }),
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

// ── GET /leads/:id/history ──────────────────────────────────────────────────────

describe('GET /leads/:id/history', () => {
  it('returns 404 when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads/does-not-exist/history',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns combined assignment history and comments for a lead in scope', async () => {
    const leadRepository = buildLeadRepository({
      listAssignmentHistory: vi.fn().mockResolvedValue([
        {
          id: 'hist-01',
          leadId: 'lead-01',
          fromUserId: null,
          toUserId: OTHER_USER_ID,
          changedByUserId: IDENTITY.id,
          changedAt: new Date('2026-01-03T00:00:00Z'),
        },
      ]),
      listComments: vi.fn().mockResolvedValue([SAMPLE_COMMENT]),
    })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads/lead-01/history',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ assignmentHistory: unknown[]; comments: unknown[] }>()
    expect(body.assignmentHistory).toHaveLength(1)
    expect(body.comments).toHaveLength(1)
  })
})

// ── POST /leads/:id/comments ─────────────────────────────────────────────────────

describe('POST /leads/:id/comments', () => {
  it('returns 400 when text is empty', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/comments',
      headers: AUTH_HEADERS,
      payload: { text: '' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/does-not-exist/comments',
      headers: AUTH_HEADERS,
      payload: { text: 'Cliente confirmou interesse.' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('creates the comment authored by the caller and returns 201', async () => {
    const leadRepository = buildLeadRepository()
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/comments',
      headers: AUTH_HEADERS,
      payload: { text: 'Cliente confirmou interesse.' },
    })

    expect(response.statusCode).toBe(201)
    expect(leadRepository.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-01',
        userId: IDENTITY.id,
        text: 'Cliente confirmou interesse.',
      }),
    )
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
      payload: { stageId: ATENDIMENTO_STAGE_ID },
    })

    expect(response.statusCode).toBe(200)
  })

  it('returns 400 when changing the phone to one already used by another lead', async () => {
    const update = vi.fn()
    const leadRepository = buildLeadRepository({
      update,
      findByPhone: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, id: 'lead-other' }),
    })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { phone: '(11) 92222-2222' },
    })

    expect(response.statusCode).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('returns 404 when updating a lead outside the scope', async () => {
    const leadRepository = buildLeadRepository({ update: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { stageId: ATENDIMENTO_STAGE_ID },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when marking as won from any stage other than the last one', async () => {
    const update = vi.fn()
    // SAMPLE_LEAD.stageId is LEAD_STAGE_ID (position 0), not FECHADO_STAGE_ID (last, position 2)
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { won: true },
    })

    expect(response.statusCode).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('allows marking as won when the lead is at the last stage of its funnel', async () => {
    const findById = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: FECHADO_STAGE_ID })
    const update = vi
      .fn()
      .mockResolvedValue({ ...SAMPLE_LEAD, stageId: FECHADO_STAGE_ID, wonAt: new Date() })
    const leadRepository = buildLeadRepository({ findById, update })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { won: true },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ wonAt: string | null }>().wonAt).not.toBeNull()
  })

  it('auto-duplicates the lead into duplicateToFunnelId when marking it as won', async () => {
    const findById = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: FECHADO_STAGE_ID })
    const update = vi
      .fn()
      .mockResolvedValue({ ...SAMPLE_LEAD, stageId: FECHADO_STAGE_ID, wonAt: new Date() })
    const create = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, id: 'lead-02' })
    const leadRepository = buildLeadRepository({ findById, update, create })
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) =>
        Promise.resolve(
          id === TARGET_FUNNEL_ID
            ? TARGET_FUNNEL
            : { ...SAMPLE_FUNNEL, duplicateToFunnelId: TARGET_FUNNEL_ID },
        ),
      ),
    })
    const app = buildTestApp({ leadRepository, funnelRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { won: true },
    })

    expect(response.statusCode).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ funnelId: TARGET_FUNNEL_ID, stageId: TARGET_STAGE_ID }),
    )
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

  it('returns 403 when a SELLER tries to reopen a lost lead (missing lead.manage_lost)', async () => {
    const update = vi.fn()
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { lost: false },
    })

    expect(response.statusCode).toBe(403)
    expect(update).not.toHaveBeenCalled()
  })

  it('allows a MANAGER to reopen a lost lead with lost: false', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ ...SAMPLE_LEAD, stageId: ATENDIMENTO_STAGE_ID, lostAt: null })
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { stageId: ATENDIMENTO_STAGE_ID, lost: false },
    })

    expect(response.statusCode).toBe(200)
    expect(update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ stageId: ATENDIMENTO_STAGE_ID, lost: false }),
    )
  })

  it('allows a SELLER to mark a lead as lost (lost: true, no extra permission needed)', async () => {
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
  })

  it('allows a SELLER to update tags (no extra permission needed)', async () => {
    const update = vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, tags: ['Quente'] })
    const leadRepository = buildLeadRepository({ update })
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, leadRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: '/leads/lead-01',
      headers: AUTH_HEADERS,
      payload: { tags: ['Quente'] },
    })

    expect(response.statusCode).toBe(200)
    expect(update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ tags: ['Quente'] }),
    )
  })
})

// ── POST /leads/:id/duplicate ───────────────────────────────────────────────────

describe('POST /leads/:id/duplicate', () => {
  it('returns 400 when targetFunnelId is not a valid uuid', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/duplicate',
      headers: AUTH_HEADERS,
      payload: { targetFunnelId: 'not-a-uuid' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the source lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/does-not-exist/duplicate',
      headers: AUTH_HEADERS,
      payload: { targetFunnelId: TARGET_FUNNEL_ID },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when the target funnel does not exist', async () => {
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) => Promise.resolve(id === FUNNEL_ID ? SAMPLE_FUNNEL : null)),
    })
    const app = buildTestApp({ funnelRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/duplicate',
      headers: AUTH_HEADERS,
      payload: { targetFunnelId: TARGET_FUNNEL_ID },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates a copy of the lead in the first stage of the target funnel and returns 201', async () => {
    const create = vi.fn().mockResolvedValue({
      ...SAMPLE_LEAD,
      id: 'lead-02',
      funnelId: TARGET_FUNNEL_ID,
      stageId: TARGET_STAGE_ID,
    })
    const leadRepository = buildLeadRepository({ create })
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) =>
        Promise.resolve(id === TARGET_FUNNEL_ID ? TARGET_FUNNEL : SAMPLE_FUNNEL),
      ),
    })
    const app = buildTestApp({ leadRepository, funnelRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/duplicate',
      headers: AUTH_HEADERS,
      payload: { targetFunnelId: TARGET_FUNNEL_ID },
    })

    expect(response.statusCode).toBe(201)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SAMPLE_LEAD.name,
        funnelId: TARGET_FUNNEL_ID,
        stageId: TARGET_STAGE_ID,
      }),
    )
  })
})

// ── GET /leads/:id/proposals ────────────────────────────────────────────────

describe('GET /leads/:id/proposals', () => {
  it('returns 404 when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads/does-not-exist/proposals',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns the proposals for a lead in scope', async () => {
    const leadProposalRepository = buildLeadProposalRepository({
      listByLead: vi.fn().mockResolvedValue([SAMPLE_PROPOSAL]),
    })
    const app = buildTestApp({ leadProposalRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/leads/lead-01/proposals',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ proposals: LeadProposalRecord[] }>()
    expect(body.proposals).toHaveLength(1)
    expect(leadProposalRepository.listByLead).toHaveBeenCalledWith('lead-01')
  })
})

// ── POST /leads/:id/proposals ───────────────────────────────────────────────

describe('POST /leads/:id/proposals', () => {
  it('returns 400 when required fields are missing', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/proposals',
      headers: AUTH_HEADERS,
      payload: { downPaymentCents: 5_000_00 },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/does-not-exist/proposals',
      headers: AUTH_HEADERS,
      payload: { downPaymentCents: 5_000_00, termMonths: 24 },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when the down payment is not smaller than the lead value', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/proposals',
      headers: AUTH_HEADERS,
      payload: { downPaymentCents: SAMPLE_LEAD.valueCents, termMonths: 24 },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates the proposal and returns 201', async () => {
    const leadProposalRepository = buildLeadProposalRepository()
    const app = buildTestApp({ leadProposalRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-01/proposals',
      headers: AUTH_HEADERS,
      payload: { downPaymentCents: 5_000_00, termMonths: 24 },
    })

    expect(response.statusCode).toBe(201)
    expect(leadProposalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-01', downPaymentCents: 5_000_00, termMonths: 24 }),
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
