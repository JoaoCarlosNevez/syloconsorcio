// Chaves de API das organizações (webhook de leads).
//
// Formato: "sylo_" + 32 bytes aleatórios em base64url (43 caracteres) — difícil
// de adivinhar e fácil de reconhecer num vazamento (prefixo fixo). No banco
// fica só o SHA-256 em hex: sem salt porque a chave já tem 256 bits de
// entropia (não é senha escolhida por gente), e o hash precisa ser
// determinístico pra achar a chave por índice.

import { createHash, randomBytes } from 'node:crypto'

const KEY_PREFIX = 'sylo_'
/** Quantos caracteres da chave aparecem na tela pra identificá-la. */
const VISIBLE_PREFIX_LENGTH = KEY_PREFIX.length + 8

export interface GeneratedApiKey {
  /** A chave completa — mostrada uma única vez. */
  key: string
  keyPrefix: string
  keyHash: string
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex')
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  return { key, keyPrefix: key.slice(0, VISIBLE_PREFIX_LENGTH), keyHash: hashApiKey(key) }
}

/** Lê a chave do header X-Api-Key ou de Authorization: Bearer <chave>. */
export function extractApiKey(headers: Record<string, string | string[] | undefined>) {
  const fromHeader = headers['x-api-key']
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim()
  const authorization = headers.authorization
  if (typeof authorization === 'string') {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    if (match?.[1]) return match[1].trim()
  }
  return null
}
