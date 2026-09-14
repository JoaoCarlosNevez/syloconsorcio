// IOrganizationRepository — port para leitura e criação de organizações.
//
// Usado pelo resolvedor de DataScope (packages/application/src/leads/lead-scope.ts)
// para descobrir quais organizações um Membership MASTER ou INCORPORADORA alcança,
// e pelo fluxo de criação de Representações (Super Admin).
// Implementação concreta: packages/infrastructure/src/database/repositories/

import type { OrganizationType } from '@sylocrm/domain'

export interface OrganizationRecord {
  id: string
  name: string
  type: OrganizationType
  parentOrganizationId: string | null
}

export interface NewOrganizationInput {
  name: string
  type: OrganizationType
  parentOrganizationId?: string | null
}

export interface IOrganizationRepository {
  /** IDs das organizações cujo parentOrganizationId é `parentOrganizationId`. */
  findChildOrganizationIds(parentOrganizationId: string): Promise<string[]>

  create(input: NewOrganizationInput): Promise<OrganizationRecord>
}
