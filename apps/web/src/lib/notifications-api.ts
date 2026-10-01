// Chamadas HTTP das notificações — o sininho.
// Espelha apps/api/src/routes/notifications.route.ts.

import { apiClient } from './api-client'
import type { Task } from './tasks-api'

export type NotificationType =
  | 'task.assigned'
  | 'task.due_soon'
  | 'task.overdue'
  | 'task.completed'
  /** Lead que chegou pelo webhook — metadata traz leadId, funnelId, source e
   * assignedToYou; title é o nome do lead. */
  | 'lead.received'
  /** A Fila de Leads ofereceu um lead ao usuário — metadata traz leadId,
   * funnelId, offerId e expiresAt (prazo pra aceitar). */
  | 'lead.offered'
  /** Cliente abriu o link público da proposta — metadata traz leadId,
   * funnelId, proposalId e viewedAt; title é o nome do lead. */
  | 'proposal.viewed'

export interface AppNotification {
  id: string
  organizationId: string
  type: NotificationType
  actor: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
  /** Título da tarefa (ou nome do lead) no momento do evento. */
  title: string
  metadata: Record<string, string | number | boolean | null>
  /** Estado atual da tarefa — null se ela passou pra outra pessoa. */
  task: Task | null
  readAt: string | null
  createdAt: string
}

export interface NotificationList {
  items: AppNotification[]
  unreadCount: number
}

export function listNotifications(organizationId: string): Promise<NotificationList> {
  return apiClient.get<NotificationList>('/notifications', { organizationId })
}

export function markNotificationRead(organizationId: string, id: string): Promise<void> {
  return apiClient.post<void>(`/notifications/${id}/read`, undefined, { organizationId })
}

export function markAllNotificationsRead(organizationId: string): Promise<void> {
  return apiClient.post<void>('/notifications/read-all', undefined, { organizationId })
}
