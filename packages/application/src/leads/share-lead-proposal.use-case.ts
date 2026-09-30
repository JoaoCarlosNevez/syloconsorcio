// ShareLeadProposalUseCase — gera (ou devolve o já existente) link público de
// uma proposta, pro vendedor mandar pro cliente. Só quem enxerga o lead pode
// gerar o link das propostas dele; o token é o mesmo em toda chamada.

import type { MembershipContext } from '../auth/auth-context'
import type { ILeadProposalRepository } from '../ports/lead-proposal.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface ShareLeadProposalInput {
  leadId: string
  proposalId: string
  userId: string
  membership: MembershipContext
}

export interface ShareLeadProposalOutput {
  shareToken: string
}

export class ShareLeadProposalUseCase
  implements UseCase<ShareLeadProposalInput, ShareLeadProposalOutput | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadProposalRepository: ILeadProposalRepository,
  ) {}

  /** null quando o lead não existe/está fora do escopo ou a proposta não é dele. */
  async execute(input: ShareLeadProposalInput): Promise<ShareLeadProposalOutput | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    const proposal = await this.leadProposalRepository.findById(input.proposalId)
    if (!proposal || proposal.leadId !== lead.id) return null

    const shareToken = await this.leadProposalRepository.enableSharing(proposal.id, input.userId)
    return { shareToken }
  }
}
