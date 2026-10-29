// GetMasterDashboardUseCase — o início do Master: comparativo das
// Representações ligadas a ele (vendas e meta, funil e conversão, saúde do
// pipeline, ADM e pós-venda) e o ranking unificado dos vendedores de todas.
//
// Cada Representação é calculada pelo mesmo GetManagementDashboardUseCase do
// início do Dono, com a visão do Dono (a representação inteira) — os números
// do Master batem com os que o Dono vê lá dentro.
//
// GetMasterRepresentationDashboardUseCase — o painel completo de uma das
// Representações (o mesmo do Dono), aberto a partir do comparativo. Só
// Representações ligadas ao Master; qualquer outra → AuthorizationError.
//
// Totais da rede:
// - Somas simples: leads em aberto, novos, vendas, valor, metas (null se
//   nenhuma Representação tiver meta), projeção (só as que têm).
// - Conversão = média das conversões ponderada pelos leads novos de cada uma
//   (= ganhos dos novos ÷ novos, a mesma conta do painel do Dono).
// - Tíquete = valor ÷ vendas.

import { AuthorizationError, Role } from '@sylocrm/domain'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import {
  type GetManagementDashboardUseCase,
  type ManagementDashboard,
  type ManagementPeriod,
  type SellerPerformance,
  periodRange,
} from './get-management-dashboard.use-case'

export interface GetMasterDashboardInput {
  masterOrganizationId: string
  userId: string
  period?: ManagementPeriod
  now?: Date
}

export interface RepresentationPerformance {
  id: string
  name: string
  summary: ManagementDashboard['summary']
  /** % da meta atingida; null sem meta. */
  goalPercent: number | null
  health: ManagementDashboard['health']
  /** Cards no funil ADM agora e quantos parados há mais de ADM_STALE_DAYS. */
  backoffice: { openCount: number; staleCount: number }
  /** Cotas ativas no pós-venda e quantas atrasadas. */
  postSale: { activeCount: number; lateCount: number }
  sellersCount: number
}

export interface NetworkSeller extends SellerPerformance {
  representationId: string
  representationName: string
}

export interface MasterDashboard {
  period: ManagementPeriod
  periodStart: Date
  periodEnd: Date
  totals: ManagementDashboard['summary'] & {
    goalPercent: number | null
    staleAttention: number
    backofficeStale: number
    postSaleLate: number
  }
  /** Ordenadas pelo valor vendido no período (maior primeiro). */
  representations: RepresentationPerformance[]
  /** Vendedores de todas as Representações, pelo valor vendido no período. */
  sellers: NetworkSeller[]
}

function goalPercentOf(wonValueCents: number, goalCents: number | null): number | null {
  return goalCents ? Math.round((wonValueCents / goalCents) * 1000) / 10 : null
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  return present.length > 0 ? present.reduce((sum, v) => sum + v, 0) : null
}

function toRepresentationPerformance(
  id: string,
  dashboard: ManagementDashboard,
): RepresentationPerformance {
  return {
    id,
    name: dashboard.scope.label,
    summary: dashboard.summary,
    goalPercent: goalPercentOf(dashboard.summary.wonValueCents, dashboard.summary.goalCents),
    health: dashboard.health,
    backoffice: {
      openCount: dashboard.backoffice?.stages.reduce((sum, s) => sum + s.count, 0) ?? 0,
      staleCount: dashboard.backoffice?.staleCount ?? 0,
    },
    postSale: {
      activeCount: dashboard.postSale?.activeCount ?? 0,
      lateCount: dashboard.postSale?.lateCount ?? 0,
    },
    sellersCount: dashboard.sellers.length,
  }
}

function networkTotals(rows: RepresentationPerformance[]): MasterDashboard['totals'] {
  const sum = (pick: (row: RepresentationPerformance) => number) =>
    rows.reduce((total, row) => total + pick(row), 0)
  const newLeads = sum((r) => r.summary.newLeads)
  const wonCount = sum((r) => r.summary.wonCount)
  const wonValueCents = sum((r) => r.summary.wonValueCents)
  const weightedConversion = sum((r) => (r.summary.conversionPercent ?? 0) * r.summary.newLeads)
  const goalCents = sumOrNull(rows.map((r) => r.summary.goalCents))
  return {
    openLeads: sum((r) => r.summary.openLeads),
    newLeads,
    wonCount,
    wonValueCents,
    conversionPercent: newLeads > 0 ? Math.round((weightedConversion / newLeads) * 10) / 10 : null,
    avgTicketCents: wonCount > 0 ? Math.round(wonValueCents / wonCount) : null,
    goalCents,
    projectedCents: sumOrNull(rows.map((r) => r.summary.projectedCents)),
    goalPercent: goalPercentOf(wonValueCents, goalCents),
    staleAttention: sum((r) => r.health.staleAttention),
    backofficeStale: sum((r) => r.backoffice.staleCount),
    postSaleLate: sum((r) => r.postSale.lateCount),
  }
}

export class GetMasterDashboardUseCase
  implements UseCase<GetMasterDashboardInput, MasterDashboard>
{
  constructor(
    private readonly managementDashboard: GetManagementDashboardUseCase,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: GetMasterDashboardInput): Promise<MasterDashboard> {
    const now = input.now ?? new Date()
    const period = input.period ?? 'month'
    const representationIds = await this.organizationRepository.findChildOrganizationIds(
      input.masterOrganizationId,
    )
    const dashboards = await Promise.all(
      representationIds.map(async (id) => ({
        id,
        dashboard: await this.managementDashboard.execute({
          organizationId: id,
          period,
          viewer: { userId: input.userId, role: Role.ADMIN },
          now,
        }),
      })),
    )

    const representations = dashboards
      .map(({ id, dashboard }) => toRepresentationPerformance(id, dashboard))
      .sort((a, b) => b.summary.wonValueCents - a.summary.wonValueCents)
    const sellers = dashboards
      .flatMap(({ id, dashboard }) =>
        dashboard.sellers.map((seller) => ({
          ...seller,
          representationId: id,
          representationName: dashboard.scope.label,
        })),
      )
      .sort((a, b) => b.wonValueCents - a.wonValueCents || b.wonCount - a.wonCount)

    const { start, end } = periodRange(period, now)
    return {
      period,
      periodStart: start,
      periodEnd: end,
      totals: networkTotals(representations),
      representations,
      sellers,
    }
  }
}

export interface GetMasterRepresentationDashboardInput {
  masterOrganizationId: string
  representationId: string
  userId: string
  period?: ManagementPeriod
  funnelId?: string
  sellerUserId?: string
  supervisorUserId?: string
}

export class GetMasterRepresentationDashboardUseCase
  implements UseCase<GetMasterRepresentationDashboardInput, ManagementDashboard>
{
  constructor(
    private readonly managementDashboard: GetManagementDashboardUseCase,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: GetMasterRepresentationDashboardInput): Promise<ManagementDashboard> {
    const representationIds = await this.organizationRepository.findChildOrganizationIds(
      input.masterOrganizationId,
    )
    if (!representationIds.includes(input.representationId)) {
      throw new AuthorizationError('Esta Representação não está ligada ao seu Master.')
    }
    return this.managementDashboard.execute({
      organizationId: input.representationId,
      period: input.period,
      funnelId: input.funnelId,
      sellerUserId: input.sellerUserId,
      supervisorUserId: input.supervisorUserId,
      viewer: { userId: input.userId, role: Role.ADMIN },
    })
  }
}
