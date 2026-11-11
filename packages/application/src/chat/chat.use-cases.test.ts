// Tests: ChatUseCases — quem vê a conversa, quem é avisado e tarefa pelo chat.

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type {
  ChatClientLead,
  ChatConversationRecord,
  ChatMessageRecord,
  IChatRepository,
} from '../ports/chat.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { TeamMember } from '../ports/membership.repository'
import type { INotificationRepository } from '../ports/notification.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import { CreateTaskUseCase } from '../tasks/create-task.use-case'
import { ChatUseCases, directKeyFor, isLeadInScope } from './chat.use-cases'

const ORG = 'org-1'
const SELLER = 'seller-1'
const OTHER_SELLER = 'seller-2'
const ADM = 'adm-1'
const OWNER = 'owner-1'

function membership(role: Role, dataScope: DataScope, sectors: MembershipContext['sectors'] = []) {
  return {
    organizationId: ORG,
    organizationType: OrganizationType.REPRESENTACAO,
    organizationName: 'Rep',
    organizationIconUrl: null,
    organizationSecondaryColor: null,
    tier: 'bronze',
    sectors,
    role,
    dataScope,
    permissions: [],
  } satisfies MembershipContext
}

const SELLER_CTX = membership(Role.SELLER, DataScope.OWN, ['vendas'])
const ADM_CTX = membership(Role.BACKOFFICE, DataScope.REPRESENTATION, ['adm'])

function member(userId: string, role: Role, sectors: TeamMember['sectors']): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@x.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
    supervisorUserId: null,
    sectors,
  }
}

const MEMBERS: TeamMember[] = [
  member(OWNER, Role.ADMIN, []),
  member(SELLER, Role.SELLER, ['vendas']),
  member(OTHER_SELLER, Role.SELLER, ['vendas', 'adm']),
  member(ADM, Role.BACKOFFICE, ['adm', 'pos_venda']),
]

function clientLead(overrides: Partial<ChatClientLead> = {}): ChatClientLead {
  return {
    id: 'lead-adm',
    organizationId: ORG,
    name: 'Maria',
    assignedUserId: SELLER,
    funnelId: 'f-adm',
    funnelKind: 'BACKOFFICE',
    createdAt: new Date('2026-11-02T00:00:00Z'),
    ...overrides,
  }
}

const CLIENT_CONVERSATION: ChatConversationRecord = {
  id: 'conv-1',
  organizationId: ORG,
  kind: 'client',
  clientId: 'lead-original',
  directKey: null,
  lastMessageAt: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
}

function message(overrides: Partial<ChatMessageRecord> = {}): ChatMessageRecord {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    kind: 'text',
    body: 'oi',
    author: { id: SELLER, name: 'Bianca', email: 'b@x.com', avatarUrl: null },
    task: null,
    createdAt: new Date('2026-11-10T12:00:00Z'),
    ...overrides,
  }
}

function buildChatRepository(overrides: Partial<IChatRepository> = {}): IChatRepository {
  return {
    findOrCreateClientConversation: vi.fn().mockResolvedValue(CLIENT_CONVERSATION),
    findOrCreateDirectConversation: vi.fn(),
    findById: vi.fn().mockResolvedValue(CLIENT_CONVERSATION),
    listClientLeads: vi.fn().mockResolvedValue([clientLead()]),
    listForUser: vi.fn().mockResolvedValue([]),
    summarize: vi.fn().mockResolvedValue(null),
    listMessages: vi.fn().mockResolvedValue([]),
    addMessage: vi.fn(async (input) => message({ kind: input.kind, body: input.body })),
    isParticipant: vi.fn().mockResolvedValue(false),
    listParticipantIds: vi.fn().mockResolvedValue([]),
    addParticipants: vi.fn(),
    markRead: vi.fn(),
    countUnreadConversations: vi.fn().mockResolvedValue(0),
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

function buildNotifications(): INotificationRepository {
  return {
    notify: vi.fn(),
    syncTaskReminders: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
}

function buildTaskRepository(): ITaskRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(
      async (input): Promise<TaskRecord> => ({
        id: 'task-1',
        organizationId: input.organizationId,
        leadId: input.leadId ?? null,
        assignedUserId: input.assignedUserId,
        assignedSector: input.assignedSector ?? null,
        createdByUserId: input.createdByUserId,
        type: input.type,
        title: input.title,
        notes: input.notes ?? null,
        status: 'pendente',
        dueAt: input.dueAt,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: vi.fn(),
    claim: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
}

function setup(
  chat: IChatRepository = buildChatRepository(),
  leadRepository: Partial<ILeadRepository> = {},
) {
  const notifications = buildNotifications()
  const tasks = buildTaskRepository()
  const leads = { findById: vi.fn().mockResolvedValue(null), ...leadRepository } as ILeadRepository
  const memberships = { findActiveByOrganizationId: vi.fn().mockResolvedValue(MEMBERS) }
  const organizations = buildOrganizationRepository()
  const useCases = new ChatUseCases(
    chat,
    leads,
    organizations,
    memberships,
    new CreateTaskUseCase(tasks, leads, organizations, undefined, notifications, {
      findActiveUserIdsBySector: vi.fn().mockResolvedValue([ADM]),
    }),
    notifications,
  )
  return { useCases, chat, notifications, tasks, leads }
}

describe('isLeadInScope', () => {
  it('follows the same rules as the lead queries', () => {
    const lead = { organizationId: ORG, assignedUserId: SELLER }
    expect(isLeadInScope(lead, { organizationIds: [ORG] })).toBe(true)
    expect(isLeadInScope(lead, { organizationIds: ['other'] })).toBe(false)
    expect(isLeadInScope(lead, { organizationIds: [ORG], assignedUserId: SELLER })).toBe(true)
    expect(isLeadInScope(lead, { organizationIds: [ORG], assignedUserId: 'x' })).toBe(false)
    expect(isLeadInScope(lead, { organizationIds: [ORG], teamUserIds: ['x'] })).toBe(false)
    expect(
      isLeadInScope({ ...lead, assignedUserId: null }, { organizationIds: [ORG], teamUserIds: [] }),
    ).toBe(true)
  })
})

describe('directKeyFor', () => {
  it('is the same whoever opens the conversation', () => {
    expect(directKeyFor('b', 'a')).toBe('a:b')
    expect(directKeyFor('a', 'b')).toBe('a:b')
  })
})

describe('ChatUseCases.openClient', () => {
  it('opens the conversation of the original client, not of the copy', async () => {
    const copy = { id: 'lead-adm', organizationId: ORG, clientId: 'lead-original' } as LeadRecord
    const { useCases, chat } = setup(buildChatRepository(), {
      findById: vi.fn().mockResolvedValue(copy),
    })

    await useCases.openClient({ userId: ADM, membership: ADM_CTX, leadId: 'lead-adm' })

    expect(chat.findOrCreateClientConversation).toHaveBeenCalledWith(ORG, 'lead-original')
  })

  it('returns null for a lead the user cannot see', async () => {
    const { useCases, chat } = setup()
    const result = await useCases.openClient({
      userId: SELLER,
      membership: SELLER_CTX,
      leadId: 'lead-x',
    })
    expect(result).toBeNull()
    expect(chat.findOrCreateClientConversation).not.toHaveBeenCalled()
  })
})

describe('ChatUseCases — access', () => {
  it('hides a client conversation from a seller who does not own any of its leads', async () => {
    const { useCases } = setup()
    const result = await useCases.messages({
      userId: OTHER_SELLER,
      membership: SELLER_CTX,
      conversationId: 'conv-1',
    })
    expect(result).toBeNull()
  })

  it('shows it to the seller of the client', async () => {
    const { useCases } = setup()
    const result = await useCases.messages({
      userId: SELLER,
      membership: SELLER_CTX,
      conversationId: 'conv-1',
    })
    expect(result).toEqual([])
  })

  it('keeps a direct conversation between its two people', async () => {
    const direct: ChatConversationRecord = {
      ...CLIENT_CONVERSATION,
      kind: 'direct',
      clientId: null,
      directKey: directKeyFor(SELLER, ADM),
    }
    const chat = buildChatRepository({
      findById: vi.fn().mockResolvedValue(direct),
      isParticipant: vi.fn(async (_id: string, userId: string) => userId !== OWNER),
    })
    const { useCases } = setup(chat)

    const ownerView = await useCases.messages({
      userId: OWNER,
      membership: membership(Role.ADMIN, DataScope.REPRESENTATION),
      conversationId: 'conv-1',
    })
    expect(ownerView).toBeNull()
  })
})

describe('ChatUseCases.send', () => {
  it('notifies participants, the lead owner and the ADM staff, never the author', async () => {
    const chat = buildChatRepository({ listParticipantIds: vi.fn().mockResolvedValue([OWNER]) })
    const { useCases, notifications } = setup(chat)

    await useCases.send({
      userId: ADM,
      membership: ADM_CTX,
      conversationId: 'conv-1',
      body: '  Falta o RG  ',
    })

    const notified = vi
      .mocked(notifications.notify)
      .mock.calls.map(([n]) => n.userId)
      .sort()
    // OTHER_SELLER está no setor ADM, mas Vendedor não entra pelo setor.
    expect(notified).toEqual([OWNER, SELLER].sort())
    const first = vi.mocked(notifications.notify).mock.calls[0]?.[0]
    expect(first).toMatchObject({
      type: 'chat.message',
      title: 'Maria',
      metadata: { conversationId: 'conv-1', clientName: 'Maria', preview: 'Falta o RG' },
    })
    expect(chat.addMessage).toHaveBeenCalledWith(expect.objectContaining({ body: 'Falta o RG' }))
    expect(chat.markRead).toHaveBeenCalledWith('conv-1', ADM, expect.any(Date))
  })

  it('rejects an empty message', async () => {
    const { useCases } = setup()
    await expect(
      useCases.send({ userId: ADM, membership: ADM_CTX, conversationId: 'conv-1', body: '   ' }),
    ).rejects.toThrow()
  })
})

describe('ChatUseCases.createTaskFromChat', () => {
  it('creates a no-deadline Pendência for the sector, linked to the client lead', async () => {
    const { useCases, tasks, notifications, chat } = setup(buildChatRepository(), {
      findById: vi.fn().mockResolvedValue({ id: 'lead-adm', name: 'Maria' } as LeadRecord),
    })

    const result = await useCases.createTaskFromChat({
      userId: SELLER,
      membership: SELLER_CTX,
      conversationId: 'conv-1',
      title: 'Conferir o RG',
      assignedSector: 'adm',
    })

    expect(tasks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-adm',
        assignedUserId: null,
        assignedSector: 'adm',
        type: 'Pendência',
        dueAt: null,
      }),
    )
    expect(result?.kind).toBe('task')
    // O setor é avisado pela notificação de tarefa, não por push de chat.
    const types = vi.mocked(notifications.notify).mock.calls.map(([n]) => n.type)
    expect(types).toEqual(['task.assigned'])
    expect(chat.addParticipants).toHaveBeenCalledWith(
      'conv-1',
      expect.arrayContaining([SELLER, OTHER_SELLER, ADM]),
    )
  })

  it('needs a person or a sector', async () => {
    const { useCases } = setup()
    await expect(
      useCases.createTaskFromChat({
        userId: SELLER,
        membership: SELLER_CTX,
        conversationId: 'conv-1',
        title: 'Conferir',
      }),
    ).rejects.toThrow()
  })

  it('refuses someone who is not on the team', async () => {
    const { useCases } = setup()
    await expect(
      useCases.createTaskFromChat({
        userId: SELLER,
        membership: SELLER_CTX,
        conversationId: 'conv-1',
        title: 'Conferir',
        assignedUserId: 'stranger',
      }),
    ).rejects.toThrow()
  })
})
