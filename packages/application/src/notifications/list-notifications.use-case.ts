// ListNotificationsUseCase — notificações do usuário na organização ativa (o
// sininho). Antes de listar, gera os lembretes de prazo que ainda não existem
// — ver syncTaskReminders em ports/notification.repository.ts.

import type { INotificationRepository, NotificationList } from '../ports/notification.repository'
import type { UseCase } from '../ports/use-case'

/** Antecedência do lembrete "vence em breve". */
export const TASK_DUE_SOON_WINDOW_MS = 60 * 60 * 1000

export interface ListNotificationsInput {
  userId: string
  organizationId: string
  limit: number
  now?: Date
}

export class ListNotificationsUseCase implements UseCase<ListNotificationsInput, NotificationList> {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(input: ListNotificationsInput): Promise<NotificationList> {
    const recipient = { userId: input.userId, organizationId: input.organizationId }
    await this.notifications.syncTaskReminders(recipient, {
      now: input.now ?? new Date(),
      dueSoonWindowMs: TASK_DUE_SOON_WINDOW_MS,
    })
    return this.notifications.list(recipient, input.limit)
  }
}
