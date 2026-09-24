// Tests: CreateTaskUseCase

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import { CreateTaskUseCase } from './create-task.use-case'

const ORG_ID = 'org-01'
const USER_ID = 'user-01'

const MEMBERSHIP: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  role: Role.SELLER,
  dataScope: DataScope.OWN,
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
  assignedUserId: USER_ID,
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
    sumWonValueCents: vi.fn().mockResolvedValue(0),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function buildTaskRepository(overrides: Partial<ITaskRepository> = {}): ITaskRepository {
  return {
    list: vi.fn(),
    create: vi.fn(
      (input): Promise<TaskRecord> =>
        Promise.resolve({
          id: 'task-01',
          status: 'pendente',
          createdAt: new Date('2026-01-05T00:00:00Z'),
          updatedAt: new Date('2026-01-05T00:00:00Z'),
          leadId: null,
          notes: null,
          ...input,
        }),
    ),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

const DUE_AT = new Date('2026-02-01T12:00:00Z')

describe('CreateTaskUseCase', () => {
  it('defaults assignedUserId to the creator when not provided', async () => {
    const taskRepository = buildTaskRepository()
    const useCase = new CreateTaskUseCase(
      taskRepository,
      buildLeadRepository(),
      buildOrganizationRepository(),
    )

    await useCase.execute({
      userId: USER_ID,
      membership: MEMBERSHIP,
      type: 'Tarefa',
      title: 'Ligar pro cliente',
      dueAt: DUE_AT,
    })

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        assignedUserId: USER_ID,
        createdByUserId: USER_ID,
        leadId: null,
      }),
    )
  })

  it('validates the lead exists within scope when leadId is provided', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const taskRepository = buildTaskRepository()
    const useCase = new CreateTaskUseCase(
      taskRepository,
      leadRepository,
      buildOrganizationRepository(),
    )

    await expect(
      useCase.execute({
        userId: USER_ID,
        membership: MEMBERSHIP,
        leadId: 'lead-outside-scope',
        type: 'Tarefa',
        title: 'Ligar pro cliente',
        dueAt: DUE_AT,
      }),
    ).rejects.toThrow(ValidationError)
    expect(taskRepository.create).not.toHaveBeenCalled()
  })

  it('creates the task linked to the lead when it exists within scope', async () => {
    const taskRepository = buildTaskRepository()
    const useCase = new CreateTaskUseCase(
      taskRepository,
      buildLeadRepository(),
      buildOrganizationRepository(),
    )

    await useCase.execute({
      userId: USER_ID,
      membership: MEMBERSHIP,
      leadId: 'lead-01',
      type: 'Follow-up',
      title: 'Follow-up da proposta',
      dueAt: DUE_AT,
    })

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-01', type: 'Follow-up' }),
    )
  })
})
