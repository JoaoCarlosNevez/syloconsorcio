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

// ── Painel de gestão (início do Dono e do Supervisor) ────────────────────────

export type ManagementPeriod = 'week' | 'month' | 'last_month'

export interface FunnelStageMetrics {
  id: string
  name: string
  color: string
  count: number
  valueCents: number
  avgDaysInStage: number | null
  conversionPercent: number | null
}

export interface BackofficeStageMetrics {
  id: string
  name: string
  color: string
  count: number
  avgDaysInStage: number | null
  staleCount: number
}

export interface PerformanceMetrics {
  openLeads: number
  newLeads: number
  wonCount: number
  wonValueCents: number
  conversionPercent: number | null
  goalCents: number | null
  goalPercent: number | null
  staleLeads: number
}

export interface SellerPerformance extends PerformanceMetrics {
  userId: string
  name: string
  avatarUrl: string | null
  supervisorName: string | null
}

export interface SupervisorPerformance extends PerformanceMetrics {
  /** null = a linha dos vendedores sem supervisor. */
  userId: string | null
  name: string
  teamSize: number
}

export interface ManagementFilters {
  sellerUserId: string | null
  /** Só o Dono. */
  supervisorUserId: string | null
}

export interface ManagementDashboard {
  period: ManagementPeriod
  periodStart: string
  periodEnd: string
  scope: { kind: 'organization' | 'team' | 'supervisor' | 'seller'; label: string }
  filters: {
    supervisors: { userId: string; name: string }[]
    sellers: { userId: string; name: string }[]
  }
  /** Funil Pós-venda: cotas ativas por etapa e quantas estão atrasadas. */
  postSale: {
    id: string
    stages: { id: string; name: string; color: string; count: number }[]
    activeCount: number
    lateCount: number
  } | null
  sellers: SellerPerformance[]
  /** Comparativo de supervisores — só pro Dono, na representação inteira. */
  supervisors: SupervisorPerformance[] | null
  summary: {
    openLeads: number
    newLeads: number
    wonCount: number
    wonValueCents: number
    conversionPercent: number | null
    avgTicketCents: number | null
    goalCents: number | null
    projectedCents: number | null
  }
  health: {
    unassigned: number
    staleAttention: number
    staleRisk: number
    pendingQueue: number
  }
  salesFunnels: { id: string; name: string }[]
  salesFunnel: {
    id: string
    name: string
    stages: FunnelStageMetrics[]
    wonCount: number
  } | null
  backoffice: {
    id: string
    stages: BackofficeStageMetrics[]
    staleCount: number
    oldest: {
      leadId: string
      name: string
      stageName: string
      daysInStage: number
      sellerName: string | null
    }[]
  } | null
}

export function getManagementDashboard(
  organizationId: string,
  period: ManagementPeriod,
  funnelId: string | null,
  filters: ManagementFilters,
): Promise<ManagementDashboard> {
  const params = new URLSearchParams({ period })
  if (funnelId) params.set('funnelId', funnelId)
  if (filters.sellerUserId) params.set('sellerUserId', filters.sellerUserId)
  if (filters.supervisorUserId) params.set('supervisorUserId', filters.supervisorUserId)
  return apiClient.get<ManagementDashboard>(`/dashboard/management?${params}`, { organizationId })
}

// ── Engajamento operacional (Perfil) ─────────────────────────────────────────

export interface MyEngagement {
  periodStart: string
  periodEnd: string
  leadsWorked: number
  leadsWorkedPrevious: number
  proposalsCreated: number
  proposalsShared: number
  proposalsOpened: number
  wonCount: number
  wonValueCents: number
}

export function getMyEngagement(organizationId: string): Promise<MyEngagement> {
  return apiClient.get<MyEngagement>('/dashboard/me/engagement', { organizationId })
}

// ── Mural de Conquistas (Perfil) ─────────────────────────────────────────────

export interface Achievement {
  id:
    | 'first_quota'
    | 'sold_500k'
    | 'sold_1m'
    | 'sold_3m'
    | 'sold_5m'
    | 'sold_10m'
    | 'first_assembly'
    | 'first_contemplation'
  title: string
  description: string
  unlockedAt: string | null
  progress: { currentCents: number; targetCents: number } | null
}

export function getMyAchievements(
  organizationId: string,
): Promise<{ achievements: Achievement[] }> {
  return apiClient.get<{ achievements: Achievement[] }>('/dashboard/me/achievements', {
    organizationId,
  })
}
