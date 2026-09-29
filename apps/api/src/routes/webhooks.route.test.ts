// Tests: webhooksRoute — POST /webhooks/leads
//
// Autenticado por chave de API (X-Api-Key ou Authorization: Bearer), sem
// usuário logado. A organização vem da chave.

import type {
  ApiKeyRecord,
  FunnelRecord,
  IApiKeyRepository,
  IFunnelRepository,
  ILeadRepository,
  LeadRecord,
} from '@sylocrm/application'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { hashApiKey } from '../lib/api-keys'

const ORG_ID = 'org-rep-01'
const VALID_KEY = 'sylo_chave-valida-de-teste'

const API_KEY: ApiKeyRecord = {
  id: 'key-01',
  organizationId: ORG_ID,
  name: 'Landing page',
  keyPrefix: 'sylo_chave-va',
  createdBy: null,
  lastUsedAt: null,
  createdAt: new Date('2026-09-29T12:00:00Z'),
}

const FUNNEL: FunnelRecord = {
  id: 'funnel-01',
  organizationId: ORG_ID,
  name: 'Vendas',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [{ id: 'stage-01', funnelId: 'funnel-01', name: 'Lead', color: '#000', position: 0 }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const LEAD: LeadRecord = {
  id: 'lead-01',
  organizationId: ORG_ID,
  name: 'Fulano',
  phone: '(11) 91111-1111',
  email: null,
  segment: 'Imobiliário',
  valueCents: 150_000_00,
  quotaCount: 1,
  source: 'Landing page',
  funnelId: 'funnel-01',
  stageId: 'stage-01',
  assignedUserId: null,
  stageChangedAt: new Date('2026-09-29T12:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: [],
  notes: null,
  profession: null,
  incomeCents: null,
  maritalStatus: null,
  cpf: null,
  createdAt: new Date('2026-09-29T12:00:00Z'),
  updatedAt: new Date('2026-09-29T12:00:00Z'),
}

function buildApiKeyRepository(): IApiKeyRepository {
  return {
    create: vi.fn(),
    listActiveByOrganization: vi.fn(),
    revoke: vi.fn(),
    findActiveByHash: vi.fn(async (hash: string) =>
      hash === hashApiKey(VALID_KEY) ? API_KEY : null,
    ),
    markUsed: vi.fn(),
  }
}

function buildLeadRepository(overrides: Partial<ILeadRepository> = {}): ILeadRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(LEAD),
    update: vi.fn(),
    delete: vi.fn(),
    recordAssignmentChange: vi.fn(),
    listAssignmentHistory: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
    sumWonValueCentsInDefaultFunnel: vi.fn(),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function buildFunnelRepository(): IFunnelRepository {
  return {
    listByOrganization: vi.fn().mockResolvedValue([FUNNEL]),
    findById: vi.fn().mockResolvedValue(FUNNEL),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLeadsByStage: vi.fn(),
    countLeadsByFunnel: vi.fn(),
  }
}

function buildTestApp(
  apiKeyRepository = buildApiKeyRepository(),
  leadRepository = buildLeadRepository(),
) {
  return buildApp({ apiKeyRepository, leadRepository, funnelRepository: buildFunnelRepository() })
}

const PAYLOAD = {
  name: 'Fulano',
  phone: '(11) 91111-1111',
  value: 150000,
  source: 'Landing page',
}

describe('POST /webhooks/leads', () => {
  it('returns 401 without an API key', async () => {
    const response = await buildTestApp().inject({
      method: 'POST',
      url: '/webhooks/leads',
      payload: PAYLOAD,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json<{ code: string }>().code).toBe('INVALID_API_KEY')
  })

  it('returns 401 for an unknown or revoked key', async () => {
    const response = await buildTestApp().inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { 'x-api-key': 'sylo_outra-chave' },
      payload: PAYLOAD,
    })

    expect(response.statusCode).toBe(401)
  })

  it("creates the lead in the key's organization, converting the value to cents", async () => {
    const apiKeyRepository = buildApiKeyRepository()
    const leadRepository = buildLeadRepository()
    const app = buildTestApp(apiKeyRepository, leadRepository)

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { 'x-api-key': VALID_KEY },
      payload: { ...PAYLOAD, value: 1234.567 },
    })

    expect(response.statusCode).toBe(201)
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        funnelId: 'funnel-01',
        valueCents: 123457,
        source: 'Landing page',
      }),
    )
    expect(apiKeyRepository.markUsed).toHaveBeenCalledWith('key-01', expect.any(Date))
    expect(response.json<{ lead: { id: string } }>().lead.id).toBe('lead-01')
  })

  it('accepts the key as a Bearer token', async () => {
    const response = await buildTestApp().inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { authorization: `Bearer ${VALID_KEY}` },
      payload: PAYLOAD,
    })

    expect(response.statusCode).toBe(201)
  })

  it('returns 409 with the existing lead when the phone is already registered', async () => {
    const leadRepository = buildLeadRepository({ findByPhone: vi.fn().mockResolvedValue(LEAD) })

    const response = await buildTestApp(undefined, leadRepository).inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { 'x-api-key': VALID_KEY },
      payload: PAYLOAD,
    })

    expect(response.statusCode).toBe(409)
    const body = response.json<{ code: string; lead: { id: string } }>()
    expect(body.code).toBe('LEAD_ALREADY_EXISTS')
    expect(body.lead.id).toBe('lead-01')
    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('returns 400 with field details for invalid data', async () => {
    const response = await buildTestApp().inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { 'x-api-key': VALID_KEY },
      payload: { name: '', phone: '123', email: 'nao-e-email' },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ details: Record<string, string[]> }>()
    expect(Object.keys(body.details).sort()).toEqual(['email', 'name', 'phone'])
  })

  it('returns 400 when the assignee e-mail is not a member', async () => {
    const response = await buildTestApp().inject({
      method: 'POST',
      url: '/webhooks/leads',
      headers: { 'x-api-key': VALID_KEY },
      payload: { ...PAYLOAD, assignedUserEmail: 'ninguem@empresa.com' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json<{ details: Record<string, string[]> }>().details).toHaveProperty(
      'assignedUserEmail',
    )
  })
})
