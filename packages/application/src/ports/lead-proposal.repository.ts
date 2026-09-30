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
// Sem valor de parcela de propósito — ver nota em schema/lead-proposals.ts.

export interface LeadProposalRecord {
  id: string
  leadId: string
  downPaymentCents: number
  termMonths: number
  /** Nome da tabela da administradora usada na simulação; null nas antigas. */
  tableName: string | null
  createdAt: Date
}

export interface NewLeadProposalInput {
  leadId: string
  downPaymentCents: number
  termMonths: number
  tableName: string | null
}

export interface ILeadProposalRepository {
  /** Mais recente primeiro. */
  listByLead(leadId: string): Promise<LeadProposalRecord[]>

  create(input: NewLeadProposalInput): Promise<LeadProposalRecord>
}
