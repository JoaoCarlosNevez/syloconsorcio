// UpdateTaskUseCase — atualiza campos e/ou status de uma tarefa dentro do
// escopo do usuário (mesmo DataScope de leads).

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
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
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateTaskUseCaseInput): Promise<TaskRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const before = await this.taskRepository.findById(input.id, scope)
    const updated = await this.taskRepository.update(input.id, scope, input.changes)
    if (!updated || !before) return updated

    const base = {
      organizationId: updated.organizationId,
      actorUserId: input.userId,
      entityType: 'task' as const,
      entityId: updated.id,
      entityLabel: updated.title,
    }
    if (before.status !== 'concluida' && updated.status === 'concluida') {
      await this.activityLog.record({
        ...base,
        action: 'task.completed',
        metadata: { type: updated.type },
      })
    } else if (before.status === 'concluida' && updated.status !== 'concluida') {
      await this.activityLog.record({
        ...base,
        action: 'task.reopened',
        metadata: { type: updated.type },
      })
    }

    const changedFields = (Object.keys(input.changes) as (keyof typeof input.changes)[]).filter(
      (field) =>
        field !== 'status' &&
        input.changes[field] !== undefined &&
        JSON.stringify(before[field]) !== JSON.stringify(updated[field]),
    )
    if (changedFields.length > 0) {
      await this.activityLog.record({
        ...base,
        action: 'task.updated',
        metadata: { type: updated.type, fields: changedFields },
      })
    }

    return updated
  }
}
