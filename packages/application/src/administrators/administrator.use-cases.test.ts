// Tests: normalizeAdministrator — validação do cadastro de administradoras.

import { ValidationError } from '@sylocrm/domain'
import { describe, expect, it } from 'vitest'
import { normalizeAdministrator } from './administrator.use-cases'

describe('normalizeAdministrator', () => {
  it('trims the name and lowercases and dedupes the e-mails', () => {
    expect(
      normalizeAdministrator({
        name: '  Porto   Seguro ',
        emails: ['Cadastro@Porto.com.br', ' cadastro@porto.com.br', '', 'ops@porto.com.br'],
      }),
    ).toEqual({ name: 'Porto Seguro', emails: ['cadastro@porto.com.br', 'ops@porto.com.br'] })
  })

  it('needs a name and at least one e-mail', () => {
    expect(() => normalizeAdministrator({ name: ' ', emails: ['a@b.com'] })).toThrow(
      ValidationError,
    )
    expect(() => normalizeAdministrator({ name: 'Embracon', emails: [' '] })).toThrow(
      ValidationError,
    )
  })

  it('rejects a mistyped e-mail', () => {
    expect(() =>
      normalizeAdministrator({ name: 'Embracon', emails: ['cadastro@embracon'] }),
    ).toThrow('E-mail inválido: cadastro@embracon')
  })
})
