// ReactivateTeamMemberUseCase — reverte a desativação de um membro (status
// volta pra ACTIVE). Mesma regra de hierarquia de RemoveTeamMemberUseCase:
// quem pode desativar um papel também pode reativá-lo.

import { AuthorizationError, type Role, canGrantRole } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface ReactivateTeamMemberInput {
  reactivatorRole: Role
  reactivatorIsPlatformAdmin: boolean
  targetUserId: string
  targetRole: Role
  organizationId: string
  actorUserId?: string
}

export class ReactivateTeamMemberUseCase implements UseCase<ReactivateTeamMemberInput, void> {
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: ReactivateTeamMemberInput): Promise<void> {
    if (
      !input.reactivatorIsPlatformAdmin &&
      !canGrantRole(input.reactivatorRole, input.targetRole)
    ) {
      throw new AuthorizationError(
        `${input.reactivatorRole} não pode reativar o papel ${input.targetRole}.`,
      )
    }

    await this.membershipRepository.reactivate(input.targetUserId, input.organizationId)

    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: 'team.member_reactivated',
      entityType: 'team',
      entityId: input.targetUserId,
      entityLabel: null,
      metadata: { role: input.targetRole },
    })
  }
}
