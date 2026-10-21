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
}
