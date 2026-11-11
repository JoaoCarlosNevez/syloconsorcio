// ClaimTaskUseCase — "Pegar" uma tarefa da fila de um setor: quem pega vira o
// responsável. Só quem é do setor pode pegar (ou quem pode atribuir tarefas,
// como Dono e Supervisor). Se outra pessoa pegou antes, retorna o motivo em
// vez de sobrescrever.

import { Permission } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'
import { resolveTaskScope } from './task-scope'

export interface ClaimTaskInput {
  id: string
  userId: string
  membership: MembershipContext
}

export type ClaimTaskResult =
  | { ok: true; task: TaskRecord }
  | { ok: false; reason: 'not_found' | 'already_claimed' | 'not_in_sector' }

export class ClaimTaskUseCase implements UseCase<ClaimTaskInput, ClaimTaskResult> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: ClaimTaskInput): Promise<ClaimTaskResult> {
    const scope = await resolveTaskScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const task = await this.taskRepository.findById(input.id, scope)
    if (!task) return { ok: false, reason: 'not_found' }
    if (task.assignedUserId) return { ok: false, reason: 'already_claimed' }

    const canAssign = input.membership.permissions.includes(Permission.TASK_ASSIGN)
    const inSector =
      task.assignedSector !== null && input.membership.sectors.includes(task.assignedSector)
    if (!canAssign && !inSector) return { ok: false, reason: 'not_in_sector' }

    const claimed = await this.taskRepository.claim(input.id, scope, input.userId)
    if (!claimed) return { ok: false, reason: 'already_claimed' }

    await this.activityLog.record({
      organizationId: claimed.organizationId,
      actorUserId: input.userId,
      entityType: 'task',
      entityId: claimed.id,
      entityLabel: claimed.title,
      action: 'task.claimed',
      metadata: { type: claimed.type, sector: claimed.assignedSector },
    })
    return { ok: true, task: claimed }
  }
}
