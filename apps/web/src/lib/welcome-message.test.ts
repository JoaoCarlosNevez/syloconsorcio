// Tests: buildWelcomeMessage — mensagem com link de login, e-mail e senha.

import { describe, expect, it } from 'vitest'
import { buildWelcomeMessage, copyLabel, loginUrl } from './welcome-message'

describe('buildWelcomeMessage', () => {
  it('includes the login link from the current origin, the e-mail and the password', () => {
    const message = buildWelcomeMessage({
      name: 'Maria',
      email: 'maria@empresa.com',
      password: 'Abc123!x',
      organizationName: 'PHS',
      origin: 'http://localhost:5173',
    })

    expect(message).toContain('Olá, Maria!')
    expect(message).toContain('SyloCRM da equipe PHS')
    expect(message).toContain('Acesse: http://localhost:5173/login')
    expect(message).toContain('E-mail: maria@empresa.com')
    expect(message).toContain('Senha temporária: Abc123!x')
  })

  it('works without a name or organization', () => {
    const message = buildWelcomeMessage({
      name: null,
      email: 'a@b.com',
      password: 'x',
      organizationName: null,
      origin: 'https://app.exemplo.com',
    })

    expect(message.startsWith('Olá!')).toBe(true)
    expect(message).toContain('Seu acesso ao SyloCRM está pronto.')
  })
})

describe('loginUrl', () => {
  it('defaults to the browser origin', () => {
    expect(loginUrl()).toBe(`${window.location.origin}/login`)
  })
})

describe('copyLabel', () => {
  it('shows feedback only on the button that was used', () => {
    expect(copyLabel('message', 'Copiar mensagem', 'message', null)).toBe('Copiado!')
    expect(copyLabel('password', 'Copiar senha', 'message', null)).toBe('Copiar senha')
    expect(copyLabel('message', 'Copiar mensagem', null, 'message')).toBe('Não foi possível copiar')
  })
})
