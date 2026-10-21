// UpdateTeamMemberSupervisorUseCase — liga (ou desliga) um Vendedor a um
// Supervisor (Configurações → Equipe). O time de um Supervisor = os
// Vendedores ligados a ele; com time, o Supervisor passa a enxergar só os
// leads e tarefas do time (ver lead-scope.ts) e o Dono compara supervisores
// no painel de gestão.
//
// Regras: o membro precisa ser Vendedor ativo e o supervisor, Supervisor
// ativo, na mesma organização. A permissão (team.role_update, só Dono) é
// checada na rota.

import { Role, ValidationError } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTeamMemberSupervisorInput {
  actorUserId: string
  organizationId: string
  targetUserId: string
  /** null = sem supervisor. */
  supervisorUserId: string | null
}

export class UpdateTeamMemberSupervisorUseCase
  implements UseCase<UpdateTeamMemberSupervisorInput, boolean>
{
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** false quando o membro não existe (ou não está ativo) na organização. */
  async execute(input: UpdateTeamMemberSupervisorInput): Promise<boolean> {
    const members = await this.membershipRepository.findActiveByOrganizationId(input.organizationId)
    const active = members.filter((m) => m.status === 'ACTIVE')
    const target = active.find((m) => m.userId === input.targetUserId)
    if (!target) return false
    if (target.role !== Role.SELLER) {
      throw new ValidationError([{ field: 'userId', message: 'Só Vendedores têm supervisor.' }])
    }
    if (input.supervisorUserId) {
      const supervisor = active.find((m) => m.userId === input.supervisorUserId)
      if (!supervisor || supervisor.role !== Role.MANAGER) {
        throw new ValidationError([
          { field: 'supervisorUserId', message: 'Escolha um Supervisor ativo da equipe.' },
        ])
      }
    }
    if (target.supervisorUserId === input.supervisorUserId) return true

    await this.membershipRepository.updateSupervisor(
      input.targetUserId,
      input.organizationId,
      input.supervisorUserId,
    )
    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'team.supervisor_updated',
      entityType: 'team',
      entityId: input.targetUserId,
      entityLabel: target.name ?? target.email,
      metadata: { from: target.supervisorUserId, to: input.supervisorUserId },
    })
    return true
  }
}
