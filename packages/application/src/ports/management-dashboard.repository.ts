// IManagementDashboardRepository — leituras do painel de gestão (início do
// Dono e do Supervisor). Só dados crus; as contas (paradas, conversão,
// tempo médio) ficam em GetManagementDashboardUseCase, onde são testadas.
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

export interface IManagementDashboardRepository {
  listOpenLeads(organizationId: string): Promise<OpenLeadSnapshot[]>

  /** Leads que entraram nos funis de VENDAS em [from, to) e, deles, quantos
   * já foram ganhos (cópias do funil ADM não contam). */
  countCreatedInSalesFunnels(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ created: number; wonOfCreated: number }>

  /** Leads da fila do webhook esperando alguém aceitar. */
  countPendingQueueOffers(organizationId: string): Promise<number>

  /** Leads já ganhos no funil (desde sempre) — fecham a conta de conversão
   * da última etapa. */
  countWonInFunnel(funnelId: string): Promise<number>
}
