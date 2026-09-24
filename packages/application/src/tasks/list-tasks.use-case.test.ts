// Tests: ListTasksUseCase — resolução de escopo (DataScope.OWN restringe por
// assignedUserId) e paginação.

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskListPage } from '../ports/task.repository'
import { ListTasksUseCase } from './list-tasks.use-case'

const ORG_ID = 'org-01'
const USER_ID = 'user-01'

const EMPTY_PAGE: TaskListPage = { items: [], total: 0, page: 1, pageSize: 25 }

function buildOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  }
}

function buildTaskRepository(overrides: Partial<ITaskRepository> = {}): ITaskRepository {
  return {
    list: vi.fn().mockResolvedValue(EMPTY_PAGE),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

describe('ListTasksUseCase', () => {
  it('restricts by assignedUserId for DataScope.OWN (Vendedor)', async () => {
    const membership: MembershipContext = {
      organizationId: ORG_ID,
      organizationType: OrganizationType.REPRESENTACAO,
      organizationName: 'Representação Teste',
      organizationIconUrl: null,
      role: Role.SELLER,
      dataScope: DataScope.OWN,
      permissions: [],
    }
    const taskRepository = buildTaskRepository()
    const useCase = new ListTasksUseCase(taskRepository, buildOrganizationRepository())

    await useCase.execute({ userId: USER_ID, membership })

    expect(taskRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ organizationIds: [ORG_ID], assignedUserId: USER_ID }),
      1,
      25,
    )
  })

  it('does not restrict by assignedUserId for DataScope.REPRESENTATION (Supervisor)', async () => {
    const membership: MembershipContext = {
      organizationId: ORG_ID,
      organizationType: OrganizationType.REPRESENTACAO,
      organizationName: 'Representação Teste',
      organizationIconUrl: null,
      role: Role.MANAGER,
      dataScope: DataScope.REPRESENTATION,
      permissions: [],
    }
    const taskRepository = buildTaskRepository()
    const useCase = new ListTasksUseCase(taskRepository, buildOrganizationRepository())

    await useCase.execute({ userId: USER_ID, membership })

    const callArgs = (taskRepository.list as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callArgs[0].assignedUserId).toBeUndefined()
  })

  it('clamps page and pageSize to sane bounds', async () => {
    const membership: MembershipContext = {
      organizationId: ORG_ID,
      organizationType: OrganizationType.REPRESENTACAO,
      organizationName: 'Representação Teste',
      organizationIconUrl: null,
      role: Role.MANAGER,
      dataScope: DataScope.REPRESENTATION,
      permissions: [],
    }
    const taskRepository = buildTaskRepository()
    const useCase = new ListTasksUseCase(taskRepository, buildOrganizationRepository())

    await useCase.execute({ userId: USER_ID, membership, page: 0, pageSize: 9999 })

    expect(taskRepository.list).toHaveBeenCalledWith(expect.anything(), 1, 100)
  })
})
