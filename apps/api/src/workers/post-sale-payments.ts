// Worker das tarefas de confirmação do boleto no Pós-venda: de hora em hora
// (e logo ao subir), cria a tarefa "Confirmar pagamento da parcela" do mês no
// dia seguinte ao vencimento e apaga as de cards que saíram do Pós-venda
// (GeneratePostSalePaymentTasksUseCase).
//
// Seguro com várias instâncias: cada tarefa tem um autoKey único por
// lead/mês, então duas rodadas simultâneas não duplicam.

import type { GeneratePostSalePaymentTasksUseCase } from '@sylocrm/application'
import type { FastifyBaseLogger } from 'fastify'

export const POST_SALE_PAYMENTS_INTERVAL_MS = 60 * 60 * 1000

export function startPostSalePaymentsWorker(
  useCase: GeneratePostSalePaymentTasksUseCase,
  logger: FastifyBaseLogger,
  intervalMs: number = POST_SALE_PAYMENTS_INTERVAL_MS,
): () => void {
  let running = false

  async function tick() {
    if (running) return
    running = true
    try {
      const { created, removed } = await useCase.execute({ now: new Date() })
      if (created > 0 || removed > 0) {
        logger.info({ created, removed }, 'post-sale payment tasks synced')
      }
    } catch (error) {
      logger.error({ err: error }, 'failed to sync post-sale payment tasks')
    } finally {
      running = false
    }
  }

  void tick()
  const timer = setInterval(() => {
    void tick()
  }, intervalMs)
  return () => clearInterval(timer)
}
