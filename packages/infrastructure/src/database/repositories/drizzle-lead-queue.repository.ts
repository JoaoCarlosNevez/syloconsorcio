// DrizzleLeadQueueRepository — implementação concreta de ILeadQueueRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).
//
// resolveOffer e claimExpiredOffers são UPDATE ... WHERE status = 'pending'
// RETURNING: a troca de status é atômica, então duas instâncias (ou o aceite
// chegando junto com o vencimento) nunca processam a mesma oferta duas vezes.

import {
  DEFAULT_LEAD_QUEUE_TIMEOUT_MINUTES,
  type ILeadQueueRepository,
  type LeadOfferRecord,
  type LeadOfferStatus,
  type LeadQueueMember,
  type LeadQueueSettings,
  type NewLeadOfferInput,
} from '@sylocrm/application'
import { and, asc, eq, gt, lte, notInArray } from 'drizzle-orm'
import type { Database } from '../client'
import {
  type DbLeadOffer,
  leadOffers,
  leadQueueMembers,
  leadQueueSettings,
  organizationMemberships,
} from '../schema'

const OFFER_COLUMNS = {
  id: leadOffers.id,
  organizationId: leadOffers.organizationId,
  leadId: leadOffers.leadId,
  userId: leadOffers.userId,
  status: leadOffers.status,
  offeredAt: leadOffers.offeredAt,
  expiresAt: leadOffers.expiresAt,
  respondedAt: leadOffers.respondedAt,
} as const

function toOffer(row: Pick<DbLeadOffer, keyof typeof OFFER_COLUMNS>): LeadOfferRecord {
  return { ...row, status: row.status as LeadOfferStatus }
}

export class DrizzleLeadQueueRepository implements ILeadQueueRepository {
  constructor(private readonly db: Database) {}

  async getSettings(organizationId: string): Promise<LeadQueueSettings> {
    const [settingsRows, memberRows] = await Promise.all([
      this.db
        .select({
          enabled: leadQueueSettings.enabled,
          timeoutMinutes: leadQueueSettings.timeoutMinutes,
        })
        .from(leadQueueSettings)
        .where(eq(leadQueueSettings.organizationId, organizationId))
        .limit(1),
      this.db
        .select({ userId: leadQueueMembers.userId })
        .from(leadQueueMembers)
        .where(eq(leadQueueMembers.organizationId, organizationId)),
    ])
    const settings = settingsRows[0]
    return {
      organizationId,
      enabled: settings?.enabled ?? false,
      timeoutMinutes: settings?.timeoutMinutes ?? DEFAULT_LEAD_QUEUE_TIMEOUT_MINUTES,
      memberUserIds: memberRows.map((row) => row.userId),
    }
  }

  async saveSettings(settings: LeadQueueSettings, now: Date): Promise<LeadQueueSettings> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(leadQueueSettings)
        .values({
          organizationId: settings.organizationId,
          enabled: settings.enabled,
          timeoutMinutes: settings.timeoutMinutes,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: leadQueueSettings.organizationId,
          set: {
            enabled: settings.enabled,
            timeoutMinutes: settings.timeoutMinutes,
            updatedAt: now,
          },
        })

      // Quem saiu da fila sai; quem continua mantém a posição; quem entrou
      // entra no fim (last_offered_at = now).
      await tx
        .delete(leadQueueMembers)
        .where(
          settings.memberUserIds.length > 0
            ? and(
                eq(leadQueueMembers.organizationId, settings.organizationId),
                notInArray(leadQueueMembers.userId, settings.memberUserIds),
              )
            : eq(leadQueueMembers.organizationId, settings.organizationId),
        )
      if (settings.memberUserIds.length > 0) {
        await tx
          .insert(leadQueueMembers)
          .values(
            settings.memberUserIds.map((userId) => ({
              organizationId: settings.organizationId,
              userId,
              lastOfferedAt: now,
            })),
          )
          .onConflictDoNothing()
      }
    })
    return this.getSettings(settings.organizationId)
  }

  async listQueue(organizationId: string): Promise<LeadQueueMember[]> {
    return this.db
      .select({ userId: leadQueueMembers.userId, lastOfferedAt: leadQueueMembers.lastOfferedAt })
      .from(leadQueueMembers)
      .innerJoin(
        organizationMemberships,
        and(
          eq(organizationMemberships.userId, leadQueueMembers.userId),
          eq(organizationMemberships.organizationId, leadQueueMembers.organizationId),
        ),
      )
      .where(
        and(
          eq(leadQueueMembers.organizationId, organizationId),
          eq(organizationMemberships.status, 'ACTIVE'),
        ),
      )
      .orderBy(asc(leadQueueMembers.lastOfferedAt), asc(leadQueueMembers.userId))
  }

  async markOffered(organizationId: string, userId: string, at: Date): Promise<void> {
    await this.db
      .update(leadQueueMembers)
      .set({ lastOfferedAt: at })
      .where(
        and(
          eq(leadQueueMembers.organizationId, organizationId),
          eq(leadQueueMembers.userId, userId),
        ),
      )
  }

  async listOfferedUserIds(leadId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ userId: leadOffers.userId })
      .from(leadOffers)
      .where(eq(leadOffers.leadId, leadId))
    return rows.map((row) => row.userId)
  }

  async createOffer(input: NewLeadOfferInput): Promise<LeadOfferRecord> {
    const rows = await this.db
      .insert(leadOffers)
      .values({ ...input, status: 'pending' })
      .returning(OFFER_COLUMNS)
    const row = rows[0]
    if (!row) throw new Error('Failed to create lead offer: no row returned')
    return toOffer(row)
  }

  async findOffer(id: string): Promise<LeadOfferRecord | null> {
    const rows = await this.db
      .select(OFFER_COLUMNS)
      .from(leadOffers)
      .where(eq(leadOffers.id, id))
      .limit(1)
    return rows[0] ? toOffer(rows[0]) : null
  }

  async resolveOffer(
    id: string,
    status: Exclude<LeadOfferStatus, 'pending'>,
    at: Date,
  ): Promise<LeadOfferRecord | null> {
    const conditions = [eq(leadOffers.id, id), eq(leadOffers.status, 'pending')]
    // Aceite só no prazo — vencida, quem decide é o processador de vencidas.
    if (status === 'accepted') conditions.push(gt(leadOffers.expiresAt, at))
    const rows = await this.db
      .update(leadOffers)
      .set({ status, respondedAt: at })
      .where(and(...conditions))
      .returning(OFFER_COLUMNS)
    return rows[0] ? toOffer(rows[0]) : null
  }

  async claimExpiredOffers(now: Date): Promise<LeadOfferRecord[]> {
    const rows = await this.db
      .update(leadOffers)
      .set({ status: 'expired', respondedAt: now })
      .where(and(eq(leadOffers.status, 'pending'), lte(leadOffers.expiresAt, now)))
      .returning(OFFER_COLUMNS)
    return rows.map(toOffer)
  }

  async listPendingOffers(filter: {
    organizationId: string
    userId?: string
    now: Date
  }): Promise<LeadOfferRecord[]> {
    const conditions = [
      eq(leadOffers.organizationId, filter.organizationId),
      eq(leadOffers.status, 'pending'),
      gt(leadOffers.expiresAt, filter.now),
    ]
    if (filter.userId) conditions.push(eq(leadOffers.userId, filter.userId))
    const rows = await this.db
      .select(OFFER_COLUMNS)
      .from(leadOffers)
      .where(and(...conditions))
      .orderBy(asc(leadOffers.offeredAt))
    return rows.map(toOffer)
  }
}
