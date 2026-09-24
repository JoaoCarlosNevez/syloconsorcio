// UpdateTeamMemberSalesGoalUseCase — define (ou limpa) a meta de vendas, em
// valor de crédito, de um membro da organização. Qualquer membro define a
// própria meta (Editar perfil). Pra meta de outra pessoa vale a mesma
// hierarquia de Remove/ReactivateTeamMemberUseCase: Dono define a meta de
// Supervisores e Vendedores, Supervisor só de Vendedores. Super Admin da
// plataforma ignora a hierarquia.

import { AuthorizationError, type Role, canGrantRole } from '@sylocrm/domain'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTeamMemberSalesGoalInput {
  actorUserId: string
  actorRole: Role
  actorIsPlatformAdmin: boolean
  targetUserId: string
  targetRole: Role
  organizationId: string
  /** Centavos de crédito (inteiro ≥ 0, validado na rota); null remove a meta. */
  salesGoalCents: number | null
}

export class UpdateTeamMemberSalesGoalUseCase
  implements UseCase<UpdateTeamMemberSalesGoalInput, void>
{
  constructor(private readonly membershipRepository: IMembershipRepository) {}

  async execute(input: UpdateTeamMemberSalesGoalInput): Promise<void> {
    const isOwnGoal = input.actorUserId === input.targetUserId
    if (
      !isOwnGoal &&
      !input.actorIsPlatformAdmin &&
      !canGrantRole(input.actorRole, input.targetRole)
    ) {
      throw new AuthorizationError(
        `${input.actorRole} não pode definir a meta do papel ${input.targetRole}.`,
      )
    }

    await this.membershipRepository.updateSalesGoal(
      input.targetUserId,
      input.organizationId,
      input.salesGoalCents,
    )
  }
}
