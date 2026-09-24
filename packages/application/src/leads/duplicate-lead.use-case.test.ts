// Tests: DuplicateLeadUseCase — transferência manual de um lead pra outro funil.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { DuplicateLeadUseCase } from './duplicate-lead.use-case'

const ORG_ID = 'org-01'
const SOURCE_FUNNEL_ID = 'funnel-source'
const TARGET_FUNNEL_ID = 'funnel-target'
const TARGET_FIRST_STAGE_ID = 'stage-target-first'

const MEMBERSHIP: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.MANAGER,
  dataScope: DataScope.REPRESENTATION,
  permissions: [],
}

const SOURCE_LEAD: LeadRecord = {
  id: 'lead-01',
  organizationId: ORG_ID,
  name: 'Fulano',
  phone: '(11) 90000-0000',
  email: null,
  segment: 'Imobiliário',
  valueCents: 1_000_00,
  quotaCount: 1,
  source: 'SITE',
  funnelId: SOURCE_FUNNEL_ID,
  stageId: 'stage-source-first',
  assignedUserId: 'user-01',
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: ['Quente'],
  notes: 'Anotação original.',
  profession: null,
  incomeCents: null,
  maritalStatus: null,
  cpf: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const SOURCE_FUNNEL: FunnelRecord = {
  id: SOURCE_FUNNEL_ID,
  organizationId: ORG_ID,
  name: 'Vendas',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [
    {
      id: 'stage-source-first',
      funnelId: SOURCE_FUNNEL_ID,
      name: 'Lead',
      color: '#000',
      position: 0,
    },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const TARGET_FUNNEL: FunnelRecord = {
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
    listByOrganization: vi.fn().mockResolvedValue([SOURCE_FUNNEL, TARGET_FUNNEL]),
    findById: vi.fn((id: string) => {
      if (id === TARGET_FUNNEL_ID) return Promise.resolve(TARGET_FUNNEL)
      if (id === SOURCE_FUNNEL_ID) return Promise.resolve(SOURCE_FUNNEL)
      return Promise.resolve(null)
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
    findById: vi.fn().mockResolvedValue(SOURCE_LEAD),
    create: vi.fn().mockResolvedValue({ ...SOURCE_LEAD, id: 'lead-02' }),
    update: vi.fn(),
    delete: vi.fn(),
    recordAssignmentChange: vi.fn(),
    listAssignmentHistory: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
    sumWonValueCents: vi.fn().mockResolvedValue(0),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('DuplicateLeadUseCase', () => {
  it('returns null when the source lead does not exist', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new DuplicateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    const result = await useCase.execute({
      id: 'missing',
      userId: 'user-01',
      membership: MEMBERSHIP,
      targetFunnelId: TARGET_FUNNEL_ID,
    })

    expect(result).toBeNull()
  })

  it('creates a copy in the first stage of the target funnel', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new DuplicateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await useCase.execute({
      id: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      targetFunnelId: TARGET_FUNNEL_ID,
    })

    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SOURCE_LEAD.name,
        phone: SOURCE_LEAD.phone,
        funnelId: TARGET_FUNNEL_ID,
        stageId: TARGET_FIRST_STAGE_ID,
        assignedUserId: SOURCE_LEAD.assignedUserId,
        tags: SOURCE_LEAD.tags,
        notes: expect.stringContaining(SOURCE_LEAD.name),
      }),
    )
  })

  it('rejects when the target funnel does not exist', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new DuplicateLeadUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildFunnelRepository(),
    )

    await expect(
      useCase.execute({
        id: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        targetFunnelId: 'missing-funnel',
      }),
    ).rejects.toThrow(ValidationError)
    expect(leadRepository.create).not.toHaveBeenCalled()
  })
})
