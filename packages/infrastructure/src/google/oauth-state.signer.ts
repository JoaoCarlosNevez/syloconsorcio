// HmacOAuthStateSigner — o `state` do OAuth assinado com HMAC-SHA256: liga a
// volta do Google ao usuário que começou o fluxo, sem guardar nada no
// servidor. Vence em poucos minutos (expiresAt).

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IOAuthStateSigner, OAuthStateClaims } from '@sylocrm/application'

interface Payload {
  u: string
  r: string
  e: number
}

export class HmacOAuthStateSigner implements IOAuthStateSigner {
  constructor(private readonly secret: string) {
    if (secret.length < 16) throw new Error('Segredo do OAuth state curto demais.')
  }

  private mac(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url')
  }

  sign(claims: OAuthStateClaims): string {
    const payload: Payload = { u: claims.userId, r: claims.returnTo, e: claims.expiresAt.getTime() }
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${data}.${this.mac(data)}`
  }

  verify(state: string, now: Date): OAuthStateClaims | null {
    const [data, signature] = state.split('.')
    if (!data || !signature) return null
    const expected = Buffer.from(this.mac(data))
    const given = Buffer.from(signature)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    let payload: Payload
    try {
      payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Payload
    } catch {
      return null
    }
    if (typeof payload.u !== 'string' || typeof payload.r !== 'string') return null
    if (typeof payload.e !== 'number' || payload.e <= now.getTime()) return null
    return { userId: payload.u, returnTo: payload.r, expiresAt: new Date(payload.e) }
  }
}
