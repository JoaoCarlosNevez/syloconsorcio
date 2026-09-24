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
  avatarUrl: string | null
  role: Role
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  /** Meta de vendas na organização, em centavos de crédito. null = sem meta. */
  salesGoalCents: number | null
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

  /**
   * Retorna uma membership específica (usuário + organização), qualquer
   * status. Retorna null se o vínculo nunca existiu.
   */
  findByUserAndOrganization(userId: string, organizationId: string): Promise<UserMembership | null>

  /** Lista os membros ativos de uma organização, com dados do usuário. */
  findActiveByOrganizationId(organizationId: string): Promise<TeamMember[]>

  /** Lista todos os membros de uma organização (qualquer status), com dados do usuário. */
  findByOrganizationId(organizationId: string): Promise<TeamMember[]>

  /** Lista os membros ativos de toda a plataforma, com dados da organização. Uso: Super Admin. */
  findAllActive(): Promise<PlatformTeamMember[]>

  /** Lista todos os membros de toda a plataforma (qualquer status). Uso: Super Admin. */
  findAll(): Promise<PlatformTeamMember[]>

  create(input: NewMembershipInput): Promise<void>

  /**
   * Desativa (status = SUSPENDED) o vínculo de um membro com uma organização.
   * Não apaga a linha — permite reativar depois sem violar a constraint
   * UNIQUE(user_id, organization_id).
   */
  deactivate(userId: string, organizationId: string): Promise<void>

  /** Reativa (status = ACTIVE) um vínculo previamente desativado. */
  reactivate(userId: string, organizationId: string): Promise<void>

  /** Define (ou limpa, com null) a meta de vendas do membro na organização. */
  updateSalesGoal(
    userId: string,
    organizationId: string,
    salesGoalCents: number | null,
  ): Promise<void>

  /**
   * Apaga (hard delete) todos os vínculos de um usuário com qualquer
   * organização. Uso: exclusão completa de conta pelo Super Admin.
   */
  removeAllForUser(userId: string): Promise<void>
}
