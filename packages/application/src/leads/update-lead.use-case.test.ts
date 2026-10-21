// Tests: UpdateLeadUseCase
//
// Cobre a regra de negócio "só marca Ganho (won: true) a partir da última
// etapa do funil" — antes só era exercitada indiretamente via leads.route.test.ts.

import {
  AuthorizationError,
  DataScope,
  OrganizationType,
  Role,
  ValidationError,
} from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadAdhesionRepository } from '../ports/lead-adhesion.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IStorageProvider } from '../ports/storage.provider'
import { UpdateLeadUseCase } from './update-lead.use-case'

const ORG_ID = 'org-01'
const FUNNEL_ID = 'funnel-01'
const FIRST_STAGE_ID = 'stage-first'
const LAST_STAGE_ID = 'stage-last'
const TARGET_FUNNEL_ID = 'funnel-adm'
const TARGET_FIRST_STAGE_ID = 'stage-target-first'

const MEMBERSHIP: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
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
  lostReason: null,
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
  kind: 'SALES' as const,
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
  name: 'ADM',
  isDefault: false,
  duplicateToFunnelId: null,
  kind: 'BACKOFFICE' as const,
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
    listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL, TARGET_FUNNEL]),
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
    create: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, id: 'lead-copy' }),
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

  describe('won → funil ADM', () => {
    const copyLead = { ...SAMPLE_LEAD, id: 'lead-copy', funnelId: TARGET_FUNNEL_ID }

    function setupWon(options: { before?: Partial<LeadRecord>; funnels?: unknown[] } = {}) {
      const wonLead = { ...SAMPLE_LEAD, stageId: LAST_STAGE_ID, wonAt: new Date() }
      const leadRepository = buildLeadRepository({
        findById: vi
          .fn()
          .mockResolvedValue({ ...SAMPLE_LEAD, stageId: LAST_STAGE_ID, ...options.before }),
        update: vi.fn().mockResolvedValue(wonLead),
        create: vi.fn().mockResolvedValue({ ...copyLead, stageId: TARGET_FIRST_STAGE_ID }),
      })
      const funnelRepository = buildFunnelRepository(
        options.funnels
          ? {
              listByOrganization: vi.fn().mockResolvedValue(options.funnels),
              create: vi.fn().mockResolvedValue(TARGET_FUNNEL),
            }
          : {},
      )
      const leadAdhesionRepository = {
        findByLead: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
        listDocuments: vi.fn().mockResolvedValue([
          {
            id: 'doc-1',
            leadId: SAMPLE_LEAD.id,
            organizationId: ORG_ID,
            kind: 'identity_document',
            fileName: 'cnh.jpg',
            storagePath: `${ORG_ID}/${SAMPLE_LEAD.id}/identity_document-1.jpg`,
            contentType: 'image/jpeg',
            sizeBytes: 10,
            uploadedByUserId: 'user-01',
            createdAt: new Date(),
          },
        ]),
        replaceDocument: vi.fn().mockResolvedValue({ document: {}, previous: null }),
        deleteDocument: vi.fn(),
      } as unknown as ILeadAdhesionRepository
      const storage = {
        copyFile: vi.fn().mockResolvedValue(undefined),
      } as unknown as IStorageProvider
      const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
      const useCase = new UpdateLeadUseCase(
        leadRepository,
        buildOrganizationRepository(),
        funnelRepository,
        activityLog,
        { leadAdhesionRepository, storage },
      )
      return {
        useCase,
        leadRepository,
        funnelRepository,
        leadAdhesionRepository,
        storage,
        activityLog,
      }
    }

    const markWon = {
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { won: true },
    }

    it('copies the won lead into the first stage of the ADM funnel, same seller', async () => {
      const { useCase, leadRepository, activityLog } = setupWon()

      await useCase.execute(markWon)

      expect(leadRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          funnelId: TARGET_FUNNEL_ID,
          stageId: TARGET_FIRST_STAGE_ID,
          name: SAMPLE_LEAD.name,
          assignedUserId: SAMPLE_LEAD.assignedUserId,
        }),
      )
      expect(activityLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'lead.duplicated',
          entityId: 'lead-copy',
          metadata: expect.objectContaining({ toFunnelName: 'ADM', automatic: true }),
        }),
      )
    })

    it('takes the adhesion documents along, copying the files', async () => {
      const { useCase, storage, leadAdhesionRepository } = setupWon()

      await useCase.execute(markWon)

      expect(storage.copyFile).toHaveBeenCalledWith({
        bucket: 'lead-documents',
        from: `${ORG_ID}/${SAMPLE_LEAD.id}/identity_document-1.jpg`,
        to: `${ORG_ID}/lead-copy/identity_document-1.jpg`,
      })
      expect(leadAdhesionRepository.replaceDocument).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: 'lead-copy', kind: 'identity_document' }),
      )
    })

    it('creates the ADM funnel when the organization does not have it yet', async () => {
      const { useCase, funnelRepository } = setupWon({ funnels: [SAMPLE_FUNNEL] })

      await useCase.execute(markWon)

      expect(funnelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ADM', kind: 'BACKOFFICE' }),
      )
    })

    it('does not copy again a lead that was already won', async () => {
      const { useCase, leadRepository } = setupWon({ before: { wonAt: new Date() } })

      await useCase.execute(markWon)

      expect(leadRepository.create).not.toHaveBeenCalled()
    })

    it('copies a lead won in the ADM funnel into the Pós-venda funnel', async () => {
      const postSale = {
        ...TARGET_FUNNEL,
        id: 'funnel-pos',
        name: 'Pós-venda',
        kind: 'POST_SALE' as const,
        stages: [{ ...TARGET_FUNNEL.stages[0], id: 'stage-pos-first', funnelId: 'funnel-pos' }],
      }
      const { useCase, leadRepository, funnelRepository } = setupWon({
        before: { funnelId: TARGET_FUNNEL_ID },
        funnels: [SAMPLE_FUNNEL, TARGET_FUNNEL, postSale],
      })
      // ADM cuja última etapa é a do lead, pra poder ganhar.
      vi.mocked(funnelRepository.findById).mockImplementation(async (id) =>
        id === 'funnel-pos'
          ? (postSale as never)
          : ({
              ...TARGET_FUNNEL,
              stages: [{ ...TARGET_FUNNEL.stages[0], id: LAST_STAGE_ID }],
            } as never),
      )

      await useCase.execute(markWon)

      expect(leadRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ funnelId: 'funnel-pos', stageId: 'stage-pos-first' }),
      )
    })

    it('does not copy a lead won in the Pós-venda funnel (end of the line)', async () => {
      const { useCase, leadRepository, funnelRepository } = setupWon()
      vi.mocked(funnelRepository.findById).mockResolvedValue({
        ...SAMPLE_FUNNEL,
        kind: 'POST_SALE',
      } as never)

      await useCase.execute(markWon)

      expect(leadRepository.create).not.toHaveBeenCalled()
    })
  })

  it('requires the full ADM checklist before marking it as won (Efetivado)', async () => {
    const admLast = {
      ...TARGET_FUNNEL,
      stages: [{ ...TARGET_FUNNEL.stages[0], id: LAST_STAGE_ID }],
    }
    const leadRepository = buildLeadRepository({
      findById: vi
        .fn()
        .mockResolvedValue({ ...SAMPLE_LEAD, funnelId: TARGET_FUNNEL_ID, stageId: LAST_STAGE_ID }),
    })
    const checklistRepository = {
      listChecked: vi
        .fn()
        .mockResolvedValue([
          { itemKey: 'docs_checked', checkedByUserId: 'u', checkedAt: new Date() },
        ]),
      check: vi.fn(),
      uncheck: vi.fn(),
    }
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository({ findById: vi.fn().mockResolvedValue(admLast) }),
      undefined,
      null,
      checklistRepository,
    )

    await expect(
      useCase.execute({
        id: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        changes: { won: true },
      }),
    ).rejects.toThrow('Marque o checklist do ADM')
    expect(leadRepository.update).not.toHaveBeenCalled()
  })

  it('does not let a seller change a lead in the ADM funnel', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, funnelId: TARGET_FUNNEL_ID }),
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
        membership: { ...MEMBERSHIP, role: Role.SELLER },
        changes: { stageId: TARGET_FIRST_STAGE_ID },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(leadRepository.update).not.toHaveBeenCalled()
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

  it('requires a reason to mark a lead as lost', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    for (const lostReason of [undefined, '   ']) {
      await expect(
        useCase.execute({
          id: 'lead-01',
          userId: 'user-01',
          membership: MEMBERSHIP,
          changes: { lost: true, lostReason },
        }),
      ).rejects.toThrow(ValidationError)
    }
    expect(leadRepository.update).not.toHaveBeenCalled()
  })

  it('stores the trimmed reason and logs it with the loss', async () => {
    const leadRepository = buildLeadRepository({
      update: vi.fn().mockResolvedValue({
        ...SAMPLE_LEAD,
        lostAt: new Date(),
        lostReason: 'Achou a parcela alta',
      }),
    })
    const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
    const useCase = new UpdateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
      activityLog,
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      changes: { lost: true, lostReason: '  Achou a parcela alta ' },
    })

    expect(leadRepository.update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ lost: true, lostReason: 'Achou a parcela alta' }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.lost',
        metadata: expect.objectContaining({ reason: 'Achou a parcela alta' }),
      }),
    )
  })

  it('keeps the previous reason when an already lost lead is marked lost again', async () => {
    const leadRepository = buildLeadRepository({
      findById: vi.fn().mockResolvedValue({
        ...SAMPLE_LEAD,
        lostAt: new Date('2026-10-01T00:00:00Z'),
        lostReason: 'Fechou com o banco',
      }),
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
      changes: { lost: true },
    })

    expect(leadRepository.update).toHaveBeenCalledWith(
      'lead-01',
      expect.anything(),
      expect.objectContaining({ lostReason: 'Fechou com o banco' }),
    )
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

  it('skips the phone uniqueness check when the phone is resent unchanged', async () => {
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue({ ...SAMPLE_LEAD, id: 'lead-copy' }),
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
      changes: { name: 'Novo nome', phone: SAMPLE_LEAD.phone },
    })

    expect(leadRepository.findByPhone).not.toHaveBeenCalled()
    expect(leadRepository.update).toHaveBeenCalled()
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
