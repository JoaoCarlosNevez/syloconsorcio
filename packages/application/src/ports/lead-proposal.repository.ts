// ILeadProposalRepository — port para persistência de propostas/simulações de
// crédito por lead.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Uma proposta é imutável (só create + list) — entrada e prazo são
// específicos de cada proposta, diferente dos dados de qualificação em
// lead.repository.ts (profissão, renda, estado civil, CPF), que são do
// cliente e compartilhados por todas as propostas do lead.
//
// Parcelas são informadas pelo vendedor (não calculadas) — ver nota em
// schema/lead-proposals.ts.

/** Faixa de parcelas com o mesmo valor: da parcela `from` até a `to`
 * (inclusive), numeradas a partir de 1. Ex: 1–12 R$ 1.500 e 13–60 R$ 1.200. */
export interface ProposalInstallmentRange {
  from: number
  to: number
  amountCents: number
}

export interface LeadProposalRecord {
  id: string
  leadId: string
  downPaymentCents: number
  termMonths: number
  /** Nome da tabela da administradora usada na simulação; null nas antigas. */
  tableName: string | null
  /** Faixas em ordem, cobrindo 1..termMonths; null nas propostas antigas. */
  installments: ProposalInstallmentRange[] | null
  createdAt: Date
}

export interface NewLeadProposalInput {
  leadId: string
  downPaymentCents: number
  termMonths: number
  tableName: string | null
  installments: ProposalInstallmentRange[] | null
}

export interface ILeadProposalRepository {
  /** Mais recente primeiro. */
  listByLead(leadId: string): Promise<LeadProposalRecord[]>

  create(input: NewLeadProposalInput): Promise<LeadProposalRecord>
}
