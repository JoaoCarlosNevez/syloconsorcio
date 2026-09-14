// AuthenticatedContext — contrato interno de autenticação/autorização da Application.
//
// Depois que o adapter de infraestrutura autentica a requisição, o restante
// da aplicação trabalha exclusivamente com este tipo — nunca com objetos do SDK do Supabase.
//
// Fluxo de construção:
//   1. authMiddleware verifica o Bearer token via IAuthProvider
//   2. tenantMiddleware resolve a Membership ativa via X-Organization-Id header
//   3. AuthenticatedContext é construído e injetado nos Use Cases
//
// Regras:
//   - currentMembership é a organização em que a operação está sendo executada
//   - availableMemberships é a lista completa de organizações às quais o usuário pertence
//   - Use cases recebem AuthenticatedContext e usam currentMembership para autorizar

import type { DataScope } from '@sylocrm/domain'
import type { OrganizationType } from '@sylocrm/domain'
import type { Permission } from '@sylocrm/domain'
import type { Role } from '@sylocrm/domain'

export interface MembershipContext {
  /** ID da organização nesta membership */
  organizationId: string
  /** Tipo da organização (INCORPORADORA, MASTER, REPRESENTACAO) */
  organizationType: OrganizationType
  /** Nome de exibição da organização — usado pelo seletor de organização na sidebar */
  organizationName: string
  /** Ícone da organização (branding.iconUrl), null quando não definido */
  organizationIconUrl: string | null
  /** Papel do usuário nesta organização específica */
  role: Role
  /** Alcance de dados calculado a partir do tipo da org + role */
  dataScope: DataScope
  /** Ações autorizadas para este contexto de membership */
  permissions: readonly Permission[]
}

export interface AuthenticatedContext {
  /** ID da identidade no provedor de autenticação (= users.id no domínio) */
  identityId: string
  /** ID do usuário no domínio — igual a identityId por decisão arquitetural */
  userId: string
  /** Membership ativa para esta requisição (resolvida via X-Organization-Id) */
  currentMembership: MembershipContext
  /** Todas as memberships ativas do usuário — usadas para troca de contexto */
  availableMemberships: readonly MembershipContext[]
}
