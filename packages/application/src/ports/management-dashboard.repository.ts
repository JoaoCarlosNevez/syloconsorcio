// IManagementDashboardRepository — leituras do painel de gestão (início do
// Dono e do Supervisor). Só dados crus, agrupados por responsável; as contas
// e o recorte (time, supervisor, vendedor) ficam em
// GetManagementDashboardUseCase, onde são testados.
// Implementação concreta: packages/infrastructure/src/database/repositories/

/** Lead em aberto (sem Ganho e sem Perdido) — base do funil e da saúde. */
export interface OpenLeadSnapshot {
  id: string
  name: string
  funnelId: string
  stageId: string
  assignedUserId: string | null
  valueCents: number
  /** Desde quando está na etapa atual. */
  stageChangedAt: Date
}

/** Números do período por responsável (null = sem responsável). */
export interface AssigneePeriodStats {
  assignedUserId: string | null
  /** Leads que entraram nos funis de VENDAS no período (cópias do ADM não contam). */
  created: number
  /** Desses, quantos já foram ganhos. */
  wonOfCreated: number
  /** Vendas no período: Ganho no funil padrão (mesmo recorte das metas). */
  wonCount: number
  wonValueCents: number
}

export interface IManagementDashboardRepository {
  listOpenLeads(organizationId: string): Promise<OpenLeadSnapshot[]>

  statsByAssignee(organizationId: string, from: Date, to: Date): Promise<AssigneePeriodStats[]>

  /** Leads da fila do webhook esperando alguém aceitar. */
  countPendingQueueOffers(organizationId: string): Promise<number>

  /** Leads já ganhos no funil (desde sempre), por responsável — fecham a
   * conta de conversão da última etapa. */
  wonInFunnelByAssignee(
    funnelId: string,
  ): Promise<{ assignedUserId: string | null; count: number }[]>
}
