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
  /** Segunda a domingo da semana atual. 'off' = fim de semana sem
   * atividade, que não quebra a ofensiva. */
  week: { date: string; status: 'done' | 'missed' | 'off' | 'today' | 'future' }[]
}

export function getMyStreak(organizationId: string): Promise<MyStreak> {
  return apiClient.get<MyStreak>('/dashboard/me/streak', { organizationId })
}

/** Vendedor no ranking do mês. */
export interface SalesRankingEntry {
  userId: string
  name: string
  avatarUrl: string | null
  wonCount: number
  wonCents: number
  /** Meta do mês definida pelo gestor; null = sem meta. */
  goalCents: number | null
  /** Ganho no mês — a barra da meta usa este, mesmo no ranking da semana. */
  monthWonCents: number
  streakDays: number
}

export type SalesRankingPeriod = 'week' | 'month'

/** Ranking do mês — vendedores já na ordem (1º primeiro). */
export interface SalesRanking {
  period: SalesRankingPeriod
  periodStart: string
  periodEnd: string
  /** Sempre o mês — a meta da operação é mensal. */
  organization: { name: string; goalCents: number | null; achievedCents: number }
  sellers: SalesRankingEntry[]
}

/** Vendedor na "corrida" de ligações e visitas concluídas. */
export interface ActivityRankingEntry {
  userId: string
  name: string
  avatarUrl: string | null
  calls: number
  visits: number
  total: number
  streakDays: number
}

export interface ActivityRanking {
  period: SalesRankingPeriod
  periodStart: string
  periodEnd: string
  sellers: ActivityRankingEntry[]
}

export function getActivityRanking(
  organizationId: string,
  period: SalesRankingPeriod,
): Promise<ActivityRanking> {
  return apiClient.get<ActivityRanking>(`/dashboard/ranking/activities?period=${period}`, {
    organizationId,
  })
}

export function getSalesRanking(
  organizationId: string,
  period: SalesRankingPeriod,
): Promise<SalesRanking> {
  return apiClient.get<SalesRanking>(`/dashboard/ranking?period=${period}`, { organizationId })
}

export function getMyMonthlyStats(organizationId: string): Promise<MyMonthlyStats> {
  return apiClient.get<MyMonthlyStats>('/dashboard/me/monthly', { organizationId })
}
