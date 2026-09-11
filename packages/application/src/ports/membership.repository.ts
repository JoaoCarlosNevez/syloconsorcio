// IMembershipRepository — port para resolução de memberships por requisição.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Usado pelo tenantMiddleware para resolver o contexto organizacional
// a partir do userId autenticado e do X-Organization-Id header.

import type { OrganizationType, Role } from '@sylocrm/domain'

/**
 * Dados de membership retornados pelo repositório.
 * Inclui apenas o que é necessário para construir o AuthenticatedContext.
 */
export interface UserMembership {
  organizationId: string
  organizationType: OrganizationType
  role: Role
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}

/**
 * Contrato de acesso a memberships — injetado no tenantMiddleware via DI.
 *
 * Queries devem ser eficientes: o tenantMiddleware executa em cada requisição
 * autenticada que requer contexto organizacional.
 */
export interface IMembershipRepository {
  /**
   * Retorna todas as memberships de um usuário.
   * Inclui apenas memberships com status ACTIVE.
   */
  findActiveByUserId(userId: string): Promise<UserMembership[]>

  /**
   * Retorna uma membership específica (usuário + organização).
   * Retorna null se não existir ou se não estiver ACTIVE.
   */
  findActiveByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<UserMembership | null>
}
