// Tests: ClaimTaskUseCase — "Pegar" uma tarefa da fila de um setor.

import { DataScope, OrganizationType, Permission, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import { ClaimTaskUseCase } from './claim-task.use-case'

const ORG_ID = 'org-01'
const USER_ID = 'user-adm'

const ADM_MEMBER: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  sectors: ['adm'],
  role: Role.SELLER,
  dataScope: DataScope.OWN,
  permissions: [Permission.TASK_UPDATE],
}

const QUEUED: TaskRecord = {
  id: 'task-01',
  organizationId: ORG_ID,
  leadId: null,
  assignedUserId: null,
  assignedSector: 'adm',
  createdByUserId: 'user-seller',
  type: 'Pendência',
  title: 'Conferir RG',
  notes: null,
  status: 'pendente',
  dueAt: null,
  completedAt: null,
  createdAt: new Date('2026-01-05T00:00:00Z'),
  updatedAt: new Date('2026-01-05T00:00:00Z'),
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

function buildTaskRepository(
  found: TaskRecord | null,
  claimed: TaskRecord | null,
): ITaskRepository {
  return {
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(found),
    create: vi.fn(),
    update: vi.fn(),
    claim: vi.fn().mockResolvedValue(claimed),
    delete: vi.fn(),
    count: vi.fn(),
  }
}

describe('ClaimTaskUseCase', () => {
  it('assigns the queued task to a member of the sector', async () => {
    const claimed = { ...QUEUED, assignedUserId: USER_ID }
    const tasks = buildTaskRepository(QUEUED, claimed)
    const useCase = new ClaimTaskUseCase(tasks, buildOrganizationRepository())

    const result = await useCase.execute({ id: QUEUED.id, userId: USER_ID, membership: ADM_MEMBER })

    expect(result).toEqual({ ok: true, task: claimed })
    expect(tasks.claim).toHaveBeenCalledWith(QUEUED.id, expect.anything(), USER_ID)
  })

  it('refuses someone outside the sector without task.assign', async () => {
    const tasks = buildTaskRepository(QUEUED, null)
    const useCase = new ClaimTaskUseCase(tasks, buildOrganizationRepository())

    const result = await useCase.execute({
      id: QUEUED.id,
      userId: USER_ID,
      membership: { ...ADM_MEMBER, sectors: ['vendas'] },
    })

    expect(result).toEqual({ ok: false, reason: 'not_in_sector' })
    expect(tasks.claim).not.toHaveBeenCalled()
  })

  it('reports a task someone already took', async () => {
    const tasks = buildTaskRepository({ ...QUEUED, assignedUserId: 'someone' }, null)
    const useCase = new ClaimTaskUseCase(tasks, buildOrganizationRepository())

    const result = await useCase.execute({ id: QUEUED.id, userId: USER_ID, membership: ADM_MEMBER })

    expect(result).toEqual({ ok: false, reason: 'already_claimed' })
  })

  it('reports a lost race when the atomic claim finds it taken', async () => {
    const tasks = buildTaskRepository(QUEUED, null)
    const useCase = new ClaimTaskUseCase(tasks, buildOrganizationRepository())

    const result = await useCase.execute({ id: QUEUED.id, userId: USER_ID, membership: ADM_MEMBER })

    expect(result).toEqual({ ok: false, reason: 'already_claimed' })
  })
})
