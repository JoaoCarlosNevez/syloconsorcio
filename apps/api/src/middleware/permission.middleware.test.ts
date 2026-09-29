// Tests: requirePermission
//
//   401 quando authContext não está presente (tenantMiddleware não rodou)
//   403 quando a Membership ativa não possui a permission exigida
//   200 quando a Membership ativa possui a permission exigida

import type { AuthenticatedContext } from '@sylocrm/application'
import { DataScope, OrganizationType, Permission, Role } from '@sylocrm/domain'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { AuthErrorCode } from '../auth/errors'
import { requirePermission } from './permission.middleware'

function buildContext(permissions: Permission[]): AuthenticatedContext {
  return {
    identityId: 'user-uuid',
    userId: 'user-uuid',
    currentMembership: {
      organizationId: 'org-rep-01',
      organizationType: OrganizationType.REPRESENTACAO,
      organizationName: 'Representação Teste',
      organizationIconUrl: null,
      organizationSecondaryColor: null,
      tier: 'bronze',
      role: Role.SELLER,
      dataScope: DataScope.OWN,
      permissions,
    },
    availableMemberships: [],
  }
}

function buildTestApp(authContext: AuthenticatedContext | undefined) {
  const app = Fastify({ logger: false })
  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  app.addHook('preHandler', async (request) => {
    request.authContext = authContext
  })

  app.get('/leads', { preHandler: [requirePermission(Permission.LEAD_READ)] }, async () => ({
    ok: true,
  }))

  return app
}

describe('requirePermission', () => {
  it('returns 401 when authContext is not set (tenantMiddleware did not run)', async () => {
    const app = buildTestApp(undefined)

    const response = await app.inject({ method: 'GET', url: '/leads' })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when the active membership lacks the required permission', async () => {
    const app = buildTestApp(buildContext([Permission.REPORTS_READ]))

    const response = await app.inject({ method: 'GET', url: '/leads' })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('allows the request through when the permission is present', async () => {
    const app = buildTestApp(buildContext([Permission.LEAD_READ]))

    const response = await app.inject({ method: 'GET', url: '/leads' })

    expect(response.statusCode).toBe(200)
  })
})
