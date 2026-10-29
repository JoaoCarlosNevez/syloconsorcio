// Ports do Web Push — aparelhos inscritos, a fila de notificações a enviar e
// o envio em si.
//
// Implementações concretas: packages/infrastructure/src/database/repositories/
// (inscrições e fila) e packages/infrastructure/src/push/ (envio, lib web-push).

import type { NotificationMetadata, NotificationType } from './notification.repository'

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionRecord {
  userId: string
  endpoint: string
  keys: PushSubscriptionKeys
}

export interface IPushSubscriptionRepository {
  /** Inscreve (ou reinscreve) o aparelho — o endpoint é único: se já existia,
   * passa a ser deste usuário com as chaves novas. */
  save(input: PushSubscriptionRecord & { userAgent: string | null }): Promise<void>

  /** Remove o aparelho do usuário (logout, push desligado no app). */
  remove(userId: string, endpoint: string): Promise<void>

  /** Remove um aparelho que o serviço de push disse não existir mais. */
  removeByEndpoint(endpoint: string): Promise<void>

  listByUserIds(userIds: readonly string[]): Promise<PushSubscriptionRecord[]>
}

/** Notificação tirada da fila do push, com o que precisa pra montar a frase. */
export interface PendingPush {
  id: string
  userId: string
  organizationId: string
  type: NotificationType
  title: string
  metadata: NotificationMetadata
  taskId: string | null
  actorName: string | null
  createdAt: Date
  /** users.notification_preferences cru — resolver com
   * resolveNotificationPreferences. */
  preferences: unknown
}

export interface IPushOutboxRepository {
  /** Gera os lembretes "vence em breve"/"atrasada" de todas as tarefas abertas
   * (mesma regra do sininho, pra todo mundo) — é o que faz o lembrete virar
   * push sem ninguém abrir o sininho. */
  syncAllTaskReminders(options: { now: Date; dueSoonWindowMs: number }): Promise<void>

  /** Marca como enviadas (pushed_at) as notificações ainda na fila e devolve
   * as que nasceram depois de `since` — as mais velhas só saem da fila. É
   * atômico: com várias instâncias, cada notificação sai por uma só. */
  claimPending(options: { since: Date; limit: number }): Promise<PendingPush[]>
}

export interface PushMessage {
  title: string
  body: string
  /** Pra onde o toque na notificação leva (caminho do app, com ?org=). */
  url: string
  /** Mesma tag substitui em vez de empilhar no aparelho. */
  tag: string
}

export type PushSendResult = 'sent' | 'gone'

export interface IPushSender {
  /** 'gone' = o serviço de push disse que a inscrição não existe mais. */
  send(subscription: PushSubscriptionRecord, message: PushMessage): Promise<PushSendResult>
}
