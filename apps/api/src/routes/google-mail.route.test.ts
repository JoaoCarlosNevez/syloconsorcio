// Tests: envio pelo Gmail — peças de infraestrutura (cifra do token, state do
// OAuth, mensagem MIME) e a rota com o recurso desligado.

import { randomBytes } from 'node:crypto'
import type { IAuthProvider } from '@sylocrm/application'
import { HmacOAuthStateSigner, TokenCipher, buildMimeMessage } from '@sylocrm/infrastructure'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { isAllowedReturn } from './google-mail.route'

describe('TokenCipher', () => {
  const cipher = new TokenCipher(randomBytes(32).toString('base64'))

  it('round-trips and never stores the plain token', () => {
    const sealed = cipher.encrypt('1//refresh-token')
    expect(sealed).not.toContain('refresh-token')
    expect(cipher.decrypt(sealed)).toBe('1//refresh-token')
  })

  it('rejects a tampered value and a wrong key size', () => {
    const sealed = cipher.encrypt('segredo')
    const tampered = `${sealed.slice(0, -2)}AA`
    expect(() => cipher.decrypt(tampered)).toThrow()
    expect(() => new TokenCipher(randomBytes(16).toString('base64'))).toThrow()
  })
})

describe('HmacOAuthStateSigner', () => {
  const signer = new HmacOAuthStateSigner('um-segredo-bem-comprido')
  const now = new Date('2026-11-17T12:00:00Z')
  const claims = {
    userId: 'user-1',
    returnTo: 'https://app.sylocrm.com.br/app/config',
    expiresAt: new Date(now.getTime() + 60_000),
  }

  it('verifies its own state until it expires', () => {
    const state = signer.sign(claims)
    expect(signer.verify(state, now)).toEqual(claims)
    expect(signer.verify(state, new Date(now.getTime() + 120_000))).toBeNull()
  })

  it('rejects a forged or edited state', () => {
    const state = signer.sign(claims)
    const [data] = state.split('.')
    const forged = Buffer.from(
      JSON.stringify({ u: 'attacker', r: claims.returnTo, e: 9e15 }),
    ).toString('base64url')
    expect(signer.verify(`${forged}.${state.split('.')[1]}`, now)).toBeNull()
    expect(signer.verify(`${data}.assinatura-falsa`, now)).toBeNull()
    expect(new HmacOAuthStateSigner('outro-segredo-comprido').verify(state, now)).toBeNull()
  })
})

describe('buildMimeMessage', () => {
  it('encodes accented subject, body and attachments', () => {
    const mime = buildMimeMessage(
      {
        to: ['cadastro@porto.com.br', 'ops@porto.com.br'],
        subject: 'Ficha de adesão — João',
        text: 'Olá, segue a ficha.',
        attachments: [
          { filename: 'RG "frente".jpg', contentType: 'image/jpeg', data: Buffer.from('abc') },
        ],
      },
      'BOUNDARY',
    )
    expect(mime).toContain('To: cadastro@porto.com.br, ops@porto.com.br\r\n')
    expect(mime).toContain(
      `Subject: =?UTF-8?B?${Buffer.from('Ficha de adesão — João').toString('base64')}?=`,
    )
    expect(mime).toContain(Buffer.from('Olá, segue a ficha.').toString('base64'))
    expect(mime).toContain('filename="RG _frente_.jpg"')
    expect(mime).toContain(Buffer.from('abc').toString('base64'))
    expect(mime.trimEnd().endsWith('--BOUNDARY--')).toBe(true)
  })
})

describe('isAllowedReturn', () => {
  const origins = ['https://app.sylocrm.com.br', 'https://dev.sylocrm.com.br']
  it('only returns to the front', () => {
    expect(isAllowedReturn('https://app.sylocrm.com.br/app/config?x=1', origins)).toBe(true)
    expect(isAllowedReturn('https://evil.com/app.sylocrm.com.br', origins)).toBe(false)
    expect(isAllowedReturn('não é url', origins)).toBe(false)
  })
})

describe('googleMailRoute without Google configured', () => {
  it('says the feature is unavailable', async () => {
    const authProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com' }),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildApp({ authProvider })
    const response = await app.inject({
      method: 'GET',
      url: '/integrations/google',
      headers: { authorization: 'Bearer token' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ available: false, connected: false, email: null })
  })
})
