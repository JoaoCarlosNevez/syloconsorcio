// IAchievementsRepository — dados do Mural de Conquistas do Perfil.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface AchievementsScope {
  organizationId: string
  userId: string
}

export interface IAchievementsRepository {
  /** Vendas do usuário (leads dele ganhos no funil padrão), da mais antiga
   * pra mais nova. */
  listWonSales(scope: AchievementsScope): Promise<{ wonAt: Date; valueCents: number }[]>

  /** Primeira vez que uma cota do usuário (lead dele) entrou numa destas
   * etapas do funil Pós-venda; null se nunca. */
  firstPostSaleStageAt(scope: AchievementsScope, stageNames: string[]): Promise<Date | null>

  /** Primeira vez que um destes itens do checklist foi marcado numa cota do
   * usuário (lead dele); null se nunca. */
  firstChecklistItemAt(scope: AchievementsScope, itemKeys: string[]): Promise<Date | null>

  // ── Administrativo (BACKOFFICE): conquistas pelo que ELE fez ──────────────

  /** Quando cada cota foi efetivada por ele (Ganho no funil ADM marcado pelo
   * usuário), da mais antiga pra mais nova — uma data por cota. */
  listEffectiveQuotaDates(scope: AchievementsScope): Promise<Date[]>

  /** Quando ele marcou cada item de checklist ainda marcado (só destes
   * itens, se vierem), do mais antigo pro mais novo. */
  listChecklistCheckDates(scope: AchievementsScope, itemKeys?: string[]): Promise<Date[]>

  /** Primeira resposta dele a um "Confirmar pagamento"; null se nunca. */
  firstPaymentCheckAt(scope: AchievementsScope): Promise<Date | null>

  /** Primeira vez que ele moveu uma cota pra uma destas etapas do Pós-venda
   * (qualquer responsável); null se nunca. */
  firstPostSaleStageMoveAt(scope: AchievementsScope, stageNames: string[]): Promise<Date | null>
}
