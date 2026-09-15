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
  USER_INVITE: 'user.invite',
  USER_REMOVE: 'user.remove',
  REPORTS_READ: 'reports.read',
  ORGANIZATION_UPDATE: 'organization.update',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]
