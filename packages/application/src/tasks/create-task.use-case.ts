// CreateTaskUseCase — cria uma tarefa, opcionalmente ligada a um lead.
//
// assignedUserId, quando ausente, é o próprio criador (mesmo padrão de "todo
// lead nasce atribuído a quem criou" — ver create-lead.use-case.ts). Quando
// leadId é informado, valida que o lead existe dentro do escopo do usuário —
// nunca confia num leadId de outra organização vindo do cliente.
//
// Quando a tarefa é criada para outra pessoa, o responsável é notificado.
//
// assignedSector manda a tarefa pra fila de um setor (sem pessoa): todos os
// membros ativos do setor são avisados e quem pegar primeiro vira o
// responsável (ClaimTaskUseCase). Não combina com assignedUserId.
//
// dueAt null = sem prazo (pedidos do chat).

import { type MemberSector, ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord, TaskStatus } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'

export interface CreateTaskInput {
  userId: string
  membership: MembershipContext
  leadId?: string | null
  assignedUserId?: string | null
  /** Manda pra fila do setor em vez de uma pessoa. */
  assignedSector?: MemberSector | null
  type: string
  title: string
  notes?: string | null
  /** null = sem prazo. */
  dueAt: Date | null
  /** 'concluida' registra algo já feito (botões "Registrar agora" do lead). */
  status?: TaskStatus
}

export class CreateTaskUseCase implements UseCase<CreateTaskInput, TaskRecord> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
    private readonly sectorMembers?: Pick<IMembershipRepository, 'findActiveUserIdsBySector'>,
  ) {}

  async execute(input: CreateTaskInput): Promise<TaskRecord> {
    const sector = input.assignedSector ?? null
    if (sector && input.assignedUserId) {
      throw new ValidationError([
        { field: 'assignedSector', message: 'Escolha uma pessoa ou um setor, não os dois.' },
      ])
    }

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
      assignedUserId: sector ? null : (input.assignedUserId ?? input.userId),
      assignedSector: sector,
      createdByUserId: input.userId,
      type: input.type,
      title: input.title,
      notes: input.notes ?? null,
      dueAt: input.dueAt,
      status: input.status ?? 'pendente',
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
        dueAt: task.dueAt?.toISOString() ?? null,
        leadName,
        assignedUserId: task.assignedUserId,
        assignedSector: task.assignedSector,
        status: task.status,
      },
    })

    const recipients = await this.recipients(task, input.userId)
    for (const userId of recipients) {
      await this.notifications.notify({
        organizationId: task.organizationId,
        userId,
        actorUserId: input.userId,
        type: 'task.assigned',
        taskId: task.id,
        title: task.title,
        metadata: {
          taskType: task.type,
          dueAt: task.dueAt?.toISOString() ?? null,
          leadName,
          sector: task.assignedSector,
        },
      })
    }

    return task
  }

  /** Quem é avisado: o responsável, ou todo o setor quando vai pra fila —
   * nunca quem criou. */
  private async recipients(task: TaskRecord, creatorId: string): Promise<string[]> {
    if (task.assignedUserId) {
      return task.assignedUserId === creatorId ? [] : [task.assignedUserId]
    }
    if (!task.assignedSector || !this.sectorMembers) return []
    const members = await this.sectorMembers.findActiveUserIdsBySector(
      task.organizationId,
      task.assignedSector,
    )
    return members.filter((userId) => userId !== creatorId)
  }
}
