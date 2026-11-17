// TokenCipher — AES-256-GCM pra guardar segredo de terceiro no banco (ex: o
// refresh token do Google). Formato: "v1.<iv>.<tag>.<cifra>" em base64url.
// A chave (32 bytes, base64) fica só no ambiente da API.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'

export class TokenCipher {
  private readonly key: Buffer

  constructor(base64Key: string) {
    const key = Buffer.from(base64Key, 'base64')
    if (key.length !== 32) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY precisa ter 32 bytes em base64 (openssl rand -base64 32).',
      )
    }
    this.key = key
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [VERSION, iv, tag, encrypted]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.')
  }

  /** Lança erro se a cifra foi adulterada ou a chave mudou. */
  decrypt(sealed: string): string {
    const [version, iv, tag, encrypted] = sealed.split('.')
    if (version !== VERSION || !iv || !tag || !encrypted) {
      throw new Error('Token criptografado em formato desconhecido.')
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  }
}
