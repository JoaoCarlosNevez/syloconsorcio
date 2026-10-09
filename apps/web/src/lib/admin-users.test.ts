import { describe, expect, it } from 'vitest'
import { buildAdminUserRows } from './admin-users'
import type { PlatformMember } from './organizations-api'

function member(userId: string, name: string, organizationId = 'org-1'): PlatformMember {
  return {
    userId,
    name,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role: 'SELLER',
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
    organizationId,
    organizationName: 'Representação A',
  }
}

describe('buildAdminUserRows', () => {
  const admins = [
    { userId: 'joao', name: 'João', email: 'joao@sylo.com', avatarUrl: null },
    { userId: 'ennyo', name: 'Ennyo', email: 'ennyo@sylo.com', avatarUrl: null },
  ]

  it('marks super admins, lists them first and includes those without an organization', () => {
    const rows = buildAdminUserRows([member('bia', 'Bia'), member('ennyo', 'Ennyo')], admins)

    expect(rows.map((r) => [r.userId, r.isPlatformAdmin, r.member !== null])).toEqual([
      ['ennyo', true, true],
      ['joao', true, false],
      ['bia', false, true],
    ])
  })

  it('keeps one row per organization, with unique keys', () => {
    const rows = buildAdminUserRows(
      [member('bia', 'Bia', 'org-1'), member('bia', 'Bia', 'org-2')],
      [],
    )

    expect(rows.map((r) => r.key)).toEqual(['bia:org-1', 'bia:org-2'])
  })
})
