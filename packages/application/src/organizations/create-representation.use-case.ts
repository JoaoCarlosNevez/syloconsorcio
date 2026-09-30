// CreateRepresentationUseCase — Super Admin cria uma nova Representação (tenant)
// e, opcionalmente, seu dono inicial (Membership ADMIN). Sem dono, só a
// organização é criada — o dono entra depois por CreatePlatformUserUseCase
// (Administração → Criar usuário, papel Dono).
//
// Toda organização nasce com o funil padrão (DEFAULT_FUNNEL_STAGES) — sem funil
// o Kanban fica vazio e não dá pra criar lead.
//
// A checagem de "é Super Admin" acontece na camada HTTP (requirePlatformAdmin
// middleware) — este use case assume que a chamada já foi autorizada.
//
// Representações criadas aqui nascem sempre independentes (sem
// parentOrganizationId) — vincular a um Master é evolução futura, fora do
// escopo atual (AGENTS.md §6).

import { OrganizationType, Role } from '@sylocrm/domain'
import { generateTemporaryPassword } from '../auth/generate-temporary-password'
import { DEFAULT_FUNNEL_NAME, DEFAULT_FUNNEL_STAGES } from '../funnels/default-funnel'
import type { AuthIdentity, IAuthProvider } from '../ports/auth.provider'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

export interface CreateRepresentationInput {
  organizationName: string
  /** null = criar só a organização, sem dono por enquanto. */
  owner: { name: string; email: string } | null
}

export interface CreateRepresentationOutput {
  organization: OrganizationRecord
  /** null quando a organização foi criada sem dono. */
  owner: (AuthIdentity & { temporaryPassword: string }) | null
}

export class CreateRepresentationUseCase
  implements UseCase<CreateRepresentationInput, CreateRepresentationOutput>
{
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
    private readonly funnelRepository: IFunnelRepository,
  ) {}

  async execute(input: CreateRepresentationInput): Promise<CreateRepresentationOutput> {
    // O login do dono é criado antes da organização: se o e-mail já existir
    // (ConflictError), nada fica pela metade.
    const owner = input.owner ? await this.createOwnerIdentity(input.owner) : null

    const organization = await this.organizationRepository.create({
      name: input.organizationName,
      type: OrganizationType.REPRESENTACAO,
      parentOrganizationId: null,
    })

    await this.funnelRepository.create({
      organizationId: organization.id,
      name: DEFAULT_FUNNEL_NAME,
      stages: [...DEFAULT_FUNNEL_STAGES],
      isDefault: true,
    })

    if (owner) {
      await this.membershipRepository.create({
        userId: owner.id,
        organizationId: organization.id,
        role: Role.ADMIN,
      })
    }

    return { organization, owner }
  }

  private async createOwnerIdentity(owner: {
    name: string
    email: string
  }): Promise<AuthIdentity & { temporaryPassword: string }> {
    const temporaryPassword = generateTemporaryPassword()
    const identity = await this.authProvider.createUser({
      email: owner.email,
      password: temporaryPassword,
    })
    await this.userRepository.upsert({ id: identity.id, email: identity.email, name: owner.name })
    return { ...identity, temporaryPassword }
  }
}
