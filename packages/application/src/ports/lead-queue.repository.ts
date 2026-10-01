// ILeadQueueRepository — port da fila de distribuição dos leads do webhook.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Como a fila funciona (ver OfferLeadToQueueUseCase):
//   - Participam os membros marcados em Configurações > Fila de Leads.
//   - A ordem é por lastOfferedAt (mais antigo primeiro): receber uma oferta
//     joga o membro pro fim da fila, aceitando ou não. Quem entra na fila
//     entra no fim.
//   - Uma oferta (lead_offers) dá ao membro `timeoutMinutes` pra aceitar;
//     vencida, o lead vai pro próximo. No máximo uma oferta pendente por lead.

export interface LeadQueueSettings {
  organizationId: string
  enabled: boolean
  /** Tempo pra aceitar o lead antes de ele ir pro próximo da fila. */
  timeoutMinutes: number
  /** Quem participa da fila (pode incluir membros que saíram da organização
   * — listQueue filtra pelos ativos). */
  memberUserIds: string[]
}

export const DEFAULT_LEAD_QUEUE_TIMEOUT_MINUTES = 5

export interface LeadQueueMember {
  userId: string
  /** Última vez que recebeu uma oferta (ou entrou na fila). */
  lastOfferedAt: Date
}

export type LeadOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

export interface LeadOfferRecord {
  id: string
  organizationId: string
  leadId: string
  userId: string
  status: LeadOfferStatus
  offeredAt: Date
  expiresAt: Date
  respondedAt: Date | null
}

export interface NewLeadOfferInput {
  organizationId: string
  leadId: string
  userId: string
  offeredAt: Date
  expiresAt: Date
}

export interface ILeadQueueRepository {
  /** Configuração da organização — o padrão (desligada, 5 min, ninguém)
   * quando ainda não foi salva. */
  getSettings(organizationId: string): Promise<LeadQueueSettings>

  /** Salva a configuração. Quem entra na fila entra no fim (lastOfferedAt =
   * now); quem continua mantém a posição. */
  saveSettings(settings: LeadQueueSettings, now: Date): Promise<LeadQueueSettings>

  /** Participantes com membership ATIVA na organização, na ordem da fila
   * (próximo primeiro). */
  listQueue(organizationId: string): Promise<LeadQueueMember[]>

  /** Joga o membro pro fim da fila. */
  markOffered(organizationId: string, userId: string, at: Date): Promise<void>

  /** Quem já recebeu oferta deste lead (qualquer status). */
  listOfferedUserIds(leadId: string): Promise<string[]>

  createOffer(input: NewLeadOfferInput): Promise<LeadOfferRecord>

  findOffer(id: string): Promise<LeadOfferRecord | null>

  /** Fecha uma oferta pendente (atômico). `accepted` só vale se ainda não
   * venceu em `at`. null quando a oferta não estava mais pendente/no prazo. */
  resolveOffer(
    id: string,
    status: Exclude<LeadOfferStatus, 'pending'>,
    at: Date,
  ): Promise<LeadOfferRecord | null>

  /** Marca como 'expired' as ofertas pendentes vencidas e as devolve — cada
   * oferta é devolvida uma vez só, mesmo com várias instâncias rodando. */
  claimExpiredOffers(now: Date): Promise<LeadOfferRecord[]>

  /** Ofertas pendentes ainda no prazo, mais antigas primeiro. */
  listPendingOffers(filter: {
    organizationId: string
    userId?: string
    now: Date
  }): Promise<LeadOfferRecord[]>
}
