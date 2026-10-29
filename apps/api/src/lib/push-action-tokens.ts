// Token da resposta ao lead da fila direto pela notificação (botões
// Aceitar/Recusar). O service worker não tem a sessão do usuário, então a
// notificação carrega um token assinado (HMAC-SHA256) que só vale pra aquela
// oferta, aquele usuário e organização, e até o prazo da oferta.
//
// Formato: base64url(JSON das claims) + "." + base64url(assinatura).

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IPushActionTokens, PushOfferClaims } from '@sylocrm/application'
import { z } from 'zod'

const claimsSchema = z.object({
  o: z.string().min(1),
  u: z.string().min(1),
  g: z.string().min(1),
  e: z.number().int(),
})

export class HmacPushActionTokens implements IPushActionTokens {
  constructor(private readonly secret: string) {}

  private signature(payload: string): Buffer {
    return createHmac('sha256', this.secret).update(payload).digest()
  }

  sign(claims: PushOfferClaims): string {
    const payload = Buffer.from(
      JSON.stringify({
        o: claims.offerId,
        u: claims.userId,
        g: claims.organizationId,
        e: Math.floor(claims.expiresAt.getTime() / 1000),
      }),
    ).toString('base64url')
    return `${payload}.${this.signature(payload).toString('base64url')}`
  }

  verify(token: string, now: Date): PushOfferClaims | null {
    const [payload, signature, ...rest] = token.split('.')
    if (!payload || !signature || rest.length > 0) return null
    const expected = this.signature(payload)
    const given = Buffer.from(signature, 'base64url')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

    let decoded: unknown
    try {
      decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    } catch {
      return null
    }
    const parsed = claimsSchema.safeParse(decoded)
    if (!parsed.success) return null
    const expiresAt = new Date(parsed.data.e * 1000)
    if (expiresAt.getTime() <= now.getTime()) return null
    return {
      offerId: parsed.data.o,
      userId: parsed.data.u,
      organizationId: parsed.data.g,
      expiresAt,
    }
  }
}
