import { describe, expect, it } from 'vitest'
import { buildAdhesionEmail } from './adhesion-email'
import { findAdministrator, parseEmails } from './administrators-api'

describe('buildAdhesionEmail', () => {
  it('addresses every e-mail with subject and the ficha in the body', () => {
    const email = buildAdhesionEmail({
      emails: ['cadastro@porto.com.br', 'ops@porto.com.br'],
      clientName: 'Maria Silva',
      organizationName: 'Sylo',
      fichaText: 'Nome: Maria Silva',
    })
    expect(email.bodyTruncated).toBe(false)
    expect(email.href.startsWith('mailto:cadastro%40porto.com.br,ops%40porto.com.br?')).toBe(true)
    const params = new URLSearchParams(email.href.split('?')[1])
    expect(params.get('subject')).toBe('Ficha de adesão — Maria Silva (Sylo)')
    expect(params.get('body')).toContain('Nome: Maria Silva')
  })

  it('asks to paste a ficha too long for a mailto link', () => {
    const email = buildAdhesionEmail({
      emails: ['a@b.com'],
      clientName: 'Maria',
      organizationName: 'Sylo',
      fichaText: 'x'.repeat(3000),
    })
    expect(email.bodyTruncated).toBe(true)
    expect(new URLSearchParams(email.href.split('?')[1]).get('body')).toContain(
      '[cole a ficha aqui]',
    )
  })
})

describe('administrators helpers', () => {
  it('parses comma, space and line separated e-mails', () => {
    expect(parseEmails('a@x.com, b@x.com;c@x.com\nd@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
      'd@x.com',
    ])
  })

  it('finds an administrator ignoring case and spaces', () => {
    const porto = { id: '1', name: 'Porto Seguro', emails: [], createdAt: '', updatedAt: '' }
    expect(findAdministrator([porto], '  porto seguro ')).toBe(porto)
    expect(findAdministrator([porto], 'Embracon')).toBeNull()
    expect(findAdministrator([porto], '')).toBeNull()
  })
})
