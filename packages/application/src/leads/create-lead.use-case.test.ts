// Tests: CreateLeadUseCase
//
// Cobre a regra "telefone único por organização" — antes só era exercitada
// indiretamente via leads.route.test.ts.

import { ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import { CreateLeadUseCase } from './create-lead.use-case'

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

const VALID_INPUT = {
  organizationId: ORG_ID,
  funnelId: FUNNEL_ID,
  name: 'Novo Lead',
  phone: '(11) 91111-1111',
  segment: 'Imobiliário',
  valueCents: 1_000_00,
  source: 'SITE',
}

describe('CreateLeadUseCase', () => {
  it('rejects when a lead with the same phone already exists in the organization', async () => {
    const leadRepository = buildLeadRepository({
      findByPhone: vi.fn().mockResolvedValue(EXISTING_LEAD),
    })
    const useCase = new CreateLeadUseCase(leadRepository, buildFunnelRepository())

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(ValidationError)
    expect(leadRepository.create).not.toHaveBeenCalled()
  })

  it('ignores phone formatting when checking for duplicates', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new CreateLeadUseCase(leadRepository, buildFunnelRepository())

    await useCase.execute(VALID_INPUT)

    expect(leadRepository.findByPhone).toHaveBeenCalledWith(ORG_ID, VALID_INPUT.phone)
  })

  it('creates the lead in the first stage of the funnel when the phone is free', async () => {
    const leadRepository = buildLeadRepository()
    const useCase = new CreateLeadUseCase(leadRepository, buildFunnelRepository())

    await useCase.execute(VALID_INPUT)

    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ stageId: FIRST_STAGE_ID }),
    )
  })
})
