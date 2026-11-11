// resolveTaskScope — quais tarefas o usuário enxerga. Parte do mesmo DataScope
// de leads (resolveLeadScope) e acrescenta o que é próprio de tarefa:
//
//   OWN (Vendedor) → as atribuídas a ele, as que ele pediu pra outra pessoa
//                    (pedidos feitos pelo chat) e as que estão na fila de um
//                    setor dele, ainda sem ninguém.
//   Supervisor com time → as do time e as sem responsável (filas de setor).
//   Demais → todas as da(s) organização(ões) visível(is).

import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { TaskScopeFilter } from '../ports/task.repository'

export async function resolveTaskScope(
  membership: MembershipContext,
  userId: string,
  organizationRepository: IOrganizationRepository,
): Promise<TaskScopeFilter> {
  const scope = await resolveLeadScope(membership, userId, organizationRepository)
  if (scope.assignedUserId) {
    return {
      organizationIds: scope.organizationIds,
      ownUserId: scope.assignedUserId,
      ownSectors: membership.sectors,
    }
  }
  return scope
}
