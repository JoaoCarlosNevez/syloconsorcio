// Chamadas HTTP do painel do início. Espelha apps/api/src/routes/dashboard.route.ts.

import { apiClient } from './api-client'

/** Números do mês do usuário logado — cards abaixo de Tarefas no início. */
export interface MyMonthlyStats {
  periodStart: string
  periodEnd: string
  /** Tarefas de Reunião com prazo no mês (qualquer status). */
  meetingsScheduled: number
  /** Dessas, as concluídas. */
  meetingsCompleted: number
  /** Centavos de crédito dos leads ganhos no mês (funil padrão). */
  wonTotalCents: number
  wonCount: number
  /** Centavos; null quando não houve ganho no mês. */
  averageTicketCents: number | null
}

export function getMyMonthlyStats(organizationId: string): Promise<MyMonthlyStats> {
  return apiClient.get<MyMonthlyStats>('/dashboard/me/monthly', { organizationId })
}
