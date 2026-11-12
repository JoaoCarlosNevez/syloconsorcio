// DrizzleChatRepository — implementação concreta de IChatRepository.
//
// ADR-02: Drizzle é o único ORM; as consultas com agregação (lista de
// conversas com última mensagem e não lidas) usam sql`` parametrizado.
// Datas que voltam de db.execute chegam como texto — convertidas aqui.

import type {
  ChatClientLead,
  ChatConversationKind,
  ChatConversationRecord,
  ChatConversationSummary,
  ChatMessageKind,
  ChatMessageRecord,
  ChatMessageTask,
  IChatRepository,
  NewChatMessage,
} from '@sylocrm/application'
import { type SQL, and, asc, desc, eq, lt, sql } from 'drizzle-orm'
import type { Database } from '../client'
import {
  chatConversations,
  chatMessages,
  chatParticipants,
  funnels,
  leads,
  tasks,
  users,
} from '../schema'

const CONVERSATION_COLUMNS = {
  id: chatConversations.id,
  organizationId: chatConversations.organizationId,
  kind: chatConversations.kind,
  clientId: chatConversations.clientId,
  directKey: chatConversations.directKey,
  lastMessageAt: chatConversations.lastMessageAt,
  createdAt: chatConversations.createdAt,
} as const

function toConversation(row: {
  id: string
  organizationId: string
  kind: string
  clientId: string | null
  directKey: string | null
  lastMessageAt: Date | null
  createdAt: Date
}): ChatConversationRecord {
  return { ...row, kind: row.kind as ChatConversationKind }
}

function toDate(value: Date | string | null): Date | null {
  if (value === null) return null
  return value instanceof Date ? value : new Date(value)
}

type SummaryRow = {
  id: string
  organization_id: string
  kind: string
  client_id: string | null
  direct_key: string | null
  last_message_at: string | null
  created_at: string
  client_lead_id: string | null
  client_lead_name: string | null
  client_lead_funnel_id: string | null
  other_id: string | null
  other_name: string | null
  other_email: string | null
  other_avatar_url: string | null
  last_body: string | null
  last_kind: string | null
  last_author_name: string | null
  last_author_email: string | null
  unread_count: number | string
}

function toSummary(row: SummaryRow): ChatConversationSummary {
  return {
    conversation: {
      id: row.id,
      organizationId: row.organization_id,
      kind: row.kind as ChatConversationKind,
      clientId: row.client_id,
      directKey: row.direct_key,
      lastMessageAt: toDate(row.last_message_at),
      createdAt: new Date(row.created_at),
    },
    clientLead:
      row.client_lead_id && row.client_lead_name && row.client_lead_funnel_id
        ? {
            id: row.client_lead_id,
            name: row.client_lead_name,
            funnelId: row.client_lead_funnel_id,
          }
        : null,
    otherUser:
      row.other_id && row.other_email
        ? {
            id: row.other_id,
            name: row.other_name,
            email: row.other_email,
            avatarUrl: row.other_avatar_url,
          }
        : null,
    lastMessage:
      row.last_body !== null && row.last_kind !== null
        ? {
            body: row.last_body,
            kind: row.last_kind as ChatMessageKind,
            authorName: row.last_author_name?.trim() || row.last_author_email,
          }
        : null,
    unreadCount: Number(row.unread_count),
  }
}

export class DrizzleChatRepository implements IChatRepository {
  constructor(private readonly db: Database) {}

  async findOrCreateClientConversation(
    organizationId: string,
    clientId: string,
  ): Promise<ChatConversationRecord> {
    await this.db
      .insert(chatConversations)
      .values({ organizationId, kind: 'client', clientId })
      .onConflictDoNothing()
    const rows = await this.db
      .select(CONVERSATION_COLUMNS)
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.organizationId, organizationId),
          eq(chatConversations.clientId, clientId),
        ),
      )
      .limit(1)
    const row = rows[0]
    if (!row) throw new Error('Failed to create client conversation')
    return toConversation(row)
  }

  async findOrCreateDirectConversation(
    organizationId: string,
    directKey: string,
  ): Promise<ChatConversationRecord> {
    await this.db
      .insert(chatConversations)
      .values({ organizationId, kind: 'direct', directKey })
      .onConflictDoNothing()
    const rows = await this.db
      .select(CONVERSATION_COLUMNS)
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.organizationId, organizationId),
          eq(chatConversations.directKey, directKey),
        ),
      )
      .limit(1)
    const row = rows[0]
    if (!row) throw new Error('Failed to create direct conversation')
    return toConversation(row)
  }

  async findById(id: string): Promise<ChatConversationRecord | null> {
    const rows = await this.db
      .select(CONVERSATION_COLUMNS)
      .from(chatConversations)
      .where(eq(chatConversations.id, id))
      .limit(1)
    const row = rows[0]
    return row ? toConversation(row) : null
  }

  async listClientLeads(organizationId: string, clientId: string): Promise<ChatClientLead[]> {
    return this.db
      .select({
        id: leads.id,
        organizationId: leads.organizationId,
        name: leads.name,
        assignedUserId: leads.assignedUserId,
        funnelId: leads.funnelId,
        funnelKind: funnels.kind,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(funnels, eq(leads.funnelId, funnels.id))
      .where(
        and(
          eq(leads.organizationId, organizationId),
          sql`coalesce(${leads.clientId}, ${leads.id}) = ${clientId}`,
        ),
      )
      .orderBy(desc(leads.createdAt))
  }

  /** Resumo das conversas — a mesma consulta serve pra lista e pra uma só. */
  private async summaries(
    userId: string,
    filter: { organizationId: string } | { conversationId: string },
  ): Promise<ChatConversationSummary[]> {
    const where =
      'organizationId' in filter
        ? sql`c.organization_id = ${filter.organizationId}
            AND EXISTS (SELECT 1 FROM ${chatParticipants} p
                        WHERE p.conversation_id = c.id AND p.user_id = ${userId})
            AND c.last_message_at IS NOT NULL`
        : sql`c.id = ${filter.conversationId}`
    const rows = await this.db.execute<SummaryRow>(sql`
      SELECT c.id, c.organization_id, c.kind, c.client_id, c.direct_key,
        c.last_message_at, c.created_at,
        cl.id AS client_lead_id, cl.name AS client_lead_name,
        cl.funnel_id AS client_lead_funnel_id,
        o.id AS other_id, o.name AS other_name, o.email AS other_email,
        o.avatar_url AS other_avatar_url,
        lm.body AS last_body, lm.kind AS last_kind,
        la.name AS last_author_name, la.email AS last_author_email,
        (
          SELECT count(*) FROM ${chatMessages} m
          WHERE m.conversation_id = c.id
            AND (m.author_user_id IS NULL OR m.author_user_id <> ${userId})
            AND m.created_at > coalesce(
              (SELECT p.last_read_at FROM ${chatParticipants} p
               WHERE p.conversation_id = c.id AND p.user_id = ${userId}),
              '-infinity'::timestamptz)
        ) AS unread_count
      FROM ${chatConversations} c
      LEFT JOIN LATERAL (
        SELECT l.id, l.name, l.funnel_id FROM ${leads} l
        WHERE c.kind = 'client' AND l.organization_id = c.organization_id
          AND coalesce(l.client_id, l.id) = c.client_id
        ORDER BY l.created_at DESC LIMIT 1
      ) cl ON true
      LEFT JOIN ${users} o ON c.kind = 'direct'
        AND o.id::text = CASE WHEN split_part(c.direct_key, ':', 1) = ${userId}::text
                              THEN split_part(c.direct_key, ':', 2)
                              ELSE split_part(c.direct_key, ':', 1) END
      LEFT JOIN LATERAL (
        SELECT m.body, m.kind, m.author_user_id FROM ${chatMessages} m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN ${users} la ON la.id = lm.author_user_id
      WHERE ${where}
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 100
    `)
    return [...rows].map(toSummary)
  }

  listForUser(userId: string, organizationId: string): Promise<ChatConversationSummary[]> {
    return this.summaries(userId, { organizationId })
  }

  async summarize(conversationId: string, userId: string): Promise<ChatConversationSummary | null> {
    const rows = await this.summaries(userId, { conversationId })
    return rows[0] ?? null
  }

  /** Mensagens com autor e o estado atual da tarefa, mais novas primeiro. */
  private async selectMessages(
    where: SQL | undefined,
    limit: number,
  ): Promise<ChatMessageRecord[]> {
    const rows = await this.db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        kind: chatMessages.kind,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.avatarUrl,
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        taskAssignedUserId: tasks.assignedUserId,
        taskAssignedSector: tasks.assignedSector,
        taskDueAt: tasks.dueAt,
        taskCompletedAt: tasks.completedAt,
        leadId: leads.id,
        leadName: leads.name,
        leadFunnelId: leads.funnelId,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.authorUserId, users.id))
      .leftJoin(tasks, eq(chatMessages.taskId, tasks.id))
      .leftJoin(leads, eq(chatMessages.leadId, leads.id))
      .where(where)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      kind: row.kind as ChatMessageKind,
      body: row.body,
      createdAt: row.createdAt,
      author:
        row.authorId && row.authorEmail
          ? {
              id: row.authorId,
              name: row.authorName,
              email: row.authorEmail,
              avatarUrl: row.authorAvatarUrl,
            }
          : null,
      task:
        row.taskId && row.taskTitle && row.taskStatus
          ? {
              id: row.taskId,
              title: row.taskTitle,
              status: row.taskStatus as ChatMessageTask['status'],
              assignedUserId: row.taskAssignedUserId,
              assignedSector: row.taskAssignedSector,
              dueAt: row.taskDueAt,
              completedAt: row.taskCompletedAt,
            }
          : null,
      lead:
        row.leadId && row.leadName && row.leadFunnelId
          ? { id: row.leadId, name: row.leadName, funnelId: row.leadFunnelId }
          : null,
    }))
  }

  async listMessages(
    conversationId: string,
    options: { limit: number; before?: Date },
  ): Promise<ChatMessageRecord[]> {
    const conditions = [eq(chatMessages.conversationId, conversationId)]
    if (options.before) conditions.push(lt(chatMessages.createdAt, options.before))
    // Busca as mais novas e devolve em ordem de leitura (antigas primeiro).
    const newestFirst = await this.selectMessages(and(...conditions), options.limit)
    return newestFirst.reverse()
  }

  async addMessage(message: NewChatMessage): Promise<ChatMessageRecord> {
    const inserted = await this.db
      .insert(chatMessages)
      .values({
        conversationId: message.conversationId,
        authorUserId: message.authorUserId,
        kind: message.kind,
        body: message.body,
        taskId: message.taskId ?? null,
        leadId: message.leadId ?? null,
      })
      .returning({ id: chatMessages.id, createdAt: chatMessages.createdAt })
    const row = inserted[0]
    if (!row) throw new Error('Failed to add chat message: no row returned')
    await this.db
      .update(chatConversations)
      .set({ lastMessageAt: row.createdAt })
      .where(eq(chatConversations.id, message.conversationId))

    const [record] = await this.selectMessages(eq(chatMessages.id, row.id), 1)
    if (!record) throw new Error('Failed to read back chat message')
    return record
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: chatParticipants.userId })
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  async listParticipantIds(conversationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: chatParticipants.userId })
      .from(chatParticipants)
      .where(eq(chatParticipants.conversationId, conversationId))
      .orderBy(asc(chatParticipants.createdAt))
    return rows.map((row) => row.userId)
  }

  async addParticipants(conversationId: string, userIds: readonly string[]): Promise<void> {
    const unique = [...new Set(userIds)]
    if (unique.length === 0) return
    await this.db
      .insert(chatParticipants)
      .values(unique.map((userId) => ({ conversationId, userId })))
      .onConflictDoNothing()
  }

  async markRead(conversationId: string, userId: string, at: Date): Promise<void> {
    await this.db
      .insert(chatParticipants)
      .values({ conversationId, userId, lastReadAt: at })
      .onConflictDoUpdate({
        target: [chatParticipants.conversationId, chatParticipants.userId],
        // Nunca volta a leitura pra trás.
        set: {
          lastReadAt: sql`greatest(coalesce(${chatParticipants.lastReadAt}, '-infinity'::timestamptz), ${at.toISOString()}::timestamptz)`,
        },
      })
  }

  async countUnreadConversations(userId: string, organizationId: string): Promise<number> {
    const rows = await this.db.execute<{ total: number | string }>(sql`
      SELECT count(*) AS total
      FROM ${chatParticipants} p
      JOIN ${chatConversations} c ON c.id = p.conversation_id
      WHERE p.user_id = ${userId}
        AND c.organization_id = ${organizationId}
        AND EXISTS (
          SELECT 1 FROM ${chatMessages} m
          WHERE m.conversation_id = c.id
            AND (m.author_user_id IS NULL OR m.author_user_id <> ${userId})
            AND m.created_at > coalesce(p.last_read_at, '-infinity'::timestamptz)
        )
    `)
    return Number([...rows][0]?.total ?? 0)
  }
}
