// INotificationRepository — port das notificações in-app (o sininho).
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Dois jeitos de uma notificação nascer:
//   - por ação de alguém — os use cases de tarefa chamam notify() depois que a
//     mudança deu certo (ex: tarefa atribuída a outra pessoa);
//   - por tempo — syncTaskReminders() gera os lembretes "vence em breve" e
//     "atrasada" das tarefas abertas do usuário. É idempotente (dedupe por
//     tarefa + prazo) e roda a cada leitura do sininho, então dispensa um job
//     agendado: o front consulta periodicamente e o lembrete aparece sozinho.
//
// A frase exibida é montada no frontend a partir de type + metadata.
//
// 'lead.received' (lead que chegou pelo webhook) não tem coluna própria: o
// id do lead e do funil vão em metadata.leadId/funnelId, e title é o nome do
// lead.
//
// 'lead.offered' (a fila de distribuição ofereceu um lead do webhook ao
// usuário) traz metadata.leadId/funnelId/offerId/expiresAt — o usuário
// precisa aceitar até expiresAt. 'lead.received' com metadata.queueExhausted
// avisa Dono/Supervisores que ninguém da fila aceitou.
//
// 'proposal.viewed' (cliente abriu o link público da proposta) segue o mesmo
// formato: metadata.leadId/funnelId/proposalId/viewedAt, title é o nome do
// lead.

export type NotificationType =
  | 'task.assigned'
  | 'task.due_soon'
  | 'task.overdue'
  | 'task.completed'
  | 'lead.received'
  | 'lead.offered'
  | 'proposal.viewed'

export type NotificationMetadata = Record<string, string | number | boolean | null>

export interface NewNotification {
  organizationId: string
  /** Quem recebe. */
  userId: string
  /** Quem causou; null nos lembretes automáticos. */
  actorUserId: string | null
  type: NotificationType
  taskId: string | null
  /** Título da tarefa (ou nome do lead) no momento do evento. */
  title: string
  metadata?: NotificationMetadata
}

export interface NotificationActor {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

/** Estado atual da tarefa — null se ela foi reatribuída pra outra pessoa e o
 * usuário não é mais o responsável nem o criador. */
export interface NotificationTask {
  id: string
  organizationId: string
  leadId: string | null
  assignedUserId: string
  createdByUserId: string
  type: string
  title: string
  notes: string | null
  status: 'pendente' | 'em_andamento' | 'concluida'
  dueAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface NotificationRecord {
  id: string
  organizationId: string
  type: NotificationType
  actor: NotificationActor | null
  title: string
  metadata: NotificationMetadata
  task: NotificationTask | null
  readAt: Date | null
  createdAt: Date
}

export interface NotificationRecipient {
  userId: string
  organizationId: string
}

export interface NotificationList {
  items: NotificationRecord[]
  unreadCount: number
}

export interface TaskReminderOptions {
  now: Date
  /** Antecedência do lembrete "vence em breve". */
  dueSoonWindowMs: number
}

export interface INotificationRepository {
  notify(notification: NewNotification): Promise<void>

  /** Cria os lembretes que ainda não existem para as tarefas abertas do
   * usuário nesta organização. */
  syncTaskReminders(recipient: NotificationRecipient, options: TaskReminderOptions): Promise<void>

  /** Mais recentes primeiro. Lembretes de tarefas já concluídas ou que não são
   * mais do usuário ficam de fora (e fora da contagem de não lidas). */
  list(recipient: NotificationRecipient, limit: number): Promise<NotificationList>

  /** Retorna false se a notificação não existir ou não for do usuário. */
  markRead(id: string, recipient: NotificationRecipient): Promise<boolean>

  markAllRead(recipient: NotificationRecipient): Promise<void>
}

/** Implementação que descarta as notificações — padrão dos use cases quando
 * nenhuma é injetada (testes unitários, API sem banco configurado). */
export const NO_OP_NOTIFICATIONS: INotificationRepository = {
  notify: async () => {},
  syncTaskReminders: async () => {},
  list: async () => ({ items: [], unreadCount: 0 }),
  markRead: async () => false,
  markAllRead: async () => {},
}
