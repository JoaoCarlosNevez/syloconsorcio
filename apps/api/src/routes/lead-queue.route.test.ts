// Tests: leadQueueRoute — configuração da fila (só quem tem
// lead_queue.manage) e aceite/recusa das ofertas pelo vendedor.

import type {
  IAuthProvider,
  ILeadQueueRepository,
  ILeadRepository,
  IMembershipRepository,
  LeadOfferRecord,
  LeadRecord,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { HmacPushActionTokens } from '../lib/push-action-tokens'

const IDENTITY = { id: 'user-uuid', email: 'vendedor@empresa.com' }
const ORG_ID = 'org-rep-01'
const OFFER_ID = '6f1c2b8e-4a7d-4c1e-9f3a-2b5d8e7c1a90'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

function membership(role: Role): UserMembership {
  return {
    organizationId: ORG_ID,
    organizationType: OrganizationType.REPRESENTACAO,
    organizationName: 'Representação Teste',
    organizationIconUrl: null,
    organizationSecondaryColor: null,
    tier: 'bronze',
    role,
    status: 'ACTIVE',
  }
}

const OFFER: LeadOfferRecord = {
  id: OFFER_ID,
  organizationId: ORG_ID,
  leadId: 'lead-01',
  userId: IDENTITY.id,
  status: 'pending',
  offeredAt: new Date(Date.now() - 60_000),
  expiresAt: new Date(Date.now() + 4 * 60_000),
  respondedAt: null,
}

const LEAD = {
  id: 'lead-01',
  organizationId: ORG_ID,
  name: 'Fulano',
  funnelId: 'funnel-01',
  assignedUserId: null,
  lostAt: null,
  lostReason: null,
  wonAt: null,
} as LeadRecord

function buildLeadQueueRepository(
  overrides: Partial<ILeadQueueRepository> = {},
): ILeadQueueRepository {
  return {
    getSettings: vi.fn().mockResolvedValue({
      organizationId: ORG_ID,
      enabled: true,
      timeoutMinutes: 5,
      memberUserIds: [IDENTITY.id],
    }),
    saveSettings: vi.fn(async (settings) => settings),
    listQueue: vi.fn().mockResolvedValue([]),
    markOffered: vi.fn(),
    listOfferedUserIds: vi.fn().mockResolvedValue([]),
    createOffer: vi.fn(),
    findOffer: vi.fn().mockResolvedValue(OFFER),
    resolveOffer: vi.fn().mockResolvedValue({ ...OFFER, status: 'accepted' }),
    claimExpiredOffers: vi.fn().mockResolvedValue([]),
    listPendingOffers: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

function buildTestApp(
  role: Role,
  leadQueueRepository = buildLeadQueueRepository(),
  pushActionTokens: HmacPushActionTokens | null = null,
) {
  const authProvider: IAuthProvider = {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
  const membershipRepository = {
    findActiveByUserId: vi.fn().mockResolvedValue([membership(role)]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership(role)),
    findTeamUserIds: vi.fn().mockResolvedValue([]),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([
      {
        userId: IDENTITY.id,
        name: 'Vendedor',
        email: IDENTITY.email,
        avatarUrl: null,
        role: Role.SELLER,
        status: 'ACTIVE',
        salesGoalCents: null,
        tier: 'bronze',
        supervisorUserId: null,
      },
    ]),
  } as unknown as IMembershipRepository
  const leadRepository = {
    findById: vi.fn().mockResolvedValue(LEAD),
    update: vi.fn().mockResolvedValue({ ...LEAD, assignedUserId: IDENTITY.id }),
    recordAssignmentChange: vi.fn(),
  } as unknown as ILeadRepository
  const app = buildApp({
    authProvider,
    membershipRepository,
    leadRepository,
    leadQueueRepository,
    pushActionTokens,
  })
  return { app, leadRepository, leadQueueRepository }
}

describe('GET/PUT /lead-queue', () => {
  it('forbids sellers from seeing the queue settings', async () => {
    const { app } = buildTestApp(Role.SELLER)

    const response = await app.inject({ method: 'GET', url: '/lead-queue', headers: AUTH_HEADERS })

    expect(response.statusCode).toBe(403)
  })

  it('lets a supervisor save the settings', async () => {
    const { app, leadQueueRepository } = buildTestApp(Role.MANAGER)

    const response = await app.inject({
      method: 'PUT',
      url: '/lead-queue',
      headers: AUTH_HEADERS,
      payload: { enabled: true, timeoutMinutes: 7, memberUserIds: [] },
    })
    // Ligada sem ninguém na fila não pode.
    expect(response.statusCode).toBe(400)

    const ok = await app.inject({
      method: 'PUT',
      url: '/lead-queue',
      headers: AUTH_HEADERS,
      payload: {
        enabled: true,
        timeoutMinutes: 7,
        memberUserIds: ['11111111-1111-4111-8111-111111111111'],
      },
    })
    // O id não é membro ativo da organização.
    expect(ok.statusCode).toBe(400)
    expect(leadQueueRepository.saveSettings).not.toHaveBeenCalled()
  })

  it('rejects a timeout out of range', async () => {
    const { app } = buildTestApp(Role.ADMIN)

    const response = await app.inject({
      method: 'PUT',
      url: '/lead-queue',
      headers: AUTH_HEADERS,
      payload: { enabled: false, timeoutMinutes: 0, memberUserIds: [] },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /lead-offers/push-response', () => {
  const tokens = new HmacPushActionTokens('test-secret')
  const token = tokens.sign({
    offerId: OFFER_ID,
    userId: IDENTITY.id,
    organizationId: ORG_ID,
    expiresAt: OFFER.expiresAt,
  })

  it('accepts the queue lead from the notification, without login', async () => {
    const { app, leadRepository } = buildTestApp(Role.SELLER, undefined, tokens)

    const response = await app.inject({
      method: 'POST',
      url: '/lead-offers/push-response',
      payload: { token, action: 'accept' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      organizationId: ORG_ID,
      lead: { id: 'lead-01', funnelId: 'funnel-01', name: 'Fulano' },
    })
    expect(leadRepository.update).toHaveBeenCalledWith(
      'lead-01',
      { organizationIds: [ORG_ID] },
      { assignedUserId: IDENTITY.id },
    )
  })

  it('declines from the notification', async () => {
    const { app, leadQueueRepository } = buildTestApp(Role.SELLER, undefined, tokens)

    const response = await app.inject({
      method: 'POST',
      url: '/lead-offers/push-response',
      payload: { token, action: 'decline' },
    })

    expect(response.statusCode).toBe(200)
    expect(leadQueueRepository.resolveOffer).toHaveBeenCalledWith(
      OFFER_ID,
      'declined',
      expect.any(Date),
    )
  })

  it('refuses a forged token or one from a server without push', async () => {
    const forged = new HmacPushActionTokens('other').sign({
      offerId: OFFER_ID,
      userId: IDENTITY.id,
      organizationId: ORG_ID,
      expiresAt: OFFER.expiresAt,
    })
    const { app, leadRepository } = buildTestApp(Role.SELLER, undefined, tokens)
    const { app: noPush } = buildTestApp(Role.SELLER)

    const response = await app.inject({
      method: 'POST',
      url: '/lead-offers/push-response',
      payload: { token: forged, action: 'accept' },
    })
    const off = await noPush.inject({
      method: 'POST',
      url: '/lead-offers/push-response',
      payload: { token, action: 'accept' },
    })

    expect(response.statusCode).toBe(410)
    expect(off.statusCode).toBe(410)
    expect(leadRepository.update).not.toHaveBeenCalled()
  })
})

describe('POST /lead-offers/:id/accept', () => {
  it('assigns the lead to the seller', async () => {
    const { app, leadRepository } = buildTestApp(Role.SELLER)

    const response = await app.inject({
      method: 'POST',
      url: `/lead-offers/${OFFER_ID}/accept`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ lead: { id: 'lead-01', funnelId: 'funnel-01' } })
    expect(leadRepository.update).toHaveBeenCalledWith(
      'lead-01',
      { organizationIds: [ORG_ID] },
      { assignedUserId: IDENTITY.id },
    )
  })

  it('returns 409 when the time to accept ran out', async () => {
    const { app } = buildTestApp(
      Role.SELLER,
      buildLeadQueueRepository({ resolveOffer: vi.fn().mockResolvedValue(null) }),
    )

    const response = await app.inject({
      method: 'POST',
      url: `/lead-offers/${OFFER_ID}/accept`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(409)
  })

  it("returns 404 for someone else's offer", async () => {
    const { app } = buildTestApp(
      Role.SELLER,
      buildLeadQueueRepository({
        findOffer: vi.fn().mockResolvedValue({ ...OFFER, userId: 'outra-pessoa' }),
      }),
    )

    const response = await app.inject({
      method: 'POST',
      url: `/lead-offers/${OFFER_ID}/accept`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })
})
