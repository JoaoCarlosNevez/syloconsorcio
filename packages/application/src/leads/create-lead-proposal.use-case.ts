// CreateLeadProposalUseCase — registra uma proposta/simulação de crédito
// aprovada pro lead. Valida que a entrada é menor que o valor da cota (checado
// contra o valueCents real do lead, nunca confiado ao cliente) e que as faixas
// de parcelas, quando enviadas, cobrem exatamente 1..termMonths sem buracos.
// O valor das parcelas é digitado pelo vendedor, não calculado (ver nota em
// schema/lead-proposals.ts).

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type {
  ILeadProposalRepository,
  LeadProposalRecord,
  ProposalInstallmentRange,
} from '../ports/lead-proposal.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface CreateLeadProposalInput {
  leadId: string
  userId: string
  membership: MembershipContext
  downPaymentCents: number
  termMonths: number
  /** Nome da tabela da administradora (opcional). */
  tableName?: string | null
  /** Faixas de parcelas (opcional nas chamadas antigas). */
  installments?: ProposalInstallmentRange[] | null
}

/** Mensagem de erro quando as faixas não cobrem 1..termMonths em sequência,
 * ou null quando estão ok. */
function installmentsError(ranges: ProposalInstallmentRange[], termMonths: number): string | null {
  if (ranges.length === 0) return 'Informe o valor das parcelas.'
  let expectedFrom = 1
  for (const range of ranges) {
    if (range.from !== expectedFrom || range.to < range.from) {
      return 'As faixas de parcelas precisam ser sequenciais, começando na 1ª.'
    }
    if (range.amountCents <= 0) return 'O valor da parcela precisa ser maior que zero.'
    expectedFrom = range.to + 1
  }
  if (expectedFrom - 1 !== termMonths) {
    return 'As faixas de parcelas precisam terminar na última parcela do prazo.'
  }
  return null
}

export class CreateLeadProposalUseCase
  implements UseCase<CreateLeadProposalInput, LeadProposalRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadProposalRepository: ILeadProposalRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: CreateLeadProposalInput): Promise<LeadProposalRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    if (input.downPaymentCents >= lead.valueCents) {
      throw new ValidationError([
        {
          field: 'downPaymentCents',
          message: 'O valor de entrada precisa ser menor que o valor da cota.',
        },
      ])
    }

    const installments = input.installments ?? null
    if (installments) {
      const message = installmentsError(installments, input.termMonths)
      if (message) throw new ValidationError([{ field: 'installments', message }])
    }

    const proposal = await this.leadProposalRepository.create({
      leadId: input.leadId,
      downPaymentCents: input.downPaymentCents,
      termMonths: input.termMonths,
      tableName: input.tableName ?? null,
      installments,
    })

    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.proposal_created',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: {
        downPaymentCents: input.downPaymentCents,
        termMonths: input.termMonths,
        tableName: input.tableName ?? null,
      },
    })

    return proposal
  }
}
