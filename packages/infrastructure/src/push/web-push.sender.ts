// WebPushSender — implementação concreta de IPushSender com a lib web-push
// (protocolo Web Push + chaves VAPID). Funciona com Chrome/Android, Firefox,
// Edge e Safari/iOS 16.4+ (este só com o app instalado na tela de início).

import type {
  IPushSender,
  PushMessage,
  PushSendResult,
  PushSubscriptionRecord,
} from '@sylocrm/application'
import webpush, { WebPushError } from 'web-push'

export interface WebPushConfig {
  publicKey: string
  privateKey: string
  /** "mailto:..." ou URL — o serviço de push usa pra contato. */
  subject: string
}

/** Quanto tempo o serviço de push segura a mensagem com o aparelho offline
 * (a oferta da fila manda o próprio prazo, menor). */
const DEFAULT_TTL_SECONDS = 60 * 60

export class WebPushSender implements IPushSender {
  constructor(private readonly config: WebPushConfig) {}

  async send(subscription: PushSubscriptionRecord, message: PushMessage): Promise<PushSendResult> {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify(message),
        {
          TTL: Math.min(message.ttlSeconds ?? DEFAULT_TTL_SECONDS, DEFAULT_TTL_SECONDS),
          urgency: 'high',
          vapidDetails: {
            subject: this.config.subject,
            publicKey: this.config.publicKey,
            privateKey: this.config.privateKey,
          },
        },
      )
      return 'sent'
    } catch (error) {
      // 404/410: o aparelho cancelou a inscrição (app desinstalado, permissão
      // revogada) — quem chamou apaga. O resto sobe pro log do worker.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        return 'gone'
      }
      // O motivo de verdade (ex: "BadJwtToken", payload grande demais) vem no
      // corpo da resposta do serviço de push — sobe junto pro log.
      if (error instanceof WebPushError) {
        throw new Error(`push recusado (HTTP ${error.statusCode}): ${error.body || error.message}`)
      }
      throw error
    }
  }
}
