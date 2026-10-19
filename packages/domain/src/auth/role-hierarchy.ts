// canGrantRole — um Role só pode conceder papéis estritamente abaixo do seu.
//
// AGENTS.md §7: o dono (ADMIN) de uma Representação cria Supervisores
// (MANAGER), Administrativos (BACKOFFICE) e Vendedores (SELLER); um Supervisor
// cria só Vendedores; Administrativo e Vendedor não criam ninguém.
// Administrativo fica no mesmo nível do Supervisor: um não gerencia o outro.

import { Role } from './role'

const ROLE_RANK: Record<Role, number> = {
  [Role.SELLER]: 0,
  [Role.MANAGER]: 1,
  [Role.BACKOFFICE]: 1,
  [Role.ADMIN]: 2,
}

export function canGrantRole(granterRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[granterRole] > ROLE_RANK[targetRole]
}
