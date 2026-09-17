// Cálculo de DataScope — alcance de dados por OrganizationType + Role
//
// ADR-05: DataScope é calculado a partir do tipo da organização + role do Membership ativo.
// O frontend NUNCA determina o DataScope.
//
// Hierarquia:
//   INCORPORADORA (qualquer role) → 'incorporadora' — visão agregada
//   MASTER (qualquer role)        → 'master' — todas as representações
//   REPRESENTACAO + ADMIN/MANAGER → 'representation' — toda a representação
//   REPRESENTACAO + SELLER        → 'own' — apenas seus próprios leads

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'

/**
 * Calcula o DataScope com base no tipo da organização e no role do usuário.
 *
 * A regra é hierárquica: o tipo da organização tem precedência.
 * Um SELLER numa INCORPORADORA (cenário improvável, mas possível) terá
 * scope 'incorporadora' — o tipo da organização define o teto.
 */
export function calculateDataScope(organizationType: OrganizationType, role: Role): DataScope {
  if (organizationType === OrganizationType.INCORPORADORA) {
    return DataScope.INCORPORADORA
  }

  if (organizationType === OrganizationType.MASTER) {
    return DataScope.MASTER
  }

  // OrganizationType.REPRESENTACAO
  if (role === Role.SELLER) {
    return DataScope.OWN
  }

  // ADMIN ou MANAGER em REPRESENTACAO → acesso a toda a representação
  return DataScope.REPRESENTATION
}
