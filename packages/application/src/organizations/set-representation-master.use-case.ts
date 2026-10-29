// SetRepresentationMasterUseCase — Super Admin liga uma Representação a um
// Master (ou desliga, deixando-a independente). Só o Super Admin faz isso —
// a checagem fica na camada HTTP (requirePlatformAdmin).
//
// Invariantes (AGENTS.md §6): só Representação tem Master; o pai precisa ser
// uma organização MASTER; uma Representação pertence a um Master só (o campo
// é único, então trocar de Master é só apontar pro novo).

import { OrganizationType, ValidationError } from '@sylocrm/domain'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'

export interface SetRepresentationMasterInput {
  organizationId: string
  /** null = deixa a Representação independente. */
  masterOrganizationId: string | null
}

export class SetRepresentationMasterUseCase
  implements UseCase<SetRepresentationMasterInput, OrganizationRecord | null>
{
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  /** null quando a Representação não existe. */
  async execute(input: SetRepresentationMasterInput): Promise<OrganizationRecord | null> {
    const organization = await this.organizationRepository.findById(input.organizationId)
    if (!organization) return null
    if (organization.type !== OrganizationType.REPRESENTACAO) {
      throw new ValidationError([
        { field: 'masterOrganizationId', message: 'Só uma Representação pode ter um Master.' },
      ])
    }

    if (input.masterOrganizationId) {
      const master = await this.organizationRepository.findById(input.masterOrganizationId)
      if (master?.type !== OrganizationType.MASTER) {
        throw new ValidationError([
          { field: 'masterOrganizationId', message: 'Master não encontrado.' },
        ])
      }
    }

    return this.organizationRepository.update(organization.id, {
      parentOrganizationId: input.masterOrganizationId,
    })
  }
}
