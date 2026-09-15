// RemoveTeamMemberUseCase — desativa um membro da organização (status vira
// SUSPENDED). Não apaga o vínculo — ele pode ser reativado depois (ver
// ReactivateTeamMemberUseCase) sem violar a constraint UNIQUE(user_id,
// organization_id), e a pessoa some das listas de equipe até lá.
//
// Regra de hierarquia (a mesma de InviteTeamMemberUseCase — canGrantRole):
// ADMIN (Dono) remove MANAGER/SELLER; MANAGER (Supervisor) remove só SELLER.
// O Super Admin da plataforma ignora a hierarquia — pode remover qualquer
// papel, incluindo outro ADMIN.
//
// Ninguém pode remover a si mesmo (evitaria, entre outras coisas, o próprio
// Dono se desvincular e deixar a organização sem ADMIN).

import { AuthorizationError, type Role, canGrantRole } from '@sylocrm/domain'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface RemoveTeamMemberInput {
  removerRole: Role
  removerIsPlatformAdmin: boolean
  actorUserId: string
  targetUserId: string
  targetRole: Role
  organizationId: string
}

export class RemoveTeamMemberUseCase implements UseCase<RemoveTeamMemberInput, void> {
  constructor(private readonly membershipRepository: IMembershipRepository) {}

  async execute(input: RemoveTeamMemberInput): Promise<void> {
    if (input.actorUserId === input.targetUserId) {
      throw new AuthorizationError('Você não pode remover a si mesmo da equipe.')
    }

    if (!input.removerIsPlatformAdmin && !canGrantRole(input.removerRole, input.targetRole)) {
      throw new AuthorizationError(
        `${input.removerRole} não pode remover o papel ${input.targetRole}.`,
      )
    }

    await this.membershipRepository.deactivate(input.targetUserId, input.organizationId)
  }
}
