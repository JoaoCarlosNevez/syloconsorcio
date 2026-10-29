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

import type {
  IPushOutboxRepository,
  IPushSender,
  IPushSubscriptionRepository,
  PushSubscriptionRecord,
} from '../ports/push.ports'
import type { UseCase } from '../ports/use-case'
import { TASK_DUE_SOON_WINDOW_MS } from './list-notifications.use-case'
import { resolveNotificationPreferences } from './notification-preferences'
import { buildPushMessage } from './push-message'

/** Notificação mais velha que isto não vira push (chegaria fora de hora). */
export const PUSH_MAX_AGE_MS = 10 * 60 * 1000
const BATCH_LIMIT = 200

export interface DispatchPushInput {
  now: Date
}

export interface DispatchPushResult {
  sent: number
  removedSubscriptions: number
}

export class DispatchPushNotificationsUseCase
  implements UseCase<DispatchPushInput, DispatchPushResult>
{
  constructor(
    private readonly outbox: IPushOutboxRepository,
    private readonly subscriptions: IPushSubscriptionRepository,
    private readonly sender: IPushSender,
  ) {}

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
      (push) => resolveNotificationPreferences(push.preferences).push[push.type],
    )
    if (wanted.length === 0) return { sent: 0, removedSubscriptions: 0 }

    const userIds = [...new Set(wanted.map((push) => push.userId))]
    const devicesByUser = new Map<string, PushSubscriptionRecord[]>()
    for (const device of await this.subscriptions.listByUserIds(userIds)) {
      devicesByUser.set(device.userId, [...(devicesByUser.get(device.userId) ?? []), device])
    }

    let sent = 0
    const gone = new Set<string>()
    for (const push of wanted) {
      const message = buildPushMessage(push, input.now)
      for (const device of devicesByUser.get(push.userId) ?? []) {
        if (gone.has(device.endpoint)) continue
        const result = await this.sender.send(device, message)
        if (result === 'gone') gone.add(device.endpoint)
        else sent++
      }
    }
    for (const endpoint of gone) await this.subscriptions.removeByEndpoint(endpoint)
    return { sent, removedSubscriptions: gone.size }
  }
}
