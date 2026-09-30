// Tests: CreateLeadProposalUseCase — guarda de entrada menor que o valor da
// cota, checado contra o valueCents real do lead, nunca confiado ao cliente.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { ILeadProposalRepository, LeadProposalRecord } from '../ports/lead-proposal.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { CreateLeadProposalUseCase } from './create-lead-proposal.use-case'

const ORG_ID = 'org-01'

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
  valueCents: 100_000_00,
  quotaCount: 1,
  source: 'SITE',
  funnelId: 'funnel-01',
  stageId: 'stage-01',
  assignedUserId: null,
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: [],
  notes: null,
  profession: 'Engenheiro',
  incomeCents: 10_000_00,
  maritalStatus: 'Casado(a)',
  cpf: '123.456.789-00',
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

function buildLeadRepository(overrides: Partial<ILeadRepository> = {}): ILeadRepository {
  return {
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    create: vi.fn(),
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

function buildLeadProposalRepository(
  overrides: Partial<ILeadProposalRepository> = {},
): ILeadProposalRepository {
  return {
    listByLead: vi.fn().mockResolvedValue([]),
    create: vi.fn(
      (input): Promise<LeadProposalRecord> =>
        Promise.resolve({
          id: 'proposal-01',
          createdAt: new Date('2026-01-05T00:00:00Z'),
          ...input,
        }),
    ),
    ...overrides,
  }
}

describe('CreateLeadProposalUseCase', () => {
  it('returns null when the lead does not exist or is out of scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new CreateLeadProposalUseCase(
      leadRepository,
      buildOrganizationRepository(),
      buildLeadProposalRepository(),
    )

    const result = await useCase.execute({
      leadId: 'missing',
      userId: 'user-01',
      membership: MEMBERSHIP,
      downPaymentCents: 10_000_00,
      termMonths: 24,
    })

    expect(result).toBeNull()
  })

  it('creates the proposal with the given down payment and term', async () => {
    const leadProposalRepository = buildLeadProposalRepository()
    const useCase = new CreateLeadProposalUseCase(
      buildLeadRepository(),
      buildOrganizationRepository(),
      leadProposalRepository,
    )

    await useCase.execute({
      leadId: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      downPaymentCents: 20_000_00,
      termMonths: 24,
    })

    expect(leadProposalRepository.create).toHaveBeenCalledWith({
      leadId: 'lead-01',
      downPaymentCents: 20_000_00,
      termMonths: 24,
      tableName: null,
      installments: null,
    })
  })

  it('stores installment ranges that cover the whole term', async () => {
    const leadProposalRepository = buildLeadProposalRepository()
    const useCase = new CreateLeadProposalUseCase(
      buildLeadRepository(),
      buildOrganizationRepository(),
      leadProposalRepository,
    )
    const installments = [
      { from: 1, to: 12, amountCents: 1_500_00 },
      { from: 13, to: 24, amountCents: 1_200_00 },
    ]

    await useCase.execute({
      leadId: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      downPaymentCents: 20_000_00,
      termMonths: 24,
      installments,
    })

    expect(leadProposalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ installments }),
    )
  })

  it.each([
    ['do not start at the first installment', [{ from: 2, to: 24, amountCents: 1_000_00 }]],
    [
      'leave a gap',
      [
        { from: 1, to: 10, amountCents: 1_000_00 },
        { from: 12, to: 24, amountCents: 900_00 },
      ],
    ],
    ['stop before the end of the term', [{ from: 1, to: 20, amountCents: 1_000_00 }]],
    ['go past the end of the term', [{ from: 1, to: 30, amountCents: 1_000_00 }]],
    ['are empty', []],
  ])('rejects installment ranges that %s', async (_label, installments) => {
    const leadProposalRepository = buildLeadProposalRepository()
    const useCase = new CreateLeadProposalUseCase(
      buildLeadRepository(),
      buildOrganizationRepository(),
      leadProposalRepository,
    )

    await expect(
      useCase.execute({
        leadId: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        downPaymentCents: 20_000_00,
        termMonths: 24,
        installments,
      }),
    ).rejects.toThrow(ValidationError)
    expect(leadProposalRepository.create).not.toHaveBeenCalled()
  })

  it('stores the table name used in the simulation', async () => {
    const leadProposalRepository = buildLeadProposalRepository()
    const useCase = new CreateLeadProposalUseCase(
      buildLeadRepository(),
      buildOrganizationRepository(),
      leadProposalRepository,
    )

    await useCase.execute({
      leadId: 'lead-01',
      userId: 'user-01',
      membership: MEMBERSHIP,
      downPaymentCents: 20_000_00,
      termMonths: 24,
      tableName: 'Tabela Imóvel 2026',
    })

    expect(leadProposalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tableName: 'Tabela Imóvel 2026' }),
    )
  })

  it('rejects a down payment greater than or equal to the lead value', async () => {
    const leadProposalRepository = buildLeadProposalRepository()
    const useCase = new CreateLeadProposalUseCase(
      buildLeadRepository(),
      buildOrganizationRepository(),
      leadProposalRepository,
    )

    await expect(
      useCase.execute({
        leadId: 'lead-01',
        userId: 'user-01',
        membership: MEMBERSHIP,
        downPaymentCents: 100_000_00,
        termMonths: 24,
      }),
    ).rejects.toThrow(ValidationError)
    expect(leadProposalRepository.create).not.toHaveBeenCalled()
  })
})
