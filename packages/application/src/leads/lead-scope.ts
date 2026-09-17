// resolveLeadScope — traduz o Membership ativo (ADR-05) em filtros concretos
// de organização/responsável para as queries de leads.
//
// Hierarquia (AGENTS.md §8):
//   OWN            → só os leads do próprio usuário, na organização ativa
//   REPRESENTATION → todos os leads da organização ativa
//   MASTER         → a organização ativa + todas as suas Representações
//   INCORPORADORA  → a organização ativa + todos os Masters + todas as Representações deles
//
// A hierarquia tem no máximo 3 níveis (AGENTS.md §6), então a resolução é feita
// com duas buscas diretas — não é necessária uma CTE recursiva genérica.

import { DataScope } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import type { IOrganizationRepository } from '../ports/organization.repository'

export interface LeadScope {
  organizationIds: string[]
  assignedUserId?: string
}

export async function resolveLeadScope(
  membership: MembershipContext,
  userId: string,
  organizationRepository: IOrganizationRepository,
): Promise<LeadScope> {
  switch (membership.dataScope) {
    case DataScope.OWN:
      return { organizationIds: [membership.organizationId], assignedUserId: userId }

    case DataScope.REPRESENTATION:
      return { organizationIds: [membership.organizationId] }

    case DataScope.MASTER: {
      const representations = await organizationRepository.findChildOrganizationIds(
        membership.organizationId,
      )
      return { organizationIds: [membership.organizationId, ...representations] }
    }

    case DataScope.INCORPORADORA: {
      const masters = await organizationRepository.findChildOrganizationIds(
        membership.organizationId,
      )
      const nestedRepresentations = await Promise.all(
        masters.map((masterId) => organizationRepository.findChildOrganizationIds(masterId)),
      )
      return {
        organizationIds: [membership.organizationId, ...masters, ...nestedRepresentations.flat()],
      }
    }
  }
}
