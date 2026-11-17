// Envio pelo Gmail do usuário (login com Google). Espelha
// apps/api/src/routes/google-mail.route.ts.

import { apiClient } from './api-client'

export interface GoogleMailStatus {
  /** false = a API não tem o Google configurado (usa o mailto). */
  available: boolean
  connected: boolean
  email: string | null
}

export interface SendAdhesionEmailPayload {
  administratorId: string
  subject: string
  body: string
}

export interface SendAdhesionEmailResult {
  ok: true
  administratorName: string
  to: string[]
  attachments: number
  from: string
}

export function getGoogleMailStatus(): Promise<GoogleMailStatus> {
  return apiClient.get('/integrations/google')
}

/** URL da tela do Google; depois de autorizar, volta pra `returnTo`. */
export function startGoogleConnect(returnTo: string): Promise<{ url: string }> {
  return apiClient.post('/integrations/google/connect', { returnTo })
}

export function disconnectGoogle(): Promise<void> {
  return apiClient.delete('/integrations/google')
}

export function sendAdhesionEmail(
  organizationId: string,
  leadId: string,
  payload: SendAdhesionEmailPayload,
): Promise<SendAdhesionEmailResult> {
  return apiClient.post(`/leads/${leadId}/adhesion/email`, payload, { organizationId })
}
