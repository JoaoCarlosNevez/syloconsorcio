// UpdateTaskUseCase — atualiza campos e/ou status de uma tarefa dentro do
// escopo do usuário (mesmo DataScope de leads).

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord, UpdateTaskInput } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTaskUseCaseInput {
  id: string
  userId: string
  membership: MembershipContext
  changes: UpdateTaskInput
}

export class UpdateTaskUseCase implements UseCase<UpdateTaskUseCaseInput, TaskRecord | null> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: UpdateTaskUseCaseInput): Promise<TaskRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    return this.taskRepository.update(input.id, scope, input.changes)
  }
}
