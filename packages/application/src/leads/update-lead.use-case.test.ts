// Tests: UpdateLeadUseCase
//
// Cobre a regra de negócio "só marca Ganho (won: true) a partir da última
// etapa do funil" — antes só era exercitada indiretamente via leads.route.test.ts.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { UpdateLeadUseCase } from './update-lead.use-case'

const ORG_ID = 'org-01'
const FUNNEL_ID = 'funnel-01'
const FIRST_STAGE_ID = 'stage-first'
const LAST_STAGE_ID = 'stage-last'
const TARGET_FUNNEL_ID = 'funnel-target'
const TARGET_FIRST_STAGE_ID = 'stage-target-first'

const MEMBERSHIP: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  role: Role.MANAGER,
  dataScope: DataScope.REPRESENTATION,
  permissions: [],
}

const SAMPLE_LEAD: LeadRecord = {
  id: 'lead-01',
  organizationId: ORG_ID,
  name: 'Fulano',
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

const SAMPLE_FUNNEL = {
  id: FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [
    { id: FIRST_STAGE_ID, funnelId: FUNNEL_ID, name: 'Lead', color: '#000', position: 0 },
    { id: LAST_STAGE_ID, funnelId: FUNNEL_ID, name: 'Fechado', color: '#000', position: 1 },
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
    {
      id: TARGET_FIRST_STAGE_ID,
      funnelId: TARGET_FUNNEL_ID,
      name: 'Novo',
      color: '#000',
      position: 0,
    },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
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
    findById: vi.fn((id: string) => {
      if (id === TARGET_FUNNEL_ID) return Promise.resolve(TARGET_FUNNEL)
      return Promise.resolve(SAMPLE_FUNNEL)
    }),
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
    findById: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(SAMPLE_LEAD),
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

describe('UpdateLeadUseCase', () => {
  it('marks the lead as won when it is at the last stage of its funnel', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID }),
      update: vi
        .fn()
        .mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID, wonAt: new Date() }),
    })
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    const result = await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { won: true },
    })

    expect(result?.wonAt).not.toBeNull()
  })

  it('rejects marking as won when the lead is not at the last stage', async () => {
    const leadRepository = buildLeadRepository() // SAMPLE_LEAD.stageId = FIRST_STAGE_ID
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await expect(
      useCase.execute({
        id: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        changes: { won: true },
      }),
    ).rejects.toThrow(ValidationError)
    expect(leadRepository.update).not.toHaveBeenCalled()
  })

  it('always allows reopening (won: false), regardless of stage', async () => {
    const leadRepository = buildLeadRepository({
      update: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, wonAt: null }),
    })
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    const result = await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { won: false },
    })

    expect(result?.wonAt).toBeNull()
    expect(leadRepository.update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ won: false }),
    )
  })

  it('records an assignment change only when assignedUserId actually changes', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, assignedUserId: 'user-old' }),
      update: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, assignedUserId: 'user-new' }),
    })
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { assignedUserId: 'user-new' },
    })

    expect(leadRepository.recordAssignmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-01',
        fromUserId: 'user-old',
        toUserId: 'user-new',
        changedByUserId: 'user-01',
      }),
    )
  })

  it('duplicates the lead into duplicateToFunnelId when marking it as won', async () => {
    const wonLead = { ...SAMPLE_LEAD, stageId: LAST_STAGE_ID, wonAt: new Date() }
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID }),
      update: vi.fn().mockResolvedValue(wonLead),
      create: vi.fn().mockResolvedValue({
        ...SAMPLE_LEAD,
        id: 'lead-copy',
        funnelId: TARGET_FUNNEL_ID,
        stageId: TARGET_FIRST_STAGE_ID,
      }),
    })
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn((id: string) => {
        if (id === TARGET_FUNNEL_ID) return Promise.resolve(TARGET_FUNNEL)
        return Promise.resolve({ ...SAMPLE_FUNNEL, duplicateToFunnelId: TARGET_FUNNEL_ID })
      }),
    })
    const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      funnelRepository,
      activityLog,
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { won: true },
    })

    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        funnelId: TARGET_FUNNEL_ID,
        stageId: TARGET_FIRST_STAGE_ID,
        name: wonLead.name,
      }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lead.won', actorUserId: 'user-01' }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.duplicated',
        actorUserId: null,
        entityId: 'lead-copy',
        metadata: expect.objectContaining({ toFunnelName: 'Instalação', automatic: true }),
      }),
    )
  })

  it('records the stage change and edited fields in the activity log', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: FIRST_STAGE_ID }),
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_LEAD,
        stageId: LAST_STAGE_ID,
        valueCents: SAMPLE_LEAD.valueCents + 100_00,
      }),
    })
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    })
    const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      funnelRepository,
      activityLog,
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { stageId: LAST_STAGE_ID, valueCents: SAMPLE_LEAD.valueCents + 100_00 },
    })

    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.stage_changed',
        metadata: expect.objectContaining({ fromStage: 'Lead', toStage: 'Fechado' }),
      }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.updated',
        metadata: { fields: ['valueCents'] },
      }),
    )
  })

  it('does not duplicate the lead when duplicateToFunnelId is not configured', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID }),
      update: vi
        .fn()
        .mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID, wonAt: new Date() }),
    })
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { won: true },
    })

    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('rejects changing the phone to one already used by another lead in the org', async () => {
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, id: 'lead-other' }),
    })
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await expect(
      useCase.execute({
        id: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        changes: { phone: '(11) 92222-2222' },
      }),
    ).rejects.toThrow(ValidationError)
    expect(leadRepository.update).not.toHaveBeenCalled()
  })

  it('does not record an assignment change when assignedUserId is unset', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { name: 'Novo nome' },
    })

    expect(leadRepository.recordAssignmentChange).not.toHaveBeenCalled()
  })
})
