// IMembershipRepository — port para resolução e escrita de memberships.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Usado pelo tenantMiddleware para resolver o contexto organizacional
// a partir do userId autenticado e do X-Organization-Id header, e pelos
// fluxos de criação de Representação / convite de equipe.

import type { OrganizationType, Role } from '@sylocrm/domain'

/**
 * Dados de membership retornados pelo repositório.
 * Inclui apenas o que é necessário para construir o AuthenticatedContext.
 */
export interface UserMembership {
  organizationId: string
  organizationType: OrganizationType
  organizationName: string
  /** Ícone da organização (branding.iconUrl), null quando não definido. */
  organizationIconUrl: string | null
  role: Role
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}

/** Membership com os dados do usuário — usado na listagem de equipe. */
export interface TeamMember {
  userId: string
  name: string | null
  email: string
  role: Role
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}

/** TeamMember com os dados da organização — usado na listagem cross-org do Super Admin. */
export interface PlatformTeamMember extends TeamMember {
  organizationId: string
  organizationName: string
}

export interface NewMembershipInput {
  userId: string
  organizationId: string
  role: Role
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

  /** Lista os membros ativos de uma organização, com dados do usuário. */
  findActiveByOrganizationId(organizationId: string): Promise<TeamMember[]>

  /** Lista os membros ativos de toda a plataforma, com dados da organização. Uso: Super Admin. */
  findAllActive(): Promise<PlatformTeamMember[]>

  create(input: NewMembershipInput): Promise<void>

  /** Remove (desvincula) um membro de uma organização. */
  remove(userId: string, organizationId: string): Promise<void>
}
