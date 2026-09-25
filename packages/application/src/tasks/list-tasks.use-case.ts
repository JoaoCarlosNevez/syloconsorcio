// ListTasksUseCase — lista tarefas paginadas, filtradas pelo DataScope ativo.
//
// A checagem de Permission (task.read) acontece na camada HTTP — ver
// apps/api/src/routes/tasks.route.ts. Este use case cuida apenas da
// resolução de escopo de dados e da paginação server-side (regra P0).

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskListPage, TaskStatusFilter } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 25

export interface ListTasksInput {
  userId: string
  membership: MembershipContext
  leadId?: string
  status?: TaskStatusFilter
  /** Só as tarefas atribuídas ao próprio usuário, mesmo com DataScope mais
   * amplo (ex: card de Tarefas do início de um Supervisor). */
  onlyMine?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export class ListTasksUseCase implements UseCase<ListTasksInput, TaskListPage> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: ListTasksInput): Promise<TaskListPage> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE))

    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )

    return this.taskRepository.list(
      {
        ...scope,
        ...(input.onlyMine ? { assignedUserId: input.userId } : {}),
        leadId: input.leadId,
        status: input.status,
        search: input.search,
      },
      page,
      pageSize,
    )
  }
}
