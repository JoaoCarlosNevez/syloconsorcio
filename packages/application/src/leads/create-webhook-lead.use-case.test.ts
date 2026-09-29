// Tests: CreateWebhookLeadUseCase — lead recebido pelo webhook

import { Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import type { INotificationRepository } from '../ports/notification.repository'
import { CreateLeadUseCase } from './create-lead.use-case'
import {
  CreateWebhookLeadUseCase,
  WEBHOOK_DEFAULT_SEGMENT,
  WEBHOOK_DEFAULT_SOURCE,
} from './create-webhook-lead.use-case'

const ORG_ID = 'org-01'
const FUNNEL_ID = 'funnel-01'
const FIRST_STAGE_ID = 'stage-first'

const SAMPLE_FUNNEL: FunnelRecord = {
  id: FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [{ id: FIRST_STAGE_ID, funnelId: FUNNEL_ID, name: 'Lead', color: '#000', position: 0 }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const EXISTING_LEAD: LeadRecord = {
  id: 'lead-existing',
  organizationId: ORG_ID,
  name: 'Já Cadastrado',
  phone: '(11) 90000-0000',
  email: null,
  segment: 'Imobiliário',
  valueCents: 1_000_00,
  quotaCount: 1,
  source: 'SITE',
  funnelId: FUNNEL_ID,
  stageId: FIRST_STAGE_ID,
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

function buildFunnelRepository(overrides: Partial<IFunnelRepository> = {}): IFunnelRepository {
  return {
    listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL]),
    findById: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLeadsByStage: vi.fn().mockResolvedValue(0),
    countLeadsByFunnel: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function buildLeadRepository(overrides: Partial<ILeadRepository> = {}): ILeadRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(EXISTING_LEAD),
    update: vi.fn(),
    delete: vi.fn(),
    recordAssignmentChange: vi.fn(),
    listAssignmentHistory: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(0),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const OTHER_FUNNEL: FunnelRecord = {
  ...SAMPLE_FUNNEL,
  id: 'funnel-02',
  name: 'Pós-venda',
  isDefault: false,
  stages: [
    { id: 'stage-other', funnelId: 'funnel-02', name: 'Início', color: '#000', position: 0 },
  ],
}

const MEMBER: TeamMember = {
  userId: 'user-maria',
  name: 'Maria',
  email: 'Maria@Empresa.com',
  avatarUrl: null,
  role: Role.SELLER,
  status: 'ACTIVE',
  salesGoalCents: null,
}

function buildMembershipRepository(members: TeamMember[] = [MEMBER]): IMembershipRepository {
  return {
    findActiveByOrganizationId: vi.fn().mockResolvedValue(members),
  } as unknown as IMembershipRepository
}

function buildUseCase(
  leadRepository: ILeadRepository,
  funnelRepository: IFunnelRepository = buildFunnelRepository({
    listByOrganization: vi.fn().mockResolvedValue([OTHER_FUNNEL, SAMPLE_FUNNEL]),
  }),
  membershipRepository: IMembershipRepository = buildMembershipRepository(),
  notifications?: INotificationRepository,
) {
  return new CreateWebhookLeadUseCase(
    new CreateLeadUseCase(leadRepository, funnelRepository),
    leadRepository,
    funnelRepository,
    membershipRepository,
    notifications,
  )
}

function buildNotificationRepository(): INotificationRepository {
  return {
    notify: vi.fn(),
    syncTaskReminders: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
}

const OWNER: TeamMember = {
  ...MEMBER,
  userId: 'user-owner',
  email: 'dono@empresa.com',
  role: Role.ADMIN,
}
const MANAGER: TeamMember = {
  ...MEMBER,
  userId: 'user-manager',
  email: 'supervisor@empresa.com',
  role: Role.MANAGER,
}
const SUSPENDED_MANAGER: TeamMember = {
  ...MANAGER,
  userId: 'user-manager-off',
  email: 'antigo@empresa.com',
  status: 'SUSPENDED',
}

const INPUT = { organizationId: ORG_ID, name: 'Novo Lead', phone: '(11) 91111-1111' }

describe('CreateWebhookLeadUseCase', () => {
  it('creates the lead in the default funnel, unassigned, with default segment and source', async () => {
    const leadRepository = buildLeadRepository()

    const result = await buildUseCase(leadRepository).execute(INPUT)

    expect(result.created).toBe(true)
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        funnelId: FUNNEL_ID,
        stageId: FIRST_STAGE_ID,
        assignedUserId: null,
        segment: WEBHOOK_DEFAULT_SEGMENT,
        source: WEBHOOK_DEFAULT_SOURCE,
        valueCents: 0,
      }),
    )
  })

  it('returns the existing lead instead of creating a duplicate phone', async () => {
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue(EXISTING_LEAD),
    })

    const result = await buildUseCase(leadRepository).execute(INPUT)

    expect(result).toEqual({ created: false, lead: EXISTING_LEAD })
    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('assigns the lead to the active member with the given e-mail (case-insensitive)', async () => {
    const leadRepository = buildLeadRepository()

    await buildUseCase(leadRepository).execute({
      ...INPUT,
      assignedUserEmail: 'maria@empresa.com',
    })

    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: 'user-maria' }),
    )
  })

  it('rejects an e-mail that is not an active member of the organization', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = buildUseCase(
      leadRepository,
      undefined,
      buildMembershipRepository([{ ...MEMBER, status: 'SUSPENDED' }]),
    )

    await expect(
      useCase.execute({ ...INPUT, assignedUserEmail: 'maria@empresa.com' }),
    ).rejects.toThrow(ValidationError)
    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('uses the given funnel, validated against the organization', async () => {
    const leadRepository = buildLeadRepository()
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn().mockResolvedValue(null),
    })

    await expect(
      buildUseCase(leadRepository, funnelRepository).execute({
        ...INPUT,
        funnelId: 'funnel-other-org',
      }),
    ).rejects.toThrow(ValidationError)
    expect(funnelRepository.findById).toHaveBeenCalledWith('funnel-other-org', ORG_ID)
  })

  it('fails clearly when the organization has no funnel', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([]),
    })

    await expect(
      buildUseCase(buildLeadRepository(), funnelRepository).execute(INPUT),
    ).rejects.toThrow(ValidationError)
  })
})

describe('CreateWebhookLeadUseCase — notifications', () => {
  it('notifies only the assignee when the lead has one', async () => {
    const notifications = buildNotificationRepository()
    const leadRepository = buildLeadRepository({
      create: vi.fn().mockResolvedValue({ ...EXISTING_LEAD, assignedUserId: 'user-maria' }),
    })

    await buildUseCase(
      leadRepository,
      undefined,
      buildMembershipRepository([MEMBER, OWNER, MANAGER]),
      notifications,
    ).execute({ ...INPUT, assignedUserEmail: 'maria@empresa.com' })

    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-maria',
        actorUserId: null,
        type: 'lead.received',
        taskId: null,
        title: EXISTING_LEAD.name,
        metadata: expect.objectContaining({
          leadId: EXISTING_LEAD.id,
          funnelId: EXISTING_LEAD.funnelId,
          assignedToYou: true,
        }),
      }),
    )
  })

  it('notifies active owners and managers when the lead has no assignee', async () => {
    const notifications = buildNotificationRepository()

    await buildUseCase(
      buildLeadRepository(),
      undefined,
      buildMembershipRepository([MEMBER, OWNER, MANAGER, SUSPENDED_MANAGER]),
      notifications,
    ).execute(INPUT)

    const recipients = vi.mocked(notifications.notify).mock.calls.map(([n]) => n.userId)
    expect(recipients.sort()).toEqual(['user-manager', 'user-owner'])
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ assignedToYou: false }) }),
    )
  })

  it('does not notify anyone for a repeated phone', async () => {
    const notifications = buildNotificationRepository()
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue(EXISTING_LEAD),
    })

    await buildUseCase(
      leadRepository,
      undefined,
      buildMembershipRepository([OWNER]),
      notifications,
    ).execute(INPUT)

    expect(notifications.notify).not.toHaveBeenCalled()
  })
})
