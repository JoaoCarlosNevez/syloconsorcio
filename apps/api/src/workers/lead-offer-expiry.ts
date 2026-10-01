// Worker das ofertas da fila de leads: a cada intervalo, passa adiante os
// leads cujas ofertas venceram sem resposta (ProcessExpiredLeadOffersUseCase).
//
// Roda dentro do processo da API (iniciado em main.ts). É seguro com várias
// instâncias: claimExpiredOffers troca o status de forma atômica, então cada
// oferta vencida é processada por uma instância só.

import type { ProcessExpiredLeadOffersUseCase } from '@sylocrm/application'
import type { FastifyBaseLogger } from 'fastify'

export const LEAD_OFFER_EXPIRY_INTERVAL_MS = 15_000

export function startLeadOfferExpiryWorker(
  useCase: ProcessExpiredLeadOffersUseCase,
  logger: FastifyBaseLogger,
  intervalMs: number = LEAD_OFFER_EXPIRY_INTERVAL_MS,
): () => void {
  let running = false

  async function tick() {
    // Uma rodada lenta (banco devagar) não empilha com a próxima.
    if (running) return
    running = true
    try {
      const { expired } = await useCase.execute({ now: new Date() })
      if (expired > 0) logger.info({ expired }, 'lead offers expired and passed on')
    } catch (error) {
      logger.error({ err: error }, 'failed to process expired lead offers')
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => {
    void tick()
  }, intervalMs)
  return () => clearInterval(timer)
}
