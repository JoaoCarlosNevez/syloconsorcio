// Tests: o que cada papel pode fazer — foco no Administrativo (BACKOFFICE).

import { DataScope, OrganizationType, Permission, Role, canGrantRole } from '@sylocrm/domain'
import { describe, expect, it } from 'vitest'
import { calculateDataScope } from './data-scope'
import { getPermissionsForRole } from './permissions'

describe('Administrativo (BACKOFFICE)', () => {
  const permissions = getPermissionsForRole(Role.BACKOFFICE)

  it('works the leads of the whole representação: create, edit, distribute, tasks for the team', () => {
    expect(permissions).toEqual(
      expect.arrayContaining([
        Permission.LEAD_READ,
        Permission.LEAD_CREATE,
        Permission.LEAD_UPDATE,
        Permission.LEAD_ASSIGN,
        Permission.TASK_ASSIGN,
      ]),
    )
    expect(calculateDataScope(OrganizationType.REPRESENTACAO, Role.BACKOFFICE)).toBe(
      DataScope.REPRESENTATION,
    )
  })

  it('does not manage team, settings, integrations, queue, activity, nor reopen/delete leads', () => {
    for (const permission of [
      Permission.USER_INVITE,
      Permission.USER_REMOVE,
      Permission.TEAM_GOAL_UPDATE,
      Permission.TEAM_TIER_UPDATE,
      Permission.TEAM_ROLE_UPDATE,
      Permission.ORGANIZATION_UPDATE,
      Permission.INTEGRATION_MANAGE,
      Permission.LEAD_QUEUE_MANAGE,
      Permission.ACTIVITY_READ,
      Permission.LEAD_DELETE,
      Permission.LEAD_MANAGE_LOST,
    ]) {
      expect(permissions).not.toContain(permission)
    }
  })

  it('is created only by the owner, and neither it nor the supervisor manages the other', () => {
    expect(canGrantRole(Role.ADMIN, Role.BACKOFFICE)).toBe(true)
    expect(canGrantRole(Role.MANAGER, Role.BACKOFFICE)).toBe(false)
    expect(canGrantRole(Role.BACKOFFICE, Role.MANAGER)).toBe(false)
    expect(canGrantRole(Role.BACKOFFICE, Role.SELLER)).toBe(true)
  })
})
