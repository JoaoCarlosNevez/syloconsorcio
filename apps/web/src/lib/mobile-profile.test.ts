import { describe, expect, it } from 'vitest'
import {
  canAssignLeads,
  daysSince,
  mobileProfile,
  mobileTabs,
  showsSalesGoal,
} from './mobile-profile'

const base = { organizationType: 'REPRESENTACAO' as const, permissions: [] as string[] }

describe('mobileProfile', () => {
  it('follows the organization type and permissions', () => {
    expect(
      mobileProfile({ organizationType: 'MASTER', role: 'MANAGER', permissions: ['reports.read'] }),
    ).toBe('master')
    expect(mobileProfile({ ...base, role: 'ADMIN', permissions: ['reports.read'] })).toBe('gestao')
    expect(mobileProfile({ ...base, role: 'MANAGER', permissions: ['reports.read'] })).toBe(
      'gestao',
    )
    expect(mobileProfile({ ...base, role: 'BACKOFFICE', permissions: ['lead.assign'] })).toBe('adm')
    expect(mobileProfile({ ...base, role: 'SELLER' })).toBe('vendedor')
    expect(mobileProfile(null)).toBe('vendedor')
  })

  it('gives the Master only the network, notices and profile', () => {
    expect(mobileTabs('master').map((tab) => tab.label)).toEqual(['Rede', 'Avisos', 'Perfil'])
    expect(mobileTabs('adm').map((tab) => tab.label)).toEqual([
      'Hoje',
      'Funis',
      'Tarefas',
      'Chat',
      'Avisos',
      'Perfil',
    ])
  })

  it('ends every profile with the Perfil tab', () => {
    for (const profile of ['master', 'gestao', 'adm', 'vendedor'] as const) {
      expect(mobileTabs(profile).at(-1)).toEqual({
        key: 'perfil',
        to: '/m/perfil',
        label: 'Perfil',
      })
    }
  })
})

describe('showsSalesGoal', () => {
  it('shows the sales goal only to who sells', () => {
    expect(showsSalesGoal('vendedor')).toBe(true)
    expect(showsSalesGoal('gestao')).toBe(true)
    expect(showsSalesGoal('adm')).toBe(false)
    expect(showsSalesGoal('master')).toBe(false)
  })
})

describe('canAssignLeads', () => {
  it('needs lead.assign', () => {
    expect(canAssignLeads({ permissions: ['lead.assign'] })).toBe(true)
    expect(canAssignLeads({ permissions: ['lead.read'] })).toBe(false)
    expect(canAssignLeads(null)).toBe(false)
  })
})

describe('daysSince', () => {
  it('counts whole days and never goes negative', () => {
    const now = new Date('2026-10-29T12:00:00Z')
    expect(daysSince('2026-10-26T13:00:00Z', now)).toBe(2)
    expect(daysSince('2026-10-30T12:00:00Z', now)).toBe(0)
  })
})
