// IEngagementRepository — números do "Engajamento operacional" do Perfil: o
// que o próprio usuário fez num intervalo, na organização ativa.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface EngagementRange {
  organizationId: string
  userId: string
  from: Date
  to: Date
}

export interface IEngagementRepository {
  /** Leads diferentes em que o usuário agiu (ações de trabalho no log). */
  countLeadsWorked(range: EngagementRange): Promise<number>

  /** Propostas que o usuário gerou no intervalo; quantas foram enviadas por
   * link e, dessas, quantas o cliente abriu. */
  proposalStats(
    range: EngagementRange,
  ): Promise<{ created: number; shared: number; opened: number }>
}
