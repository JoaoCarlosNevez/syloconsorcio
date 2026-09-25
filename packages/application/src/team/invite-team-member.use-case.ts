// InviteTeamMemberUseCase — cria um novo usuário e o adiciona à organização
// ativa do convidador (ADMIN convida MANAGER/SELLER; MANAGER convida só SELLER).
//
// A checagem de Permission (user.invite) acontece na camada HTTP. Este use
// case aplica a regra fina de hierarquia (canGrantRole) — um invariante do
// próprio convite, não apenas uma permissão de rota.

import { AuthorizationError, type Role, canGrantRole } from '@sylocrm/domain'
import { generateTemporaryPassword } from '../auth/generate-temporary-password'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { AuthIdentity, IAuthProvider } from '../ports/auth.provider'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

export interface InviteTeamMemberInput {
  inviterRole: Role
  organizationId: string
  targetRole: Role
  name: string
  email: string
  actorUserId?: string
}

export interface InviteTeamMemberOutput {
  member: AuthIdentity & { temporaryPassword: string; role: Role }
}

export class InviteTeamMemberUseCase
  implements UseCase<InviteTeamMemberInput, InviteTeamMemberOutput>
{
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: InviteTeamMemberInput): Promise<InviteTeamMemberOutput> {
    if (!canGrantRole(input.inviterRole, input.targetRole)) {
      throw new AuthorizationError(
        `${input.inviterRole} não pode conceder o papel ${input.targetRole}.`,
      )
    }

    const temporaryPassword = generateTemporaryPassword()

    const identity = await this.authProvider.createUser({
      email: input.email,
      password: temporaryPassword,
    })

    await this.userRepository.upsert({ id: identity.id, email: identity.email, name: input.name })

    await this.membershipRepository.create({
      userId: identity.id,
      organizationId: input.organizationId,
      role: input.targetRole,
    })

    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: 'team.member_invited',
      entityType: 'team',
      entityId: identity.id,
      entityLabel: input.name,
      metadata: { role: input.targetRole, email: identity.email },
    })

    return { member: { ...identity, temporaryPassword, role: input.targetRole } }
  }
}
