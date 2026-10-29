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
// Também cria organizações Master (type MASTER): sem funis — o Master não
// opera leads, só acompanha as Representações ligadas a ele. Uma Representação
// pode nascer já ligada a um Master (masterOrganizationId) ou independente;
// o vínculo muda depois por SetRepresentationMasterUseCase.

import { OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { generateTemporaryPassword } from '../auth/generate-temporary-password'
import { DEFAULT_FUNNEL_NAME, DEFAULT_FUNNEL_STAGES } from '../funnels/default-funnel'
import type { AuthIdentity, IAuthProvider } from '../ports/auth.provider'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

import {
  BACKOFFICE_FUNNEL_NAME,
  BACKOFFICE_FUNNEL_STAGES,
  POST_SALE_FUNNEL_NAME,
  POST_SALE_FUNNEL_STAGES,
} from '../funnels/system-funnels'
export interface CreateRepresentationInput {
  organizationName: string
  /** Padrão: REPRESENTACAO. */
  type?: typeof OrganizationType.REPRESENTACAO | typeof OrganizationType.MASTER
  /** Só pra Representação: o Master ao qual ela pertence (null = independente). */
  masterOrganizationId?: string | null
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
    const type = input.type ?? OrganizationType.REPRESENTACAO
    const masterOrganizationId =
      type === OrganizationType.REPRESENTACAO ? (input.masterOrganizationId ?? null) : null
    if (masterOrganizationId) {
      const master = await this.organizationRepository.findById(masterOrganizationId)
      if (master?.type !== OrganizationType.MASTER) {
        throw new ValidationError([
          { field: 'masterOrganizationId', message: 'Master não encontrado.' },
        ])
      }
    }

    // O login do dono é criado antes da organização: se o e-mail já existir
    // (ConflictError), nada fica pela metade.
    const owner = input.owner ? await this.createOwnerIdentity(input.owner) : null

    const organization = await this.organizationRepository.create({
      name: input.organizationName,
      type,
      parentOrganizationId: masterOrganizationId,
    })

    if (type === OrganizationType.REPRESENTACAO) await this.createFunnels(organization.id)

    if (owner) {
      await this.membershipRepository.create({
        userId: owner.id,
        organizationId: organization.id,
        role: Role.ADMIN,
      })
    }

    return { organization, owner }
  }

  private async createFunnels(organizationId: string): Promise<void> {
    await this.funnelRepository.create({
      organizationId,
      name: DEFAULT_FUNNEL_NAME,
      stages: [...DEFAULT_FUNNEL_STAGES],
      isDefault: true,
      kind: 'COMMERCIAL',
    })
    await this.funnelRepository.create({
      organizationId,
      name: BACKOFFICE_FUNNEL_NAME,
      stages: [...BACKOFFICE_FUNNEL_STAGES],
      kind: 'BACKOFFICE',
    })
    await this.funnelRepository.create({
      organizationId,
      name: POST_SALE_FUNNEL_NAME,
      stages: [...POST_SALE_FUNNEL_STAGES],
      kind: 'POST_SALE',
    })
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
