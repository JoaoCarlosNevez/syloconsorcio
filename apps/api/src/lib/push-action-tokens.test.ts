import { describe, expect, it } from 'vitest'
import { HmacPushActionTokens } from './push-action-tokens'

const NOW = new Date('2026-10-29T15:00:00.000Z')
const CLAIMS = {
  offerId: 'offer-1',
  userId: 'user-1',
  organizationId: 'org-1',
  expiresAt: new Date('2026-10-29T15:05:00.000Z'),
}

describe('HmacPushActionTokens', () => {
  const tokens = new HmacPushActionTokens('secret')

  it('round-trips the claims while the offer is open', () => {
    expect(tokens.verify(tokens.sign(CLAIMS), NOW)).toEqual(CLAIMS)
  })

  it('rejects an expired offer', () => {
    expect(tokens.verify(tokens.sign(CLAIMS), new Date('2026-10-29T15:05:01.000Z'))).toBeNull()
  })

  it('rejects a token signed with another secret or tampered with', () => {
    const token = tokens.sign(CLAIMS)
    expect(new HmacPushActionTokens('other').verify(token, NOW)).toBeNull()
    const [, signature] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ o: 'offer-1', u: 'someone-else', g: 'org-1', e: 1_800_000_000 }),
    ).toString('base64url')
    expect(tokens.verify(`${forged}.${signature}`, NOW)).toBeNull()
    expect(tokens.verify('garbage', NOW)).toBeNull()
  })
})
