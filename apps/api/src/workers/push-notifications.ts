// Worker do Web Push: a cada intervalo, manda as notificações novas pros
// aparelhos inscritos (DispatchPushNotificationsUseCase) — inclusive os
// lembretes de prazo das tarefas, que ele mesmo gera.
//
// Roda dentro do processo da API (iniciado em main.ts, só com as chaves VAPID
// configuradas). É seguro com várias instâncias: claimPending tira cada
// notificação da fila de forma atômica.

import type { DispatchPushNotificationsUseCase } from '@sylocrm/application'
import type { FastifyBaseLogger } from 'fastify'

// Curto porque a oferta da fila tem poucos minutos pra ser aceita.
export const PUSH_DISPATCH_INTERVAL_MS = 5_000

export function startPushNotificationsWorker(
  useCase: DispatchPushNotificationsUseCase,
  logger: FastifyBaseLogger,
  intervalMs: number = PUSH_DISPATCH_INTERVAL_MS,
): () => void {
  let running = false

  async function tick() {
    // Uma rodada lenta (banco devagar) não empilha com a próxima.
    if (running) return
    running = true
    try {
      const { sent, removedSubscriptions } = await useCase.execute({ now: new Date() })
      if (sent > 0 || removedSubscriptions > 0) {
        logger.info({ sent, removedSubscriptions }, 'push notifications dispatched')
      }
    } catch (error) {
      logger.error({ err: error }, 'failed to dispatch push notifications')
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => {
    void tick()
  }, intervalMs)
  return () => clearInterval(timer)
}
