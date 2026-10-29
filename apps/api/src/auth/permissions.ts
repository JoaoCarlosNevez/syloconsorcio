// Mapeamento de Role → Permission[]
//
// ADR-05: Permissions são derivadas do Role no contexto do Membership ativo.
// Nunca verificar Role diretamente — verificar Permission.
//
// Esta lógica é calculada a cada requisição no tenantMiddleware.
// Se a tabela de permissões crescer, migrar para uma tabela no banco.

import { OrganizationType, Permission, Role } from '@sylocrm/domain'

// Dono recebe toda Permission nova automaticamente — menos a da visão de rede,
// que só faz sentido numa organização MASTER (ver MASTER_PERMISSIONS).
const ADMIN_PERMISSIONS: readonly Permission[] = (Object.values(Permission) as Permission[]).filter(
  (permission) => permission !== Permission.NETWORK_READ,
)

const MANAGER_PERMISSIONS: readonly Permission[] = [
  Permission.LEAD_READ,
  Permission.LEAD_CREATE,
  Permission.LEAD_UPDATE,
  Permission.LEAD_ASSIGN,
  Permission.LEAD_DELETE,
  Permission.LEAD_MANAGE_LOST,
  Permission.REPORTS_READ,
  Permission.ACTIVITY_READ,
  // Supervisor pode convidar Vendedores — a hierarquia fina (não pode
  // conceder ADMIN/MANAGER) é aplicada em InviteTeamMemberUseCase.
  Permission.USER_INVITE,
  // Supervisor pode remover só Vendedores — a hierarquia fina é aplicada
  // em RemoveTeamMemberUseCase.
  Permission.USER_REMOVE,
  // Supervisor define a meta só de Vendedores — hierarquia fina em
  // UpdateTeamMemberSalesGoalUseCase.
  Permission.TEAM_GOAL_UPDATE,
  // Supervisor define a patente só de Vendedores — hierarquia fina em
  // UpdateTeamMemberTierUseCase.
  Permission.TEAM_TIER_UPDATE,
  // Supervisor também distribui leads — configura a fila do webhook.
  Permission.LEAD_QUEUE_MANAGE,
  Permission.TASK_READ,
  Permission.TASK_CREATE,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
]

// Administrativo (backoffice): opera os leads de toda a representação
// (distribui, cria e edita, cria tarefas pro time), mas não gerencia equipe,
// metas, configurações, integrações nem a fila; não reabre nem apaga leads.
const BACKOFFICE_PERMISSIONS: readonly Permission[] = [
  Permission.LEAD_READ,
  Permission.LEAD_CREATE,
  Permission.LEAD_UPDATE,
  Permission.LEAD_ASSIGN,
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

// Master: só monitora as Representações ligadas a ele — vê os painéis, não
// opera leads, equipe nem configurações de ninguém. Vale pra qualquer papel
// numa organização MASTER (o tipo da organização define o teto, como no
// DataScope).
const MASTER_PERMISSIONS: readonly Permission[] = [Permission.REPORTS_READ, Permission.NETWORK_READ]

const ROLE_PERMISSION_MAP: Record<Role, readonly Permission[]> = {
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.MANAGER]: MANAGER_PERMISSIONS,
  [Role.BACKOFFICE]: BACKOFFICE_PERMISSIONS,
  [Role.SELLER]: SELLER_PERMISSIONS,
}

/**
 * Retorna as permissions para um dado Role.
 * O resultado é imutável — não modificar o array retornado.
 */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSION_MAP[role]
}

/**
 * Permissions de uma membership: numa organização MASTER, o tipo prevalece
 * sobre o papel (só leitura); nas demais, vale o papel.
 */
export function getPermissionsForMembership(
  organizationType: OrganizationType,
  role: Role,
): readonly Permission[] {
  if (organizationType === OrganizationType.MASTER) return MASTER_PERMISSIONS
  return getPermissionsForRole(role)
}
