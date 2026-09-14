// canGrantRole — um Role só pode conceder papéis estritamente abaixo do seu.
//
// AGENTS.md §7: o dono (ADMIN) de uma Representação cria Supervisores
// (MANAGER) e Vendedores (SELLER); um Supervisor cria só Vendedores;
// um Vendedor não cria ninguém.

import { Role } from './role'

const ROLE_RANK: Record<Role, number> = {
  [Role.SELLER]: 0,
  [Role.MANAGER]: 1,
  [Role.ADMIN]: 2,
}

export function canGrantRole(granterRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[granterRole] > ROLE_RANK[targetRole]
}
