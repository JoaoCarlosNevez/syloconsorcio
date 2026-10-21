// GetManagementDashboardUseCase — o início do Dono e do Supervisor: resumo do
// período, saúde do pipeline, funil de vendas e funil ADM (pós-venda).
//
// Recortes:
// - Período (semana, mês, mês anterior — fuso de Brasília) vale pro resumo:
//   leads novos, vendas, conversão, tíquete. Vendas = Ganho no funil padrão,
//   o mesmo recorte das metas e do ranking (o "Efetivado" do ADM não é venda).
// - Conversão do período = dos leads que entraram no período, quantos já
//   foram ganhos (coorte — nunca passa de 100%).
// - Saúde, funis e ADM são retrato de agora (leads em aberto).
// - Parado = há X dias sem mudar de etapa (stageChangedAt).
// - Conversão da etapa = quantos dos que chegaram nela seguiram adiante:
//   alcançou(i) = em aberto nas etapas ≥ i + ganhos do funil;
//   conversão(i) = alcançou(i + 1) ÷ alcançou(i). A última etapa converte em
//   Ganho. Lead perdido sai da conta (não dá pra saber até onde chegou).
// - ADM: pendente = há mais de ADM_STALE_DAYS dias na mesma etapa.

import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type {
  IManagementDashboardRepository,
  OpenLeadSnapshot,
} from '../ports/management-dashboard.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'
import { currentWeekInBrasilia } from '../shared/current-week-in-brasilia'

export type ManagementPeriod = 'week' | 'month' | 'last_month'

export const STALE_DAYS = { attention: 7, risk: 14 } as const
export const ADM_STALE_DAYS = 2
const DAY_MS = 24 * 60 * 60 * 1000
const OLDEST_ADM_LIMIT = 6

export interface GetManagementDashboardInput {
  organizationId: string
  period?: ManagementPeriod
  /** Funil de vendas do gráfico; padrão = o funil padrão. */
  funnelId?: string
  now?: Date
}

export interface FunnelStageMetrics {
  id: string
  name: string
  color: string
  count: number
  valueCents: number
  /** Média de dias na etapa dos leads que estão nela agora; null se vazia. */
  avgDaysInStage: number | null
  /** % que seguiu pra próxima etapa (ou Ganho, na última); null sem base. */
  conversionPercent: number | null
}

export interface BackofficeStageMetrics {
  id: string
  name: string
  color: string
  count: number
  avgDaysInStage: number | null
  /** Há mais de ADM_STALE_DAYS dias na etapa. */
  staleCount: number
}

export interface BackofficeCard {
  leadId: string
  name: string
  stageName: string
  daysInStage: number
  sellerName: string | null
}

export interface ManagementDashboard {
  period: ManagementPeriod
  periodStart: Date
  periodEnd: Date
  summary: {
    openLeads: number
    newLeads: number
    wonCount: number
    wonValueCents: number
    /** Dos leads novos do período, % já ganhos; null sem leads novos. */
    conversionPercent: number | null
    avgTicketCents: number | null
    goalCents: number | null
    /** Projeção do valor ganho até o fim do mês no ritmo atual — só no mês corrente. */
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
    oldest: BackofficeCard[]
  } | null
}

function periodRange(period: ManagementPeriod, now: Date): { start: Date; end: Date } {
  if (period === 'week') return currentWeekInBrasilia(now)
  const current = currentMonthInBrasilia(now)
  if (period === 'month') return current
  return currentMonthInBrasilia(new Date(current.start.getTime() - 1))
}

function daysSince(date: Date, now: Date): number {
  return Math.max(0, (now.getTime() - date.getTime()) / DAY_MS)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
}

function percent(part: number, whole: number): number | null {
  if (whole === 0) return null
  return Math.round((part / whole) * 1000) / 10
}

export function salesFunnelMetrics(
  funnel: FunnelRecord,
  openLeads: OpenLeadSnapshot[],
  wonCount: number,
  now: Date,
): FunnelStageMetrics[] {
  const inFunnel = openLeads.filter((lead) => lead.funnelId === funnel.id)
  const byStage = funnel.stages.map((stage) => inFunnel.filter((l) => l.stageId === stage.id))
  // alcançou(i) = em aberto nas etapas ≥ i + ganhos.
  const reached = byStage.map(
    (_, i) => byStage.slice(i).reduce((sum, leads) => sum + leads.length, 0) + wonCount,
  )
  return funnel.stages.map((stage, i) => {
    const leads = byStage[i] ?? []
    const next = i + 1 < reached.length ? (reached[i + 1] ?? 0) : wonCount
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      count: leads.length,
      valueCents: leads.reduce((sum, lead) => sum + lead.valueCents, 0),
      avgDaysInStage: average(leads.map((lead) => daysSince(lead.stageChangedAt, now))),
      conversionPercent: percent(next, reached[i] ?? 0),
    }
  })
}

export class GetManagementDashboardUseCase
  implements UseCase<GetManagementDashboardInput, ManagementDashboard>
{
  constructor(
    private readonly dashboardRepository: IManagementDashboardRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: GetManagementDashboardInput): Promise<ManagementDashboard> {
    const now = input.now ?? new Date()
    const period = input.period ?? 'month'
    const { start, end } = periodRange(period, now)
    const orgId = input.organizationId
    const won = { organizationId: orgId, wonFrom: start, wonTo: end }

    const [
      funnels,
      openLeads,
      created,
      pendingQueue,
      wonCount,
      wonValueCents,
      organization,
      members,
    ] = await Promise.all([
      this.funnelRepository.listByOrganization(orgId),
      this.dashboardRepository.listOpenLeads(orgId),
      this.dashboardRepository.countCreatedInSalesFunnels(orgId, start, end),
      this.dashboardRepository.countPendingQueueOffers(orgId),
      this.leadRepository.countWonInDefaultFunnel(won),
      this.leadRepository.sumWonValueCentsInDefaultFunnel(won),
      this.organizationRepository.findById(orgId),
      this.membershipRepository.findActiveByOrganizationId(orgId),
    ])

    const salesFunnels = funnels.filter((f) => f.kind === 'SALES')
    const backofficeFunnel = funnels.find((f) => f.kind === 'BACKOFFICE') ?? null
    const salesFunnelIds = new Set(salesFunnels.map((f) => f.id))
    const openSales = openLeads.filter((lead) => salesFunnelIds.has(lead.funnelId))

    // ── Resumo ──
    const goalCents = organization?.salesGoalCents ?? null
    let projectedCents: number | null = null
    if (period === 'month') {
      const elapsed = now.getTime() - start.getTime()
      const total = end.getTime() - start.getTime()
      projectedCents = elapsed > 0 ? Math.round((wonValueCents * total) / elapsed) : null
    }

    // ── Saúde (funis de vendas) ──
    const staleDays = openSales.map((lead) => daysSince(lead.stageChangedAt, now))

    // ── Funil de vendas ──
    const chosen =
      salesFunnels.find((f) => f.id === input.funnelId) ??
      salesFunnels.find((f) => f.isDefault) ??
      salesFunnels[0] ??
      null
    const chosenWon = chosen ? await this.dashboardRepository.countWonInFunnel(chosen.id) : 0

    // ── Funil ADM ──
    let backoffice: ManagementDashboard['backoffice'] = null
    if (backofficeFunnel) {
      const memberName = new Map(members.map((m) => [m.userId, m.name?.trim() || m.email] as const))
      const inAdm = openLeads.filter((lead) => lead.funnelId === backofficeFunnel.id)
      const stageName = new Map(backofficeFunnel.stages.map((s) => [s.id, s.name] as const))
      const isStale = (lead: OpenLeadSnapshot) =>
        daysSince(lead.stageChangedAt, now) > ADM_STALE_DAYS
      backoffice = {
        id: backofficeFunnel.id,
        stages: backofficeFunnel.stages.map((stage) => {
          const leads = inAdm.filter((lead) => lead.stageId === stage.id)
          return {
            id: stage.id,
            name: stage.name,
            color: stage.color,
            count: leads.length,
            avgDaysInStage: average(leads.map((lead) => daysSince(lead.stageChangedAt, now))),
            staleCount: leads.filter(isStale).length,
          }
        }),
        staleCount: inAdm.filter(isStale).length,
        oldest: [...inAdm]
          .sort((a, b) => a.stageChangedAt.getTime() - b.stageChangedAt.getTime())
          .slice(0, OLDEST_ADM_LIMIT)
          .map((lead) => ({
            leadId: lead.id,
            name: lead.name,
            stageName: stageName.get(lead.stageId) ?? '',
            daysInStage: Math.floor(daysSince(lead.stageChangedAt, now)),
            sellerName: lead.assignedUserId ? (memberName.get(lead.assignedUserId) ?? null) : null,
          })),
      }
    }

    return {
      period,
      periodStart: start,
      periodEnd: end,
      summary: {
        openLeads: openSales.length,
        newLeads: created.created,
        wonCount,
        wonValueCents,
        conversionPercent: percent(created.wonOfCreated, created.created),
        avgTicketCents: wonCount > 0 ? Math.round(wonValueCents / wonCount) : null,
        goalCents,
        projectedCents,
      },
      health: {
        unassigned: openSales.filter((lead) => !lead.assignedUserId).length,
        staleAttention: staleDays.filter((d) => d > STALE_DAYS.attention).length,
        staleRisk: staleDays.filter((d) => d > STALE_DAYS.risk).length,
        pendingQueue,
      },
      salesFunnels: salesFunnels.map((f) => ({ id: f.id, name: f.name })),
      salesFunnel: chosen
        ? {
            id: chosen.id,
            name: chosen.name,
            stages: salesFunnelMetrics(chosen, openLeads, chosenWon, now),
            wonCount: chosenWon,
          }
        : null,
      backoffice,
    }
  }
}
