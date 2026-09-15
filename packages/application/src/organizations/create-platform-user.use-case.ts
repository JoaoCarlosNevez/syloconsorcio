// CreatePlatformUserUseCase — Super Admin cria um usuário com qualquer Role
// em qualquer Representação já existente.
//
// Diferente de InviteTeamMemberUseCase, não aplica canGrantRole: o Super
// Admin está acima de toda a hierarquia de Role (já cria o ADMIN inicial em
// CreateRepresentationUseCase), então pode conceder qualquer papel.
//
// Uma Representação só pode ter um ADMIN (Dono) por vez — mesmo o Super
// Admin não pode criar um segundo.
//
// A checagem de "é Super Admin" e de existência da organização acontecem na
// camada HTTP — este use case assume que a chamada já foi autorizada.

import { ConflictError, Role } from '@sylocrm/domain'
import { generateTemporaryPassword } from '../auth/generate-temporary-password'
import type { AuthIdentity, IAuthProvider } from '../ports/auth.provider'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

export interface CreatePlatformUserInput {
  organizationId: string
  role: Role
  name: string
  email: string
}

export interface CreatePlatformUserOutput {
  member: AuthIdentity & { temporaryPassword: string; role: Role }
}

export class CreatePlatformUserUseCase
  implements UseCase<CreatePlatformUserInput, CreatePlatformUserOutput>
{
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: CreatePlatformUserInput): Promise<CreatePlatformUserOutput> {
    if (input.role === Role.ADMIN) {
      const members = await this.membershipRepository.findActiveByOrganizationId(
        input.organizationId,
      )
      if (members.some((member) => member.role === Role.ADMIN)) {
        throw new ConflictError('Esta Representação já tem um Dono (ADMIN).')
      }
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
      role: input.role,
    })

    return { member: { ...identity, temporaryPassword, role: input.role } }
  }
}
