// UpdateTeamMemberRoleUseCase — muda o papel (Dono, Supervisor, Vendedor) de
// um membro da organização (Configurações → Equipe).
//
// Regras:
//   - Ninguém muda o próprio papel (nem o Super Admin — evita se trancar fora).
//   - Dono muda o papel de Supervisores e Vendedores, inclusive pra Dono.
//     Mexer no papel de outro Dono só o Super Admin pode (evita um sócio
//     rebaixar o outro).
//   - A organização nunca fica sem Dono ativo.
// A permissão em si (team.role_update, só Dono) é checada na rota.

import { AuthorizationError, Role, ValidationError } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTeamMemberRoleInput {
  actorUserId: string
  actorIsPlatformAdmin: boolean
  targetUserId: string
  /** Papel atual do membro. */
  targetRole: Role
  organizationId: string
  role: Role
}

export class UpdateTeamMemberRoleUseCase implements UseCase<UpdateTeamMemberRoleInput, void> {
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateTeamMemberRoleInput): Promise<void> {
    if (input.actorUserId === input.targetUserId) {
      throw new AuthorizationError('Você não pode mudar o próprio papel.')
    }
    if (!input.actorIsPlatformAdmin && input.targetRole === Role.ADMIN) {
      throw new AuthorizationError('Só o Super Admin pode mudar o papel de outro Dono.')
    }
    if (input.role === input.targetRole) return

    if (input.targetRole === Role.ADMIN) {
      const members = await this.membershipRepository.findActiveByOrganizationId(
        input.organizationId,
      )
      const otherOwners = members.filter(
        (m) => m.status === 'ACTIVE' && m.role === Role.ADMIN && m.userId !== input.targetUserId,
      )
      if (otherOwners.length === 0) {
        throw new ValidationError([
          { field: 'role', message: 'A organização precisa de pelo menos um Dono.' },
        ])
      }
    }

    await this.membershipRepository.updateRole(input.targetUserId, input.organizationId, input.role)

    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'team.role_updated',
      entityType: 'team',
      entityId: input.targetUserId,
      entityLabel: null,
      metadata: { from: input.targetRole, to: input.role },
    })
  }
}
