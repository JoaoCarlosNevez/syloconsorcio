// Tests: teamLine — equipe da organização ativa + cidade só quando preenchida.

import { describe, expect, it } from 'vitest'
import { teamLine } from './team-line'

describe('teamLine', () => {
  it('includes the city the user filled in', () => {
    expect(teamLine('PHS', 'Campinas, SP')).toBe('Equipe de PHS, Campinas, SP')
  })

  it('leaves the city out when the user has none', () => {
    expect(teamLine('PHS', null)).toBe('Equipe de PHS')
    expect(teamLine('PHS', '   ')).toBe('Equipe de PHS')
  })
})
