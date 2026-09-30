// UpdateTeamMemberTierUseCase — define a patente (Bronze → Diamante) de um
// membro da organização (Configurações → Equipe). Mesma hierarquia de
// UpdateTeamMemberSalesGoalUseCase: Dono define a patente de Supervisores e
// Vendedores, Supervisor só de Vendedores — ninguém define a própria. Super
// Admin da plataforma ignora a hierarquia. Só Vendedores têm patente
// (roleHasTier) — definir a de um Dono/Supervisor é recusado.

import {
  AuthorizationError,
  type MemberTier,
  type Role,
  ValidationError,
  canGrantRole,
  roleHasTier,
} from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTeamMemberTierInput {
  actorUserId?: string
  actorRole: Role
  actorIsPlatformAdmin: boolean
  targetUserId: string
  targetRole: Role
  organizationId: string
  tier: MemberTier
}

export class UpdateTeamMemberTierUseCase implements UseCase<UpdateTeamMemberTierInput, void> {
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateTeamMemberTierInput): Promise<void> {
    if (!input.actorIsPlatformAdmin && !canGrantRole(input.actorRole, input.targetRole)) {
      throw new AuthorizationError(
        `${input.actorRole} não pode definir a patente do papel ${input.targetRole}.`,
      )
    }

    if (!roleHasTier(input.targetRole)) {
      throw new ValidationError([{ field: 'tier', message: 'Só vendedores têm patente.' }])
    }

    await this.membershipRepository.updateTier(input.targetUserId, input.organizationId, input.tier)

    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: 'team.tier_updated',
      entityType: 'team',
      entityId: input.targetUserId,
      entityLabel: null,
      metadata: { tier: input.tier, role: input.targetRole },
    })
  }
}
