// Tests: Fila de Leads — oferta ao próximo da fila, fim da fila depois de
// receber, vencimento passando adiante, aceite/recusa e a configuração.

import { ConflictError, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  ILeadQueueRepository,
  LeadOfferRecord,
  LeadOfferStatus,
  LeadQueueSettings,
} from '../ports/lead-queue.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { INotificationRepository, NewNotification } from '../ports/notification.repository'
import { GetLeadQueueUseCase, UpdateLeadQueueSettingsUseCase } from './lead-queue-settings.use-case'
import { ListMyLeadOffersUseCase } from './list-my-lead-offers.use-case'
import { OfferLeadToQueueUseCase } from './offer-lead-to-queue.use-case'
import { ProcessExpiredLeadOffersUseCase } from './process-expired-lead-offers.use-case'
import { RespondLeadOfferUseCase } from './respond-lead-offer.use-case'

const ORG = 'org-01'
const T0 = new Date('2026-10-01T12:00:00Z')
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000)

/** Fila em memória com a mesma semântica do repositório Drizzle. */
class InMemoryLeadQueue implements ILeadQueueRepository {
  settings: LeadQueueSettings = {
    organizationId: ORG,
    enabled: true,
    timeoutMinutes: 5,
    memberUserIds: [],
  }
  lastOffered = new Map<string, Date>()
  offers: LeadOfferRecord[] = []
  inactive = new Set<string>()

  constructor(memberUserIds: string[]) {
    this.settings.memberUserIds = memberUserIds
    // Posição inicial = ordem da lista.
    memberUserIds.forEach((id, i) => this.lastOffered.set(id, new Date(T0.getTime() - 1000 + i)))
  }

  async getSettings() {
    return { ...this.settings }
  }
  async saveSettings(settings: LeadQueueSettings, now: Date) {
    for (const id of settings.memberUserIds)
      if (!this.lastOffered.has(id)) this.lastOffered.set(id, now)
    for (const id of [...this.lastOffered.keys()])
      if (!settings.memberUserIds.includes(id)) this.lastOffered.delete(id)
    this.settings = { ...settings }
    return { ...settings }
  }
  async listQueue() {
    return this.settings.memberUserIds
      .filter((id) => !this.inactive.has(id))
      .map((userId) => ({ userId, lastOfferedAt: this.lastOffered.get(userId) as Date }))
      .sort((a, b) => a.lastOfferedAt.getTime() - b.lastOfferedAt.getTime())
  }
  async markOffered(_org: string, userId: string, at: Date) {
    this.lastOffered.set(userId, at)
  }
  async listOfferedUserIds(leadId: string) {
    return [...new Set(this.offers.filter((o) => o.leadId === leadId).map((o) => o.userId))]
  }
  async createOffer(input: Omit<LeadOfferRecord, 'id' | 'status' | 'respondedAt'>) {
    if (this.offers.some((o) => o.leadId === input.leadId && o.status === 'pending')) {
      throw new Error('duplicate pending offer')
    }
    const offer: LeadOfferRecord = {
      ...input,
      id: `offer-${this.offers.length + 1}`,
      status: 'pending',
      respondedAt: null,
    }
    this.offers.push(offer)
    return { ...offer }
  }
  async findOffer(id: string) {
    const offer = this.offers.find((o) => o.id === id)
    return offer ? { ...offer } : null
  }
  async resolveOffer(id: string, status: Exclude<LeadOfferStatus, 'pending'>, at: Date) {
    const offer = this.offers.find((o) => o.id === id)
    if (!offer || offer.status !== 'pending') return null
    if (status === 'accepted' && offer.expiresAt.getTime() <= at.getTime()) return null
    offer.status = status
    offer.respondedAt = at
    return { ...offer }
  }
  async claimExpiredOffers(now: Date) {
    const expired = this.offers.filter(
      (o) => o.status === 'pending' && o.expiresAt.getTime() <= now.getTime(),
    )
    for (const offer of expired) {
      offer.status = 'expired'
      offer.respondedAt = now
    }
    return expired.map((o) => ({ ...o }))
  }
  async listPendingOffers(filter: { organizationId: string; userId?: string; now: Date }) {
    return this.offers
      .filter(
        (o) =>
          o.status === 'pending' &&
          o.expiresAt.getTime() > filter.now.getTime() &&
          (!filter.userId || o.userId === filter.userId),
      )
      .map((o) => ({ ...o }))
  }
}

function buildLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: 'lead-01',
    organizationId: ORG,
    name: 'Fulano',
    phone: '(11) 90000-0000',
    email: null,
    segment: 'Imobiliário',
    valueCents: 100_000_00,
    quotaCount: 1,
    source: 'Webhook',
    funnelId: 'funnel-01',
    stageId: 'stage-01',
    assignedUserId: null,
    stageChangedAt: T0,
    lostAt: null,
    wonAt: null,
    tags: [],
    notes: null,
    profession: null,
    incomeCents: null,
    maritalStatus: null,
    cpf: null,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

function member(userId: string, role: Role): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
  }
}

function setup(sellers = ['ana', 'bia', 'caio']) {
  const queue = new InMemoryLeadQueue(sellers)
  const leads = new Map<string, LeadRecord>([['lead-01', buildLead()]])
  const leadRepository = {
    findById: vi.fn(async (id: string) => {
      const lead = leads.get(id)
      return lead ? { ...lead } : null
    }),
    update: vi.fn(
      async (id: string, _scope: unknown, input: { assignedUserId?: string | null }) => {
        const lead = leads.get(id)
        if (!lead) return null
        const updated = { ...lead, assignedUserId: input.assignedUserId ?? null }
        leads.set(id, updated)
        return updated
      },
    ),
    recordAssignmentChange: vi.fn(async () => {}),
  } as unknown as ILeadRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn(async () => [
      member('dono', Role.ADMIN),
      member('super', Role.MANAGER),
      ...sellers.map((id) => member(id, Role.SELLER)),
    ]),
  } as unknown as IMembershipRepository
  const sent: NewNotification[] = []
  const notifications: INotificationRepository = {
    notify: vi.fn(async (n: NewNotification) => {
      sent.push(n)
    }),
    syncTaskReminders: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
  const offerLead = new OfferLeadToQueueUseCase(queue, leadRepository, notifications)
  const processExpired = new ProcessExpiredLeadOffersUseCase(
    queue,
    offerLead,
    membershipRepository,
    notifications,
  )
  const respond = new RespondLeadOfferUseCase(
    queue,
    leadRepository,
    offerLead,
    membershipRepository,
    notifications,
  )
  return {
    queue,
    leads,
    leadRepository,
    membershipRepository,
    notifications,
    sent,
    offerLead,
    processExpired,
    respond,
  }
}

const offerTo = (sent: NewNotification[]) =>
  sent.filter((n) => n.type === 'lead.offered').map((n) => n.userId)

describe('OfferLeadToQueueUseCase', () => {
  it('offers to the first in the queue, notifies with the deadline and moves them to the end', async () => {
    const { offerLead, queue, sent } = setup()

    const result = await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    expect(result.status).toBe('offered')
    expect(sent).toEqual([
      expect.objectContaining({
        userId: 'ana',
        type: 'lead.offered',
        title: 'Fulano',
        metadata: expect.objectContaining({ expiresAt: minutes(5).toISOString() }),
      }),
    ])
    expect((await queue.listQueue()).map((m) => m.userId)).toEqual(['bia', 'caio', 'ana'])
  })

  it('rotates through the sellers across leads', async () => {
    const { offerLead, leads, sent } = setup()
    leads.set('lead-02', buildLead({ id: 'lead-02' }))
    leads.set('lead-03', buildLead({ id: 'lead-03' }))
    leads.set('lead-04', buildLead({ id: 'lead-04' }))

    for (const [i, id] of ['lead-01', 'lead-02', 'lead-03', 'lead-04'].entries()) {
      await offerLead.execute({ organizationId: ORG, leadId: id, now: minutes(i) })
    }

    expect(offerTo(sent)).toEqual(['ana', 'bia', 'caio', 'ana'])
  })

  it('is unavailable when the queue is off or empty', async () => {
    const { offerLead, queue } = setup()
    queue.settings.enabled = false
    expect(
      (await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })).status,
    ).toBe('unavailable')

    const empty = setup([])
    expect(
      (await empty.offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })).status,
    ).toBe('unavailable')
  })

  it('skips members that are no longer active in the organization', async () => {
    const { offerLead, queue, sent } = setup()
    queue.inactive.add('ana')

    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    expect(offerTo(sent)).toEqual(['bia'])
  })

  it('does nothing for a lead that already has an owner', async () => {
    const { offerLead, leads, sent } = setup()
    leads.set('lead-01', buildLead({ assignedUserId: 'super' }))

    const result = await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    expect(result.status).toBe('closed')
    expect(sent).toEqual([])
  })
})

describe('ProcessExpiredLeadOffersUseCase', () => {
  it('passes the lead to the next seller when the time runs out', async () => {
    const { offerLead, processExpired, sent, queue } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    expect((await processExpired.execute({ now: minutes(4) })).expired).toBe(0)
    expect((await processExpired.execute({ now: minutes(5) })).expired).toBe(1)

    expect(offerTo(sent)).toEqual(['ana', 'bia'])
    // Quem deixou passar continua no fim da fila.
    expect((await queue.listQueue()).map((m) => m.userId)).toEqual(['caio', 'ana', 'bia'])
  })

  it('warns owners and supervisors after a full round with no one accepting', async () => {
    const { offerLead, processExpired, sent } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })
    await processExpired.execute({ now: minutes(5) })
    await processExpired.execute({ now: minutes(10) })
    await processExpired.execute({ now: minutes(15) })
    await processExpired.execute({ now: minutes(20) })

    expect(offerTo(sent)).toEqual(['ana', 'bia', 'caio'])
    const warned = sent.filter((n) => n.type === 'lead.received')
    expect(warned.map((n) => n.userId)).toEqual(['dono', 'super'])
    expect(warned[0]?.metadata).toMatchObject({ queueExhausted: true, assignedToYou: false })
  })
})

describe('RespondLeadOfferUseCase', () => {
  it('accepting makes the seller the owner and records the assignment', async () => {
    const { offerLead, respond, leads, leadRepository, queue } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    const result = await respond.execute({
      offerId: 'offer-1',
      userId: 'ana',
      organizationId: ORG,
      action: 'accept',
      now: minutes(2),
    })

    expect(result).toMatchObject({ action: 'accept' })
    expect(leads.get('lead-01')?.assignedUserId).toBe('ana')
    expect(leadRepository.recordAssignmentChange).toHaveBeenCalledWith({
      leadId: 'lead-01',
      fromUserId: null,
      toUserId: 'ana',
      changedByUserId: 'ana',
    })
    expect(queue.offers[0]?.status).toBe('accepted')
  })

  it('rejects accepting after the deadline', async () => {
    const { offerLead, respond, leads } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    await expect(
      respond.execute({
        offerId: 'offer-1',
        userId: 'ana',
        organizationId: ORG,
        action: 'accept',
        now: minutes(5),
      }),
    ).rejects.toThrow(ConflictError)
    expect(leads.get('lead-01')?.assignedUserId).toBeNull()
  })

  it('rejects accepting a lead someone else already took', async () => {
    const { offerLead, respond, leads, queue } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })
    leads.set('lead-01', buildLead({ assignedUserId: 'super' }))

    await expect(
      respond.execute({
        offerId: 'offer-1',
        userId: 'ana',
        organizationId: ORG,
        action: 'accept',
        now: minutes(1),
      }),
    ).rejects.toThrow(ConflictError)
    expect(queue.offers[0]?.status).toBe('cancelled')
  })

  it('declining passes the lead to the next seller right away', async () => {
    const { offerLead, respond, sent } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    await respond.execute({
      offerId: 'offer-1',
      userId: 'ana',
      organizationId: ORG,
      action: 'decline',
      now: minutes(1),
    })

    expect(offerTo(sent)).toEqual(['ana', 'bia'])
  })

  it('returns null for an offer of someone else', async () => {
    const { offerLead, respond } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    expect(
      await respond.execute({
        offerId: 'offer-1',
        userId: 'bia',
        organizationId: ORG,
        action: 'accept',
        now: minutes(1),
      }),
    ).toBeNull()
  })
})

describe('ListMyLeadOffersUseCase / GetLeadQueueUseCase', () => {
  it('lists the pending offer with the lead summary, only for its seller', async () => {
    const { offerLead, queue, leadRepository } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })
    const list = new ListMyLeadOffersUseCase(queue, leadRepository)

    const mine = await list.execute({ organizationId: ORG, userId: 'ana', now: minutes(1) })
    const others = await list.execute({ organizationId: ORG, userId: 'bia', now: minutes(1) })

    expect(mine).toEqual([
      expect.objectContaining({
        id: 'offer-1',
        expiresAt: minutes(5),
        lead: expect.objectContaining({ id: 'lead-01', name: 'Fulano' }),
      }),
    ])
    expect(mine[0]?.lead).not.toHaveProperty('phone')
    expect(others).toEqual([])
  })

  it('shows managers the queue order and the offers waiting', async () => {
    const { offerLead, queue, leadRepository } = setup()
    await offerLead.execute({ organizationId: ORG, leadId: 'lead-01', now: T0 })

    const overview = await new GetLeadQueueUseCase(queue, leadRepository).execute({
      organizationId: ORG,
      now: minutes(1),
    })

    expect(overview.queue.map((m) => m.userId)).toEqual(['bia', 'caio', 'ana'])
    expect(overview.pendingOffers).toEqual([
      expect.objectContaining({ userId: 'ana', leadName: 'Fulano' }),
    ])
  })
})

describe('UpdateLeadQueueSettingsUseCase', () => {
  it('saves the settings; new members join at the end of the queue', async () => {
    const { queue, membershipRepository } = setup(['ana', 'bia'])
    const update = new UpdateLeadQueueSettingsUseCase(queue, membershipRepository)

    await update.execute({
      organizationId: ORG,
      enabled: true,
      timeoutMinutes: 10,
      memberUserIds: ['bia', 'ana', 'super'],
      now: minutes(1),
    })

    expect(queue.settings.timeoutMinutes).toBe(10)
    expect((await queue.listQueue()).map((m) => m.userId)).toEqual(['ana', 'bia', 'super'])
  })

  it.each([
    ['a timeout out of range', { timeoutMinutes: 0, memberUserIds: ['ana'] }],
    ['someone outside the organization', { timeoutMinutes: 5, memberUserIds: ['intruso'] }],
    ['an enabled queue with no one', { timeoutMinutes: 5, memberUserIds: [] }],
  ])('rejects %s', async (_label, input) => {
    const { queue, membershipRepository } = setup(['ana'])
    const update = new UpdateLeadQueueSettingsUseCase(queue, membershipRepository)

    await expect(
      update.execute({ organizationId: ORG, enabled: true, now: T0, ...input }),
    ).rejects.toThrow(ValidationError)
  })
})
