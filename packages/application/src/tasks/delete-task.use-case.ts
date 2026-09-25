// DeleteTaskUseCase — remove uma tarefa dentro do escopo do usuário.

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
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
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: DeleteTaskInput): Promise<boolean> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const task = await this.taskRepository.findById(input.id, scope)
    const deleted = await this.taskRepository.delete(input.id, scope)

    if (deleted && task) {
      await this.activityLog.record({
        organizationId: task.organizationId,
        actorUserId: input.userId,
        action: 'task.deleted',
        entityType: 'task',
        entityId: task.id,
        entityLabel: task.title,
        metadata: { type: task.type },
      })
    }

    return deleted
  }
}
