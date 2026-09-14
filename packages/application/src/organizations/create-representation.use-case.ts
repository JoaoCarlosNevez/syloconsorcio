// CreateRepresentationUseCase — Super Admin cria uma nova Representação (tenant)
// e define seu dono inicial (Membership ADMIN).
//
// A checagem de "é Super Admin" acontece na camada HTTP (requirePlatformAdmin
// middleware) — este use case assume que a chamada já foi autorizada.
//
// Representações criadas aqui nascem sempre independentes (sem
// parentOrganizationId) — vincular a um Master é evolução futura, fora do
// escopo atual (AGENTS.md §6).

import { OrganizationType, Role } from '@sylocrm/domain'
import { generateTemporaryPassword } from '../auth/generate-temporary-password'
import type { AuthIdentity, IAuthProvider } from '../ports/auth.provider'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

export interface CreateRepresentationInput {
  organizationName: string
  ownerName: string
  ownerEmail: string
}

export interface CreateRepresentationOutput {
  organization: OrganizationRecord
  owner: AuthIdentity & { temporaryPassword: string }
}

export class CreateRepresentationUseCase
  implements UseCase<CreateRepresentationInput, CreateRepresentationOutput>
{
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: CreateRepresentationInput): Promise<CreateRepresentationOutput> {
    const temporaryPassword = generateTemporaryPassword()

    const identity = await this.authProvider.createUser({
      email: input.ownerEmail,
      password: temporaryPassword,
    })

    await this.userRepository.upsert({
      id: identity.id,
      email: identity.email,
      name: input.ownerName,
    })

    const organization = await this.organizationRepository.create({
      name: input.organizationName,
      type: OrganizationType.REPRESENTACAO,
      parentOrganizationId: null,
    })

    await this.membershipRepository.create({
      userId: identity.id,
      organizationId: organization.id,
      role: Role.ADMIN,
    })

    return { organization, owner: { ...identity, temporaryPassword } }
  }
}
