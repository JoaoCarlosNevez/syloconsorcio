// IOrganizationRepository — port para leitura da hierarquia organizacional.
//
// Usado pelo resolvedor de DataScope (packages/application/src/leads/lead-scope.ts)
// para descobrir quais organizações um Membership MASTER ou INCORPORADORA alcança.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface IOrganizationRepository {
  /** IDs das organizações cujo parentOrganizationId é `parentOrganizationId`. */
  findChildOrganizationIds(parentOrganizationId: string): Promise<string[]>
}
