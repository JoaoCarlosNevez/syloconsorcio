// DispatchPushNotificationsUseCase — tira as notificações novas da fila e
// manda um Web Push pra cada aparelho inscrito do destinatário.
//
// Roda em loop no worker da API (workers/push-notifications.ts). A cada rodada:
//   1. gera os lembretes de prazo de todas as tarefas abertas (assim o
//      "vence em breve"/"atrasada" vira push sem ninguém abrir o sininho);
//   2. pega a fila (claimPending) — só o que nasceu nos últimos minutos vira
//      push; o resto (API parada por um tempo) só sai da fila;
//   3. respeita Configurações → Notificações (push por tipo);
//   4. apaga as inscrições que o serviço de push diz não existirem mais.
//
// Oferta da fila: com IPushActionTokens, a notificação ganha os botões
// Aceitar/Recusar (Android/computador) e o token pra responder sem login.
// Oferta que já venceu enquanto esperava na fila não vira push.

import type {
  IPushActionTokens,
  IPushOutboxRepository,
  IPushSender,
  IPushSubscriptionRepository,
  PendingPush,
  PushMessage,
  PushSubscriptionRecord,
} from '../ports/push.ports'
import type { UseCase } from '../ports/use-case'
import { TASK_DUE_SOON_WINDOW_MS } from './list-notifications.use-case'
import { resolveNotificationPreferences } from './notification-preferences'
import { buildPushMessage } from './push-message'

/** Notificação mais velha que isto não vira push (chegaria fora de hora). */
export const PUSH_MAX_AGE_MS = 10 * 60 * 1000
const BATCH_LIMIT = 200

function serviceHost(endpoint: string): string {
  try {
    return new URL(endpoint).host
  } catch {
    return 'desconhecido'
  }
}

function isExpiredOffer(push: PendingPush, now: Date): boolean {
  const expiresAt = push.metadata.expiresAt
  return (
    push.type === 'lead.offered' &&
    typeof expiresAt === 'string' &&
    new Date(expiresAt).getTime() <= now.getTime()
  )
}

export interface DispatchPushInput {
  now: Date
}

/** Envio que falhou num aparelho — os outros seguem; vai pro log do worker. */
export interface PushFailure {
  notificationId: string
  type: PendingPush['type']
  userId: string
  /** Só o host do serviço de push (FCM, Apple, Mozilla) — o endpoint é segredo. */
  service: string
  error: string
}

export interface DispatchPushResult {
  sent: number
  removedSubscriptions: number
  failures: PushFailure[]
}

export class DispatchPushNotificationsUseCase
  implements UseCase<DispatchPushInput, DispatchPushResult>
{
  constructor(
    private readonly outbox: IPushOutboxRepository,
    private readonly subscriptions: IPushSubscriptionRepository,
    private readonly sender: IPushSender,
    private readonly actionTokens: IPushActionTokens | null = null,
  ) {}

  private withOfferActions(push: PendingPush, message: PushMessage): PushMessage {
    const offerId = push.metadata.offerId
    const expiresAt = push.metadata.expiresAt
    if (!this.actionTokens || typeof offerId !== 'string' || typeof expiresAt !== 'string') {
      return message
    }
    const token = this.actionTokens.sign({
      offerId,
      userId: push.userId,
      organizationId: push.organizationId,
      expiresAt: new Date(expiresAt),
    })
    return {
      ...message,
      offerActions: {
        token,
        actions: [
          { action: 'accept', title: 'Aceitar' },
          { action: 'decline', title: 'Recusar' },
        ],
      },
    }
  }

  async execute(input: DispatchPushInput): Promise<DispatchPushResult> {
    await this.outbox.syncAllTaskReminders({
      now: input.now,
      dueSoonWindowMs: TASK_DUE_SOON_WINDOW_MS,
    })
    const pending = await this.outbox.claimPending({
      since: new Date(input.now.getTime() - PUSH_MAX_AGE_MS),
      limit: BATCH_LIMIT,
    })
    const wanted = pending.filter(
      (push) =>
        resolveNotificationPreferences(push.preferences).push[push.type] &&
        !isExpiredOffer(push, input.now),
    )
    if (wanted.length === 0) return { sent: 0, removedSubscriptions: 0, failures: [] }

    const userIds = [...new Set(wanted.map((push) => push.userId))]
    const devicesByUser = new Map<string, PushSubscriptionRecord[]>()
    for (const device of await this.subscriptions.listByUserIds(userIds)) {
      devicesByUser.set(device.userId, [...(devicesByUser.get(device.userId) ?? []), device])
    }

    let sent = 0
    const gone = new Set<string>()
    const failures: PushFailure[] = []
    for (const push of wanted) {
      const base = buildPushMessage(push, input.now)
      const message = push.type === 'lead.offered' ? this.withOfferActions(push, base) : base
      for (const device of devicesByUser.get(push.userId) ?? []) {
        if (gone.has(device.endpoint)) continue
        // Um aparelho com problema não derruba a rodada: as notificações já
        // saíram da fila, então um erro aqui faria os outros nunca receberem.
        try {
          const result = await this.sender.send(device, message)
          if (result === 'gone') gone.add(device.endpoint)
          else sent++
        } catch (error) {
          failures.push({
            notificationId: push.id,
            type: push.type,
            userId: push.userId,
            service: serviceHost(device.endpoint),
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    for (const endpoint of gone) await this.subscriptions.removeByEndpoint(endpoint)
    return { sent, removedSubscriptions: gone.size, failures }
  }
}
