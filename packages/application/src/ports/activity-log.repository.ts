// IActivityLogRepository — port do log de atividades da organização
// (Configurações > Atividade).
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Os use cases registram os eventos depois que a mudança deu certo. O rótulo
// (entityLabel, ex: nome do lead) e os detalhes (metadata) são gravados como
// estavam no momento do evento — o log continua legível mesmo depois que a
// entidade é editada ou apagada. A frase exibida é montada no frontend a
// partir de action + metadata.

export type ActivityEntityType = 'lead' | 'task' | 'funnel' | 'team' | 'organization'

export type ActivityAction =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.stage_changed'
  | 'lead.assigned'
  | 'lead.won'
  | 'lead.lost'
  | 'lead.reopened'
  | 'lead.deleted'
  | 'lead.duplicated'
  | 'lead.comment_added'
  | 'lead.proposal_created'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.reopened'
  | 'task.deleted'
  | 'funnel.created'
  | 'funnel.updated'
  | 'funnel.deleted'
  | 'team.member_invited'
  | 'team.member_removed'
  | 'team.member_reactivated'
  | 'team.goal_updated'
  | 'organization.updated'
  | 'organization.goal_updated'
  | 'organization.icon_updated'
  | 'organization.branding_updated'
  | 'organization.api_key_created'
  | 'organization.api_key_revoked'

export type ActivityMetadata = Record<string, string | number | boolean | string[] | null>

export interface NewActivityEntry {
  organizationId: string
  /** Quem fez a ação; null quando foi o sistema (ex: "passar o bastão"). */
  actorUserId: string | null
  action: ActivityAction
  entityType: ActivityEntityType
  /** Id da entidade afetada — sem FK, pode já ter sido apagada. */
  entityId: string | null
  /** Rótulo legível no momento do evento (ex: nome do lead, título da tarefa). */
  entityLabel: string | null
  metadata?: ActivityMetadata
}

export interface ActivityActor {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export interface ActivityRecord {
  id: string
  organizationId: string
  actor: ActivityActor | null
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string | null
  entityLabel: string | null
  metadata: ActivityMetadata
  createdAt: Date
}

export interface ActivityListFilter {
  organizationId: string
  entityType?: ActivityEntityType
}

export interface ActivityListPage {
  items: ActivityRecord[]
  total: number
  page: number
  pageSize: number
}

export interface IActivityLogRepository {
  record(entry: NewActivityEntry): Promise<void>

  /** Mais recentes primeiro. */
  list(filter: ActivityListFilter, page: number, pageSize: number): Promise<ActivityListPage>
}

/** Implementação que descarta os eventos — padrão dos use cases quando nenhum
 * log é injetado (testes unitários, API sem banco configurado). */
export const NO_OP_ACTIVITY_LOG: IActivityLogRepository = {
  record: async () => {},
  list: async (_filter, page, pageSize) => ({ items: [], total: 0, page, pageSize }),
}
