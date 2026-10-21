// GetManagementDashboardUseCase — o início do Dono e do Supervisor: resumo do
// período, saúde do pipeline, funil de vendas, funil ADM (pós-venda) e o
// desempenho por vendedor (e por supervisor, pro Dono).
//
// Recorte (quem entra nos números):
// - Dono (e Supervisor sem time): a representação inteira.
// - Supervisor com time: o time, ele mesmo e os leads sem responsável (a
//   distribuir) — a mesma visão do Kanban (ver lead-scope.ts).
// - Filtro por vendedor: só os leads dele (precisa estar no recorte acima).
// - Filtro por supervisor (só o Dono): o time dele e ele mesmo.
//
// Contas:
// - Período (semana, mês, mês anterior — fuso de Brasília) vale pro resumo e
//   pelo desempenho: leads novos, vendas, conversão, tíquete. Vendas = Ganho
//   no funil padrão, o mesmo recorte das metas e do ranking (o "Efetivado" do
//   ADM não é venda).
// - Conversão do período = dos leads que entraram no período, quantos já
//   foram ganhos (coorte — nunca passa de 100%).
// - Saúde, funis e ADM são retrato de agora (leads em aberto).
// - Parado = há X dias sem mudar de etapa (stageChangedAt).
// - Conversão da etapa = quantos dos que chegaram nela seguiram adiante:
//   alcançou(i) = em aberto nas etapas ≥ i + ganhos do funil;
//   conversão(i) = alcançou(i + 1) ÷ alcançou(i). A última etapa converte em
//   Ganho. Lead perdido sai da conta (não dá pra saber até onde chegou).
// - ADM: pendente = há mais de ADM_STALE_DAYS dias na mesma etapa.
// - Meta: da representação no recorte inteiro; nos filtros, a soma das metas
//   dos vendedores do recorte (null se nenhum tiver meta).

import { AuthorizationError, Role } from '@sylocrm/domain'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type {
  AssigneePeriodStats,
  IManagementDashboardRepository,
  OpenLeadSnapshot,
} from '../ports/management-dashboard.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
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
  /** Quem está vendo — define o recorte. */
  viewer: {
    userId: string
    role: Role
    /** Time do Supervisor (MembershipContext.teamUserIds). */
    teamUserIds?: readonly string[]
  }
  sellerUserId?: string
  /** Só o Dono. */
  supervisorUserId?: string
  now?: Date
}

export type DashboardScopeKind = 'organization' | 'team' | 'supervisor' | 'seller'

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

/** Números de um vendedor (ou da soma de um time) no período. */
export interface PerformanceMetrics {
  openLeads: number
  newLeads: number
  wonCount: number
  wonValueCents: number
  conversionPercent: number | null
  goalCents: number | null
  /** % da meta atingida; null sem meta. */
  goalPercent: number | null
  /** Leads em aberto parados há mais de STALE_DAYS.attention dias. */
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

export interface ManagementDashboard {
  period: ManagementPeriod
  periodStart: Date
  periodEnd: Date
  scope: { kind: DashboardScopeKind; label: string }
  /** Opções dos filtros pra quem está vendo. */
  filters: {
    supervisors: { userId: string; name: string }[]
    sellers: { userId: string; name: string }[]
  }
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
  /** Vendedores do recorte. */
  sellers: SellerPerformance[]
  /** Comparativo de supervisores — só pro Dono, na representação inteira. */
  supervisors: SupervisorPerformance[] | null
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

function memberName(member: TeamMember): string {
  return member.name?.trim() || member.email
}

/** Quem entra nos números: um conjunto de responsáveis (null = todos) e se
 * os leads sem responsável contam. */
interface Selection {
  userIds: ReadonlySet<string> | null
  includeUnassigned: boolean
}

function matches(selection: Selection, assignedUserId: string | null): boolean {
  if (assignedUserId === null) return selection.includeUnassigned
  return selection.userIds === null || selection.userIds.has(assignedUserId)
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

/** Soma os números de um conjunto de responsáveis. */
function performanceOf(
  selection: Selection,
  openSales: OpenLeadSnapshot[],
  stats: AssigneePeriodStats[],
  goalCents: number | null,
  now: Date,
): PerformanceMetrics {
  const leads = openSales.filter((lead) => matches(selection, lead.assignedUserId))
  const rows = stats.filter((row) => matches(selection, row.assignedUserId))
  const sum = (key: 'created' | 'wonOfCreated' | 'wonCount' | 'wonValueCents') =>
    rows.reduce((total, row) => total + row[key], 0)
  const wonValueCents = sum('wonValueCents')
  return {
    openLeads: leads.length,
    newLeads: sum('created'),
    wonCount: sum('wonCount'),
    wonValueCents,
    conversionPercent: percent(sum('wonOfCreated'), sum('created')),
    goalCents,
    goalPercent: goalCents ? Math.round((wonValueCents / goalCents) * 1000) / 10 : null,
    staleLeads: leads.filter((lead) => daysSince(lead.stageChangedAt, now) > STALE_DAYS.attention)
      .length,
  }
}

/** Soma das metas (null se ninguém tiver meta). */
function sumGoals(members: TeamMember[]): number | null {
  const goals = members.map((m) => m.salesGoalCents).filter((g): g is number => g !== null)
  return goals.length > 0 ? goals.reduce((sum, g) => sum + g, 0) : null
}

export class GetManagementDashboardUseCase
  implements UseCase<GetManagementDashboardInput, ManagementDashboard>
{
  constructor(
    private readonly dashboardRepository: IManagementDashboardRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: GetManagementDashboardInput): Promise<ManagementDashboard> {
    const now = input.now ?? new Date()
    const period = input.period ?? 'month'
    const { start, end } = periodRange(period, now)
    const orgId = input.organizationId

    const [funnels, openLeads, stats, pendingQueue, organization, allMembers] = await Promise.all([
      this.funnelRepository.listByOrganization(orgId),
      this.dashboardRepository.listOpenLeads(orgId),
      this.dashboardRepository.statsByAssignee(orgId, start, end),
      this.dashboardRepository.countPendingQueueOffers(orgId),
      this.organizationRepository.findById(orgId),
      this.membershipRepository.findActiveByOrganizationId(orgId),
    ])
    const members = allMembers.filter((m) => m.status === 'ACTIVE')
    const byId = new Map(members.map((m) => [m.userId, m] as const))
    const sellers = members.filter((m) => m.role === Role.SELLER)
    const supervisors = members.filter((m) => m.role === Role.MANAGER)
    const teamOf = (supervisorId: string) =>
      sellers.filter((m) => m.supervisorUserId === supervisorId)

    // ── Recorte ──
    const viewerTeam = input.viewer.teamUserIds ?? []
    const isOwner = input.viewer.role === Role.ADMIN
    let base: Selection = { userIds: null, includeUnassigned: true }
    let scope: ManagementDashboard['scope'] = {
      kind: 'organization',
      label: organization?.name ?? 'Representação',
    }
    if (viewerTeam.length > 0) {
      base = { userIds: new Set([...viewerTeam, input.viewer.userId]), includeUnassigned: true }
      scope = { kind: 'team', label: 'Meu time' }
    }
    const visibleSellers = sellers.filter((m) => matches(base, m.userId))

    let selection = base
    let goalCents: number | null =
      scope.kind === 'organization'
        ? (organization?.salesGoalCents ?? null)
        : sumGoals(visibleSellers)
    let tableSellers = visibleSellers

    if (input.supervisorUserId) {
      const supervisor = byId.get(input.supervisorUserId)
      if (!isOwner || !supervisor || supervisor.role !== Role.MANAGER) {
        throw new AuthorizationError('Só o Dono filtra por supervisor.')
      }
      const team = teamOf(supervisor.userId)
      selection = {
        userIds: new Set([...team.map((m) => m.userId), supervisor.userId]),
        includeUnassigned: false,
      }
      scope = { kind: 'supervisor', label: `Time de ${memberName(supervisor)}` }
      goalCents = sumGoals(team)
      tableSellers = team
    }
    if (input.sellerUserId) {
      const seller = byId.get(input.sellerUserId)
      if (!seller || !matches(base, seller.userId)) {
        throw new AuthorizationError('Este vendedor não está na sua visão.')
      }
      selection = { userIds: new Set([seller.userId]), includeUnassigned: false }
      scope = { kind: 'seller', label: memberName(seller) }
      goalCents = seller.salesGoalCents
      tableSellers = sellers.filter((m) => m.userId === seller.userId)
    }

    const inSelection = (lead: { assignedUserId: string | null }) =>
      matches(selection, lead.assignedUserId)
    const salesFunnels = funnels.filter((f) => f.kind === 'SALES')
    const backofficeFunnel = funnels.find((f) => f.kind === 'BACKOFFICE') ?? null
    const salesFunnelIds = new Set(salesFunnels.map((f) => f.id))
    const openSalesAll = openLeads.filter((lead) => salesFunnelIds.has(lead.funnelId))
    const openSales = openSalesAll.filter(inSelection)

    // ── Resumo ──
    const totals = performanceOf(selection, openSalesAll, stats, goalCents, now)
    let projectedCents: number | null = null
    if (period === 'month') {
      const elapsed = now.getTime() - start.getTime()
      const total = end.getTime() - start.getTime()
      projectedCents = elapsed > 0 ? Math.round((totals.wonValueCents * total) / elapsed) : null
    }

    // ── Saúde (funis de vendas) ──
    const staleDays = openSales.map((lead) => daysSince(lead.stageChangedAt, now))

    // ── Funil de vendas ──
    const chosen =
      salesFunnels.find((f) => f.id === input.funnelId) ??
      salesFunnels.find((f) => f.isDefault) ??
      salesFunnels[0] ??
      null
    const chosenWon = chosen
      ? (await this.dashboardRepository.wonInFunnelByAssignee(chosen.id))
          .filter(inSelection)
          .reduce((sum, row) => sum + row.count, 0)
      : 0

    // ── Funil ADM ──
    let backoffice: ManagementDashboard['backoffice'] = null
    if (backofficeFunnel) {
      const inAdm = openLeads.filter(
        (lead) => lead.funnelId === backofficeFunnel.id && inSelection(lead),
      )
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
          .map((lead) => {
            const seller = lead.assignedUserId ? byId.get(lead.assignedUserId) : undefined
            return {
              leadId: lead.id,
              name: lead.name,
              stageName: stageName.get(lead.stageId) ?? '',
              daysInStage: Math.floor(daysSince(lead.stageChangedAt, now)),
              sellerName: seller ? memberName(seller) : null,
            }
          }),
      }
    }

    // ── Desempenho ──
    const sellerRows: SellerPerformance[] = tableSellers
      .map((seller) => {
        const supervisor = seller.supervisorUserId ? byId.get(seller.supervisorUserId) : undefined
        return {
          userId: seller.userId,
          name: memberName(seller),
          avatarUrl: seller.avatarUrl,
          supervisorName: supervisor ? memberName(supervisor) : null,
          ...performanceOf(
            { userIds: new Set([seller.userId]), includeUnassigned: false },
            openSalesAll,
            stats,
            seller.salesGoalCents,
            now,
          ),
        }
      })
      .sort((a, b) => b.wonValueCents - a.wonValueCents || b.wonCount - a.wonCount)

    let supervisorRows: SupervisorPerformance[] | null = null
    if (isOwner && scope.kind === 'organization') {
      supervisorRows = supervisors.map((supervisor) => {
        const team = teamOf(supervisor.userId)
        return {
          userId: supervisor.userId,
          name: memberName(supervisor),
          teamSize: team.length,
          ...performanceOf(
            {
              userIds: new Set([...team.map((m) => m.userId), supervisor.userId]),
              includeUnassigned: false,
            },
            openSalesAll,
            stats,
            sumGoals(team),
            now,
          ),
        }
      })
      const unlinked = sellers.filter((m) => !m.supervisorUserId || !byId.has(m.supervisorUserId))
      if (unlinked.length > 0 && supervisors.length > 0) {
        supervisorRows.push({
          userId: null,
          name: 'Sem supervisor',
          teamSize: unlinked.length,
          ...performanceOf(
            { userIds: new Set(unlinked.map((m) => m.userId)), includeUnassigned: false },
            openSalesAll,
            stats,
            sumGoals(unlinked),
            now,
          ),
        })
      }
      supervisorRows.sort(
        (a, b) =>
          Number(a.userId === null) - Number(b.userId === null) ||
          b.wonValueCents - a.wonValueCents,
      )
    }

    return {
      period,
      periodStart: start,
      periodEnd: end,
      scope,
      filters: {
        supervisors: isOwner
          ? supervisors.map((m) => ({ userId: m.userId, name: memberName(m) }))
          : [],
        sellers: visibleSellers.map((m) => ({ userId: m.userId, name: memberName(m) })),
      },
      summary: {
        openLeads: totals.openLeads,
        newLeads: totals.newLeads,
        wonCount: totals.wonCount,
        wonValueCents: totals.wonValueCents,
        conversionPercent: totals.conversionPercent,
        avgTicketCents:
          totals.wonCount > 0 ? Math.round(totals.wonValueCents / totals.wonCount) : null,
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
            stages: salesFunnelMetrics(chosen, openSales, chosenWon, now),
            wonCount: chosenWon,
          }
        : null,
      backoffice,
      sellers: sellerRows,
      supervisors: supervisorRows,
    }
  }
}
