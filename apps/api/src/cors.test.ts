// Tests: CORS — o front da lista CORS_ORIGIN é aceito; qualquer outro, não.
// (O IP de rede local só é liberado com NODE_ENV=development; nos testes
// NODE_ENV=test, então fica bloqueado aqui.)

import { describe, expect, it } from 'vitest'
import { buildApp } from './app'

async function preflight(origin: string) {
  const app = buildApp()
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: { origin, 'access-control-request-method': 'GET' },
  })
  return response.headers['access-control-allow-origin']
}

describe('CORS', () => {
  it('allows the configured front-end origin', async () => {
    expect(await preflight('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('blocks unknown origins', async () => {
    expect(await preflight('https://site-qualquer.com')).toBeUndefined()
  })

  it('does not open local network origins outside development', async () => {
    expect(await preflight('http://192.168.1.16:5173')).toBeUndefined()
  })
})
