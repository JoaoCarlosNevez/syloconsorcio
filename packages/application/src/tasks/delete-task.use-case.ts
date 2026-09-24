// DeleteTaskUseCase — remove uma tarefa dentro do escopo do usuário.

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'

export interface DeleteTaskInput {
  id: string
  userId: string
  membership: MembershipContext
}

export class DeleteTaskUseCase implements UseCase<DeleteTaskInput, boolean> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: DeleteTaskInput): Promise<boolean> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    return this.taskRepository.delete(input.id, scope)
  }
}
