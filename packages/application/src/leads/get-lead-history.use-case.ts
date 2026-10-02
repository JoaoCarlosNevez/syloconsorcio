// GetLeadHistoryUseCase — feed combinado de histórico de atribuição,
// comentários, mudanças de etapa e de resultado (ganho/perdido/reaberto).
// Etapa e resultado vêm do log de atividades, que já guarda quem fez e os
// dados do momento (nomes das etapas, valor do lead).
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

/** Lead marcado como ganho/perdido ou reaberto. */
export interface LeadOutcomeChange {
  id: string
  changedAt: Date
  changedByUserId: string | null
  outcome: 'won' | 'lost' | 'reopened'
  /** Valor do lead na hora (ganho/perdido). */
  valueCents: number | null
  /** Reaberto de quê — null fora do 'reopened'. */
  reopenedFrom: 'won' | 'lost' | null
}

export interface LeadHistory {
  assignmentHistory: AssignmentHistoryRecord[]
  comments: LeadCommentRecord[]
  /** Mais recente primeiro. Só desde que o log de atividades existe. */
  stageChanges: LeadStageChange[]
  /** Mais recente primeiro. Só desde que o log de atividades existe. */
  outcomeChanges: LeadOutcomeChange[]
}

const OUTCOME_BY_ACTION = {
  'lead.won': 'won',
  'lead.lost': 'lost',
  'lead.reopened': 'reopened',
} as const

/** Teto de eventos do log no histórico — bem acima do que um lead tem. */
const MAX_LOG_EVENTS = 300

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

    const [assignmentHistory, comments, log] = await Promise.all([
      this.leadRepository.listAssignmentHistory(input.id),
      this.leadRepository.listComments(input.id),
      this.activityLog.list(
        {
          organizationId: lead.organizationId,
          entityType: 'lead',
          entityId: lead.id,
          actions: ['lead.stage_changed', 'lead.won', 'lead.lost', 'lead.reopened'],
        },
        1,
        MAX_LOG_EVENTS,
      ),
    ])

    const stageChanges: LeadStageChange[] = []
    const outcomeChanges: LeadOutcomeChange[] = []
    for (const entry of log.items) {
      const base = {
        id: entry.id,
        changedAt: entry.createdAt,
        changedByUserId: entry.actor?.id ?? null,
      }
      if (entry.action === 'lead.stage_changed') {
        stageChanges.push({
          ...base,
          fromStage: metadataString(entry.metadata.fromStage),
          toStage: metadataString(entry.metadata.toStage),
        })
      } else if (entry.action in OUTCOME_BY_ACTION) {
        const from = entry.metadata.from
        outcomeChanges.push({
          ...base,
          outcome: OUTCOME_BY_ACTION[entry.action as keyof typeof OUTCOME_BY_ACTION],
          valueCents:
            typeof entry.metadata.valueCents === 'number' ? entry.metadata.valueCents : null,
          reopenedFrom: from === 'won' || from === 'lost' ? from : null,
        })
      }
    }

    return { assignmentHistory, comments, stageChanges, outcomeChanges }
  }
}
