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

/** Ofensiva do Perfil — dias seguidos com atividade de trabalho no CRM. */
export interface MyStreak {
  /** Dias seguidos até hoje (ou até ontem, se hoje ainda não teve atividade). */
  current: number
  record: number
  todayDone: boolean
  /** Segunda a domingo da semana atual. */
  week: { date: string; status: 'done' | 'missed' | 'today' | 'future' }[]
}

export function getMyStreak(organizationId: string): Promise<MyStreak> {
  return apiClient.get<MyStreak>('/dashboard/me/streak', { organizationId })
}

export function getMyMonthlyStats(organizationId: string): Promise<MyMonthlyStats> {
  return apiClient.get<MyMonthlyStats>('/dashboard/me/monthly', { organizationId })
}
