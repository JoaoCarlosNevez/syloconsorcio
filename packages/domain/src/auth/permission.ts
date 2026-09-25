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
   * não tem: pode marcar um lead como perdido, mas não desfazer. */
  LEAD_MANAGE_LOST: 'lead.manage_lost',
  USER_INVITE: 'user.invite',
  USER_REMOVE: 'user.remove',
  /** Definir a meta de vendas (em crédito) de um membro da equipe — a
   * hierarquia fina (só papéis abaixo do seu) é aplicada em
   * UpdateTeamMemberSalesGoalUseCase. */
  TEAM_GOAL_UPDATE: 'team.goal_update',
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
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]
