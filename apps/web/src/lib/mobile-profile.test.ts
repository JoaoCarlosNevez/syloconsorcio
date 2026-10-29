import { describe, expect, it } from 'vitest'
import { canAssignLeads, daysSince, mobileProfile, mobileTabs } from './mobile-profile'

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

  it('gives the Master only the network and notices', () => {
    expect(mobileTabs('master').map((tab) => tab.label)).toEqual(['Rede', 'Avisos'])
    expect(mobileTabs('adm').map((tab) => tab.label)).toEqual([
      'Hoje',
      'Funis',
      'Tarefas',
      'Avisos',
    ])
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
