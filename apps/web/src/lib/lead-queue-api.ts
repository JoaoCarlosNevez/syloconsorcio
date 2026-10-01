// Fila de Leads — leads do webhook distribuídos em rodízio entre os
// vendedores, que precisam aceitar no prazo (ver lead-queue.route.ts).

import { apiClient } from './api-client'

export interface LeadQueueSettings {
  organizationId: string
  enabled: boolean
  timeoutMinutes: number
  memberUserIds: string[]
}

export interface LeadQueueOverview {
  settings: LeadQueueSettings
  /** Ordem atual — o primeiro recebe o próximo lead. */
  queue: { userId: string; lastOfferedAt: string }[]
  pendingOffers: {
    id: string
    userId: string
    leadId: string
    leadName: string
    offeredAt: string
    expiresAt: string
  }[]
}

/** Lead que a fila está oferecendo ao usuário agora. */
export interface MyLeadOffer {
  id: string
  offeredAt: string
  expiresAt: string
  lead: {
    id: string
    funnelId: string
    name: string
    segment: string
    valueCents: number
    source: string
  }
}

export const LEAD_QUEUE_TIMEOUT_LIMITS = { min: 1, max: 120 } as const

export function getLeadQueue(organizationId: string): Promise<LeadQueueOverview> {
  return apiClient.get<LeadQueueOverview>('/lead-queue', { organizationId })
}

export function updateLeadQueue(
  organizationId: string,
  payload: Omit<LeadQueueSettings, 'organizationId'>,
): Promise<{ settings: LeadQueueSettings }> {
  return apiClient.put<{ settings: LeadQueueSettings }>('/lead-queue', payload, { organizationId })
}

export function listMyLeadOffers(organizationId: string): Promise<{ offers: MyLeadOffer[] }> {
  return apiClient.get<{ offers: MyLeadOffer[] }>('/lead-offers/mine', { organizationId })
}

export function acceptLeadOffer(
  organizationId: string,
  offerId: string,
): Promise<{ lead: { id: string; funnelId: string } }> {
  return apiClient.post<{ lead: { id: string; funnelId: string } }>(
    `/lead-offers/${offerId}/accept`,
    undefined,
    { organizationId },
  )
}

export function declineLeadOffer(organizationId: string, offerId: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(`/lead-offers/${offerId}/decline`, undefined, {
    organizationId,
  })
}

/** "4:05" — tempo que falta até `expiresAt`, nunca negativo. */
export function formatCountdown(expiresAt: string, now: number): string {
  const totalSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
