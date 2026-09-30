// ViewSharedProposalUseCase — o cliente abriu o link público da proposta
// (GET /public/proposals/:token, sem login).
//
// Devolve só o necessário pra página da proposta: nada de CPF, telefone,
// e-mail ou renda do cliente — quem tiver o link vê a proposta, não a ficha.
//
// Toda abertura é contada (viewCount/lastViewedAt, visíveis no LeadModal), e
// avisa no sininho ('proposal.viewed') o responsável pelo lead — ou, sem
// responsável, quem gerou o link. Pra um F5 ou o cliente voltando na página
// não virar uma enxurrada de notificações, só avisa de novo depois de
// VIEW_NOTIFICATION_COOLDOWN_MS sem abertura.

import type {
  ILeadProposalRepository,
  ProposalInstallmentRange,
} from '../ports/lead-proposal.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import type { IUserRepository } from '../ports/user.repository'

export const VIEW_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000

export interface ViewSharedProposalInput {
  token: string
  now: Date
}

export interface SharedProposalView {
  organization: { name: string; iconUrl: string | null }
  /** Responsável pelo lead; null quando não tem. */
  consultantName: string | null
  client: { name: string }
  segment: string
  quotaCount: number
  valueCents: number
  tableName: string | null
  downPaymentCents: number
  termMonths: number
  installments: ProposalInstallmentRange[] | null
  createdAt: Date
}

export class ViewSharedProposalUseCase
  implements UseCase<ViewSharedProposalInput, SharedProposalView | null>
{
  constructor(
    private readonly leadProposalRepository: ILeadProposalRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userRepository: IUserRepository,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  /** null quando o token não existe (ou o lead foi apagado). */
  async execute(input: ViewSharedProposalInput): Promise<SharedProposalView | null> {
    const proposal = await this.leadProposalRepository.findByShareToken(input.token)
    if (!proposal) return null

    const [lead, organization] = await Promise.all([
      this.leadRepository.findById(proposal.leadId, {
        organizationIds: [proposal.organizationId],
      }),
      this.organizationRepository.findById(proposal.organizationId),
    ])
    if (!lead || !organization) return null

    const consultant = lead.assignedUserId
      ? await this.userRepository.findById(lead.assignedUserId)
      : null

    await this.leadProposalRepository.recordView(proposal.id, input.now)

    const recentlyViewed =
      proposal.lastViewedAt !== null &&
      input.now.getTime() - proposal.lastViewedAt.getTime() < VIEW_NOTIFICATION_COOLDOWN_MS
    const recipientId = lead.assignedUserId ?? proposal.sharedByUserId
    if (!recentlyViewed && recipientId) {
      await this.notifications.notify({
        organizationId: lead.organizationId,
        userId: recipientId,
        actorUserId: null,
        type: 'proposal.viewed',
        taskId: null,
        title: lead.name,
        metadata: {
          leadId: lead.id,
          funnelId: lead.funnelId,
          proposalId: proposal.id,
          viewedAt: input.now.toISOString(),
        },
      })
    }

    return {
      organization: {
        name: organization.name,
        // Ícone próprio é só de White Label — mesma regra das memberships.
        iconUrl: organization.isWhiteLabel ? (organization.branding?.iconUrl ?? null) : null,
      },
      consultantName: consultant ? (consultant.name ?? consultant.email) : null,
      client: { name: lead.name },
      segment: lead.segment,
      quotaCount: lead.quotaCount,
      valueCents: lead.valueCents,
      tableName: proposal.tableName,
      downPaymentCents: proposal.downPaymentCents,
      termMonths: proposal.termMonths,
      installments: proposal.installments,
      createdAt: proposal.createdAt,
    }
  }
}
