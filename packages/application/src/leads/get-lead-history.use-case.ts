// GetLeadHistoryUseCase — feed combinado de histórico de atribuição,
// comentários e mudanças de etapa (estas vêm do log de atividades, que já
// guarda quem moveu e os nomes das etapas no momento da mudança).
//
// Usa a mesma resolução de escopo que GetLeadUseCase: só retorna o histórico
// se o lead existir e estiver dentro do DataScope do usuário.

import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type {
  AssignmentHistoryRecord,
  ILeadRepository,
  LeadCommentRecord,
} from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface GetLeadHistoryInput {
  id: string
  userId: string
  membership: MembershipContext
}

/** Lead movido de etapa. Nomes como eram na hora — a etapa pode ter sido
 * renomeada ou apagada depois. */
export interface LeadStageChange {
  id: string
  changedAt: Date
  /** null se quem moveu foi removido da plataforma. */
  changedByUserId: string | null
  fromStage: string | null
  toStage: string | null
}

export interface LeadHistory {
  assignmentHistory: AssignmentHistoryRecord[]
  comments: LeadCommentRecord[]
  /** Mais recente primeiro. Só desde que o log de atividades existe. */
  stageChanges: LeadStageChange[]
}

/** Teto de mudanças de etapa no histórico — bem acima do que um lead tem. */
const MAX_STAGE_CHANGES = 200

function metadataString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export class GetLeadHistoryUseCase implements UseCase<GetLeadHistoryInput, LeadHistory | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: GetLeadHistoryInput): Promise<LeadHistory | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.id, scope)
    if (!lead) return null

    const [assignmentHistory, comments, stageLog] = await Promise.all([
      this.leadRepository.listAssignmentHistory(input.id),
      this.leadRepository.listComments(input.id),
      this.activityLog.list(
        {
          organizationId: lead.organizationId,
          entityType: 'lead',
          entityId: lead.id,
          actions: ['lead.stage_changed'],
        },
        1,
        MAX_STAGE_CHANGES,
      ),
    ])

    const stageChanges = stageLog.items.map((entry) => ({
      id: entry.id,
      changedAt: entry.createdAt,
      changedByUserId: entry.actor?.id ?? null,
      fromStage: metadataString(entry.metadata.fromStage),
      toStage: metadataString(entry.metadata.toStage),
    }))

    return { assignmentHistory, comments, stageChanges }
  }
}
