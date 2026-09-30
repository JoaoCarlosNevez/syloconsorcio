// ILeadProposalRepository — port para persistência de propostas/simulações de
// crédito por lead.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Uma proposta é imutável nos valores (entrada, prazo, parcelas) — o que muda
// depois de criada é só o compartilhamento: o link público (shareToken) e o
// registro de quando o cliente abriu (viewCount/lastViewedAt) — entrada e prazo são
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
  /** Quem gerou a simulação; null nas propostas antigas sem autor conhecido. */
  createdByUserId: string | null
  /** Token do link público (/p/:token); null até alguém gerar o link. */
  shareToken: string | null
  /** Quantas vezes o link público foi aberto. */
  viewCount: number
  lastViewedAt: Date | null
  createdAt: Date
}

/** Proposta encontrada pelo link público — com o que falta pra montar a
 * página sem usuário logado. */
export interface SharedLeadProposalRecord extends LeadProposalRecord {
  organizationId: string
  /** Quem gerou o link — avisado da abertura se o lead não tiver responsável. */
  sharedByUserId: string | null
}

export interface NewLeadProposalInput {
  leadId: string
  downPaymentCents: number
  termMonths: number
  tableName: string | null
  installments: ProposalInstallmentRange[] | null
  createdByUserId: string
}

export interface ILeadProposalRepository {
  /** Mais recente primeiro. */
  listByLead(leadId: string): Promise<LeadProposalRecord[]>

  create(input: NewLeadProposalInput): Promise<LeadProposalRecord>

  findById(id: string): Promise<LeadProposalRecord | null>

  /** Gera o token do link público se a proposta ainda não tiver um, e devolve
   * o token (o mesmo nas chamadas seguintes — o link não muda). */
  enableSharing(id: string, sharedByUserId: string): Promise<string>

  findByShareToken(token: string): Promise<SharedLeadProposalRecord | null>

  /** Conta uma abertura do link público. */
  recordView(id: string, viewedAt: Date): Promise<void>
}
