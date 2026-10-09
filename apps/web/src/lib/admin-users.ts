// Linhas da aba Usuários da Administração: os vínculos de cada pessoa com
// as organizações, marcando quem é Super Admin, mais os Super Admins que não
// estão em nenhuma organização (senão nem apareceriam). Super Admins primeiro.

import type { PlatformAdmin, PlatformMember } from './organizations-api'

export interface AdminUserRow {
  /** Único por linha — a mesma pessoa pode estar em várias organizações. */
  key: string
  userId: string
  name: string | null
  email: string
  isPlatformAdmin: boolean
  /** null = Super Admin sem nenhuma organização. */
  member: PlatformMember | null
}

function displayName(row: { name: string | null; email: string }): string {
  return (row.name?.trim() || row.email).toLocaleLowerCase('pt-BR')
}

export function buildAdminUserRows(
  members: PlatformMember[],
  platformAdmins: PlatformAdmin[],
): AdminUserRow[] {
  const adminIds = new Set(platformAdmins.map((admin) => admin.userId))
  const withOrganization = new Set(members.map((member) => member.userId))

  const rows: AdminUserRow[] = members.map((member) => ({
    key: `${member.userId}:${member.organizationId}`,
    userId: member.userId,
    name: member.name,
    email: member.email,
    isPlatformAdmin: adminIds.has(member.userId),
    member,
  }))
  for (const admin of platformAdmins) {
    if (withOrganization.has(admin.userId)) continue
    rows.push({
      key: `${admin.userId}:sem-organizacao`,
      userId: admin.userId,
      name: admin.name,
      email: admin.email,
      isPlatformAdmin: true,
      member: null,
    })
  }

  return rows.sort(
    (a, b) =>
      Number(b.isPlatformAdmin) - Number(a.isPlatformAdmin) ||
      displayName(a).localeCompare(displayName(b), 'pt-BR'),
  )
}
