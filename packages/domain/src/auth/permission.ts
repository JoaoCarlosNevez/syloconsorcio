// Permission — ação específica que um usuário está autorizado a executar.
//
// Permissions são derivadas do Role no contexto do Membership ativo.
// Não verificar Role diretamente no código — verificar Permission.
//
// Exemplo correto:   if (context.permissions.includes(Permission.LEAD_ASSIGN))
// Exemplo incorreto: if (context.role === Role.ADMIN)
//
// Esta lista é não-exaustiva e cresce conforme novas features são implementadas.

export const Permission = {
  LEAD_READ: 'lead.read',
  LEAD_CREATE: 'lead.create',
  LEAD_UPDATE: 'lead.update',
  LEAD_ASSIGN: 'lead.assign',
  LEAD_DELETE: 'lead.delete',
  /** Ver leads marcados como Perdido (filtro "Perdido") e reabri-los — Vendedor
   * não tem: pode marcar um lead como perdido, mas não desfazer. (O filtro
   * "Todos", que inclui os perdidos, é liberado pro Vendedor.) */
  LEAD_MANAGE_LOST: 'lead.manage_lost',
  USER_INVITE: 'user.invite',
  USER_REMOVE: 'user.remove',
  /** Definir a meta de vendas (em crédito) de um membro da equipe — a
   * hierarquia fina (só papéis abaixo do seu) é aplicada em
   * UpdateTeamMemberSalesGoalUseCase. */
  TEAM_GOAL_UPDATE: 'team.goal_update',
  /** Definir a patente de um membro da equipe — mesma hierarquia fina da
   * meta, aplicada em UpdateTeamMemberTierUseCase. */
  TEAM_TIER_UPDATE: 'team.tier_update',
  /** Mudar o papel (Dono/Supervisor/Vendedor) de um membro — só Dono (e o
   * Super Admin). As regras finas (não muda o próprio, não rebaixa outro Dono,
   * a organização nunca fica sem Dono) ficam em UpdateTeamMemberRoleUseCase. */
  TEAM_ROLE_UPDATE: 'team.role_update',
  REPORTS_READ: 'reports.read',
  ORGANIZATION_UPDATE: 'organization.update',
  /** Ver o log de atividades da organização (Configurações > Atividade). */
  ACTIVITY_READ: 'activity.read',
  TASK_READ: 'task.read',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  /** Criar/editar uma tarefa atribuída a outra pessoa — Vendedor não tem:
   * toda tarefa que ele cria nasce (e permanece) atribuída a ele mesmo,
   * mesmo símile de LEAD_ASSIGN. */
  TASK_ASSIGN: 'task.assign',
  /** Criar e revogar as chaves de API da organização (webhook de leads em
   * Configurações > Integrações). Só Dono — a chave cria leads em nome da
   * organização inteira. */
  INTEGRATION_MANAGE: 'integration.manage',
  /** Configurar a fila de distribuição dos leads do webhook (Configurações >
   * Fila de Leads): ligar/desligar, tempo pra aceitar e quem participa. */
  LEAD_QUEUE_MANAGE: 'lead_queue.manage',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]
