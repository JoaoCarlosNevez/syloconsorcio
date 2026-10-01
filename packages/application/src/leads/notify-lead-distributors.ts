// Avisa no sininho ('lead.received') quem distribui os leads — Dono e
// Supervisores ativos — sobre um lead sem responsável. Usado quando o lead
// chega pelo webhook sem fila, e quando ninguém da fila aceitou
// (metadata.queueExhausted).

import { Role } from '@sylocrm/domain'
import type { LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type {
  INotificationRepository,
  NotificationMetadata,
} from '../ports/notification.repository'

const DISTRIBUTOR_ROLES: ReadonlySet<Role> = new Set([Role.ADMIN, Role.MANAGER])

export async function notifyLeadDistributors(
  lead: LeadRecord,
  membershipRepository: IMembershipRepository,
  notifications: INotificationRepository,
  extraMetadata: NotificationMetadata = {},
): Promise<void> {
  const members = await membershipRepository.findActiveByOrganizationId(lead.organizationId)
  const distributors = members.filter((m) => m.status === 'ACTIVE' && DISTRIBUTOR_ROLES.has(m.role))
  for (const member of distributors) {
    await notifications.notify({
      organizationId: lead.organizationId,
      userId: member.userId,
      actorUserId: null,
      type: 'lead.received',
      taskId: null,
      title: lead.name,
      metadata: {
        leadId: lead.id,
        funnelId: lead.funnelId,
        source: lead.source,
        assignedToYou: false,
        ...extraMetadata,
      },
    })
  }
}
