// CreateTaskUseCase — cria uma tarefa, opcionalmente ligada a um lead.
//
// assignedUserId, quando ausente, é o próprio criador (mesmo padrão de "todo
// lead nasce atribuído a quem criou" — ver create-lead.use-case.ts). Quando
// leadId é informado, valida que o lead existe dentro do escopo do usuário —
// nunca confia num leadId de outra organização vindo do cliente.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'

export interface CreateTaskInput {
  userId: string
  membership: MembershipContext
  leadId?: string | null
  assignedUserId?: string | null
  type: string
  title: string
  notes?: string | null
  dueAt: Date
}

export class CreateTaskUseCase implements UseCase<CreateTaskInput, TaskRecord> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: CreateTaskInput): Promise<TaskRecord> {
    let leadName: string | null = null
    if (input.leadId) {
      const scope = await resolveLeadScope(
        input.membership,
        input.userId,
        this.organizationRepository,
      )
      const lead = await this.leadRepository.findById(input.leadId, scope)
      if (!lead) {
        throw new ValidationError([{ field: 'leadId', message: 'Lead não encontrado.' }])
      }
      leadName = lead.name
    }

    const task = await this.taskRepository.create({
      organizationId: input.membership.organizationId,
      leadId: input.leadId ?? null,
      assignedUserId: input.assignedUserId ?? input.userId,
      createdByUserId: input.userId,
      type: input.type,
      title: input.title,
      notes: input.notes ?? null,
      dueAt: input.dueAt,
    })

    await this.activityLog.record({
      organizationId: task.organizationId,
      actorUserId: input.userId,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      entityLabel: task.title,
      metadata: {
        type: task.type,
        dueAt: task.dueAt.toISOString(),
        leadName,
        assignedUserId: task.assignedUserId,
      },
    })

    return task
  }
}
