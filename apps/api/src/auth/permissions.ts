// Mapeamento de Role → Permission[]
//
// ADR-05: Permissions são derivadas do Role no contexto do Membership ativo.
// Nunca verificar Role diretamente — verificar Permission.
//
// Esta lógica é calculada a cada requisição no tenantMiddleware.
// Se a tabela de permissões crescer, migrar para uma tabela no banco.

import { Permission, Role } from '@sylocrm/domain'

const ADMIN_PERMISSIONS: readonly Permission[] = Object.values(Permission) as Permission[]

const MANAGER_PERMISSIONS: readonly Permission[] = [
  Permission.LEAD_READ,
  Permission.LEAD_CREATE,
  Permission.LEAD_UPDATE,
  Permission.LEAD_ASSIGN,
  Permission.LEAD_DELETE,
  Permission.LEAD_MANAGE_LOST,
  Permission.REPORTS_READ,
  // Supervisor pode convidar Vendedores — a hierarquia fina (não pode
  // conceder ADMIN/MANAGER) é aplicada em InviteTeamMemberUseCase.
  Permission.USER_INVITE,
  // Supervisor pode remover só Vendedores — a hierarquia fina é aplicada
  // em RemoveTeamMemberUseCase.
  Permission.USER_REMOVE,
  Permission.TASK_READ,
  Permission.TASK_CREATE,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
]

const SELLER_PERMISSIONS: readonly Permission[] = [
  Permission.LEAD_READ,
  Permission.LEAD_CREATE,
  Permission.LEAD_UPDATE,
  Permission.TASK_READ,
  Permission.TASK_CREATE,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
]

const ROLE_PERMISSION_MAP: Record<Role, readonly Permission[]> = {
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.MANAGER]: MANAGER_PERMISSIONS,
  [Role.SELLER]: SELLER_PERMISSIONS,
}

/**
 * Retorna as permissions para um dado Role.
 * O resultado é imutável — não modificar o array retornado.
 */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSION_MAP[role]
}
