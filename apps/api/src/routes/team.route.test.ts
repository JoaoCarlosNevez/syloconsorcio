// Tests: teamRoute
//
// GET  /team/members — lista a equipe da organização ativa
// POST /team/members — convida Supervisor/Vendedor, respeitando a hierarquia
//                      de Role (canGrantRole)

import type {
  IAuthProvider,
  IMembershipRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const ADMIN_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.ADMIN,
  status: 'ACTIVE',
}

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.SELLER,
  status: 'ACTIVE',
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn().mockResolvedValue({ id: 'new-user-uuid', email: 'novo@empresa.com' }),
    deleteUser: vi.fn(),
  }
}

function buildUserRepository(isPlatformAdmin = false): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: IDENTITY.id,
      email: IDENTITY.email,
      name: null,
      isPlatformAdmin,
    }),
    upsert: vi.fn().mockResolvedValue({
      id: 'new-user-uuid',
      email: 'novo@empresa.com',
      name: 'Novo Membro',
      isPlatformAdmin: false,
    }),
    updateProfile: vi.fn(),
    listPlatformAdmins: vi.fn().mockResolvedValue([]),
  }
}

function buildMembershipRepository(membership: UserMembership): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([membership]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership),
    findActiveByOrganizationId: vi.fn().mockResolvedValue([
      {
        userId: IDENTITY.id,
        name: null,
        email: IDENTITY.email,
        role: membership.role,
        status: 'ACTIVE',
      },
    ]),
    findAllActive: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    findByUserAndOrganization: vi.fn().mockResolvedValue(null),
    findByOrganizationId: vi.fn().mockResolvedValue([
      {
        userId: IDENTITY.id,
        name: null,
        email: IDENTITY.email,
        role: membership.role,
        status: 'ACTIVE',
      },
    ]),
    findAll: vi.fn().mockResolvedValue([]),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    updateSalesGoal: vi.fn(),
    updateTier: vi.fn(),
    updateRole: vi.fn(),
    findPersonalGoal: vi.fn().mockResolvedValue(null),
    updatePersonalGoal: vi.fn(),
    removeAllForUser: vi.fn(),
  }
}

function buildTestApp(membership: UserMembership) {
  return buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /team/members', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/team/members' })

    expect(response.statusCode).toBe(401)
  })

  it('returns the active members of the organization for any role', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'GET',
      url: '/team/members',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ members: unknown[] }>()
    expect(body.members).toHaveLength(1)
  })
})

describe('POST /team/members', () => {
  it('returns 403 when a SELLER tries to invite (missing user.invite)', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'SELLER' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 403 when a MANAGER tries to invite another MANAGER', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'MANAGER' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('AUTHORIZATION_ERROR')
  })

  it('allows a MANAGER to invite a SELLER', async () => {
    const app = buildTestApp(MANAGER_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Vendedor', email: 'novo@empresa.com', role: 'SELLER' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ member: { role: string; temporaryPassword: string } }>()
    expect(body.member.role).toBe('SELLER')
    expect(body.member.temporaryPassword).toBeTruthy()
  })

  it('allows an ADMIN to invite a MANAGER', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo Supervisor', email: 'supervisor@empresa.com', role: 'MANAGER' },
    })

    expect(response.statusCode).toBe(201)
  })

  it('returns 400 for an invalid role', async () => {
    const app = buildTestApp(ADMIN_MEMBERSHIP)

    const response = await app.inject({
      method: 'POST',
      url: '/team/members',
      headers: AUTH_HEADERS,
      payload: { name: 'Novo', email: 'novo@empresa.com', role: 'ADMIN' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('DELETE /team/members/:userId', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildDeleteMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership | null,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      findByUserAndOrganization: vi.fn().mockResolvedValue(null),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updateSalesGoal: vi.fn(),
      updateTier: vi.fn(),
      updateRole: vi.fn(),
      findPersonalGoal: vi.fn().mockResolvedValue(null),
      updatePersonalGoal: vi.fn(),
      removeAllForUser: vi.fn(),
    }
  }

  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await app.inject({ method: 'DELETE', url: `/team/members/${TARGET_ID}` })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when a SELLER tries to remove someone (missing user.remove)', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 404 when the target member does not exist', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, null),
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 403 when trying to remove yourself', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${IDENTITY.id}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe('AUTHORIZATION_ERROR')
    expect(membershipRepository.deactivate).not.toHaveBeenCalled()
  })

  it('returns 403 when a MANAGER tries to remove an ADMIN', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      MANAGER_MEMBERSHIP,
      ADMIN_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.deactivate).not.toHaveBeenCalled()
  })

  it('allows a MANAGER to remove a SELLER', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      MANAGER_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.deactivate).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })

  it('allows an ADMIN to remove a MANAGER', async () => {
    const membershipRepository = buildDeleteMembershipRepository(
      ADMIN_MEMBERSHIP,
      MANAGER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
  })

  it('returns 403 when an ADMIN (not a platform admin) tries to remove another ADMIN', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(false),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.deactivate).not.toHaveBeenCalled()
  })

  it('allows a platform admin to remove another ADMIN, bypassing the hierarchy', async () => {
    const membershipRepository = buildDeleteMembershipRepository(ADMIN_MEMBERSHIP, ADMIN_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.deactivate).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })
})

describe('POST /team/members/:userId/reactivate', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildReactivateMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership | null,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(actorMembership),
      findByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updateSalesGoal: vi.fn(),
      updateTier: vi.fn(),
      updateRole: vi.fn(),
      findPersonalGoal: vi.fn().mockResolvedValue(null),
      updatePersonalGoal: vi.fn(),
      removeAllForUser: vi.fn(),
    }
  }

  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildReactivateMembershipRepository(
        SELLER_MEMBERSHIP,
        SELLER_MEMBERSHIP,
      ),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when a SELLER tries to reactivate someone (missing user.remove)', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildReactivateMembershipRepository(
        SELLER_MEMBERSHIP,
        SELLER_MEMBERSHIP,
      ),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 404 when the target member never existed', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildReactivateMembershipRepository(ADMIN_MEMBERSHIP, null),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 403 when a MANAGER tries to reactivate a deactivated ADMIN', async () => {
    const membershipRepository = buildReactivateMembershipRepository(
      MANAGER_MEMBERSHIP,
      ADMIN_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.reactivate).not.toHaveBeenCalled()
  })

  it('allows an ADMIN to reactivate a deactivated SELLER', async () => {
    const membershipRepository = buildReactivateMembershipRepository(
      ADMIN_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.reactivate).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })

  it('allows a platform admin to reactivate a deactivated ADMIN, bypassing the hierarchy', async () => {
    const membershipRepository = buildReactivateMembershipRepository(
      ADMIN_MEMBERSHIP,
      ADMIN_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(true),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: `/team/members/${TARGET_ID}/reactivate`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.reactivate).toHaveBeenCalledWith(TARGET_ID, ORG_ID)
  })
})

describe('PATCH /team/members/:userId', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildGoalMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership | null,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(actorMembership),
      findByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updateSalesGoal: vi.fn(),
      updateTier: vi.fn(),
      updateRole: vi.fn(),
      findPersonalGoal: vi.fn().mockResolvedValue(null),
      updatePersonalGoal: vi.fn(),
      removeAllForUser: vi.fn(),
    }
  }

  function patchGoal(app: ReturnType<typeof buildApp>, payload: unknown) {
    return app.inject({
      method: 'PATCH',
      url: `/team/members/${TARGET_ID}`,
      headers: AUTH_HEADERS,
      payload: payload as Record<string, unknown>,
    })
  }

  it('returns 403 when a SELLER tries to set a goal (missing team.goal_update)', async () => {
    const membershipRepository = buildGoalMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await patchGoal(app, { salesGoalCents: 100_000_00 })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.updateSalesGoal).not.toHaveBeenCalled()
  })

  it('returns 403 when a MANAGER tries to set the goal of another MANAGER', async () => {
    const membershipRepository = buildGoalMembershipRepository(
      MANAGER_MEMBERSHIP,
      MANAGER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await patchGoal(app, { salesGoalCents: 100_000_00 })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.updateSalesGoal).not.toHaveBeenCalled()
  })

  it('returns 400 for a negative goal', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildGoalMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await patchGoal(app, { salesGoalCents: -1 })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the target is not a member of the organization', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildGoalMembershipRepository(ADMIN_MEMBERSHIP, null),
    })

    const response = await patchGoal(app, { salesGoalCents: 100_000_00 })

    expect(response.statusCode).toBe(404)
  })

  it('allows an ADMIN to set the goal of a SELLER', async () => {
    const membershipRepository = buildGoalMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await patchGoal(app, { salesGoalCents: 500_000_00 })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updateSalesGoal).toHaveBeenCalledWith(TARGET_ID, ORG_ID, 500_000_00)
  })

  it('allows a MANAGER to clear the goal of a SELLER', async () => {
    const membershipRepository = buildGoalMembershipRepository(
      MANAGER_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await patchGoal(app, { salesGoalCents: null })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updateSalesGoal).toHaveBeenCalledWith(TARGET_ID, ORG_ID, null)
  })
})

describe('PUT /team/members/:userId/tier', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildTierMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership | null,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(actorMembership),
      findByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updateSalesGoal: vi.fn(),
      updateTier: vi.fn(),
      updateRole: vi.fn(),
      findPersonalGoal: vi.fn().mockResolvedValue(null),
      updatePersonalGoal: vi.fn(),
      removeAllForUser: vi.fn(),
    }
  }

  function putTier(app: ReturnType<typeof buildApp>, payload: unknown) {
    return app.inject({
      method: 'PUT',
      url: `/team/members/${TARGET_ID}/tier`,
      headers: AUTH_HEADERS,
      payload: payload as Record<string, unknown>,
    })
  }

  it('returns 403 when a SELLER tries to set a tier (missing team.tier_update)', async () => {
    const membershipRepository = buildTierMembershipRepository(SELLER_MEMBERSHIP, SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putTier(app, { tier: 'ouro' })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.updateTier).not.toHaveBeenCalled()
  })

  it('returns 403 when a MANAGER tries to set the tier of another MANAGER', async () => {
    const membershipRepository = buildTierMembershipRepository(
      MANAGER_MEMBERSHIP,
      MANAGER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putTier(app, { tier: 'ouro' })

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.updateTier).not.toHaveBeenCalled()
  })

  it('returns 400 for an unknown tier', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildTierMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    const response = await putTier(app, { tier: 'turmalina' })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when the target is not a member of the organization', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildTierMembershipRepository(ADMIN_MEMBERSHIP, null),
    })

    const response = await putTier(app, { tier: 'ouro' })

    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when an ADMIN sets the tier of a MANAGER (only sellers have tiers)', async () => {
    const membershipRepository = buildTierMembershipRepository(ADMIN_MEMBERSHIP, MANAGER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putTier(app, { tier: 'diamante' })

    expect(response.statusCode).toBe(400)
    expect(response.json().code).toBe('TIER_ONLY_FOR_SELLERS')
    expect(membershipRepository.updateTier).not.toHaveBeenCalled()
  })

  it('allows an ADMIN to set the tier of a SELLER', async () => {
    const membershipRepository = buildTierMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putTier(app, { tier: 'diamante' })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updateTier).toHaveBeenCalledWith(TARGET_ID, ORG_ID, 'diamante')
  })

  it('allows a MANAGER to set the tier of a SELLER', async () => {
    const membershipRepository = buildTierMembershipRepository(
      MANAGER_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putTier(app, { tier: 'prata' })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updateTier).toHaveBeenCalledWith(TARGET_ID, ORG_ID, 'prata')
  })
})

describe('GET /team/goals/summary', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({ method: 'GET', url: '/team/goals/summary' })

    expect(response.statusCode).toBe(401)
  })

  it('returns the personal and organization goal progress for any role', async () => {
    const membershipRepository = buildMembershipRepository(SELLER_MEMBERSHIP)
    vi.mocked(membershipRepository.findActiveByOrganizationId).mockResolvedValue([
      {
        userId: IDENTITY.id,
        name: null,
        email: IDENTITY.email,
        avatarUrl: null,
        role: Role.SELLER,
        status: 'ACTIVE',
        salesGoalCents: 200_000_00,
        tier: 'bronze',
      },
      {
        userId: 'colleague-uuid',
        name: null,
        email: 'colega@empresa.com',
        avatarUrl: null,
        role: Role.SELLER,
        status: 'ACTIVE',
        salesGoalCents: 300_000_00,
        tier: 'bronze',
      },
    ])
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/team/goals/summary',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{
      personal: { goalCents: number | null; teamGoalCents: number | null; achievedCents: number }
      organization: { goalCents: number | null; achievedCents: number }
    }>()
    expect(body.personal).toEqual({ goalCents: null, teamGoalCents: 200_000_00, achievedCents: 0 })
    expect(body.organization).toEqual({ goalCents: 500_000_00, achievedCents: 0 })
  })
})

describe('PUT /team/me/personal-goal', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'PUT',
      url: '/team/me/personal-goal',
      payload: { personalGoalCents: 100_000_00 },
    })

    expect(response.statusCode).toBe(401)
  })

  it('lets a SELLER set their own personal goal without touching the team goal', async () => {
    const membershipRepository = buildMembershipRepository(SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await app.inject({
      method: 'PUT',
      url: '/team/me/personal-goal',
      headers: AUTH_HEADERS,
      payload: { personalGoalCents: 300_000_00 },
    })

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updatePersonalGoal).toHaveBeenCalledWith(
      IDENTITY.id,
      ORG_ID,
      300_000_00,
    )
    expect(membershipRepository.updateSalesGoal).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid goal', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP)

    const response = await app.inject({
      method: 'PUT',
      url: '/team/me/personal-goal',
      headers: AUTH_HEADERS,
      payload: { personalGoalCents: 'muito' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('PUT /team/members/:userId/role', () => {
  const TARGET_ID = 'target-user-uuid'

  function buildRoleMembershipRepository(
    actorMembership: UserMembership,
    targetMembership: UserMembership,
  ): IMembershipRepository {
    return {
      findActiveByUserId: vi.fn().mockResolvedValue([actorMembership]),
      findActiveByUserAndOrganization: vi.fn().mockResolvedValue(actorMembership),
      findByUserAndOrganization: vi
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve(userId === TARGET_ID ? targetMembership : actorMembership),
        ),
      findActiveByOrganizationId: vi.fn().mockResolvedValue([]),
      findByOrganizationId: vi.fn().mockResolvedValue([]),
      findAllActive: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updateSalesGoal: vi.fn(),
      updateTier: vi.fn(),
      updateRole: vi.fn(),
      findPersonalGoal: vi.fn().mockResolvedValue(null),
      updatePersonalGoal: vi.fn(),
      removeAllForUser: vi.fn(),
    }
  }

  function putRole(app: ReturnType<typeof buildApp>, role: string) {
    return app.inject({
      method: 'PUT',
      url: `/team/members/${TARGET_ID}/role`,
      headers: AUTH_HEADERS,
      payload: { role },
    })
  }

  it('returns 403 for a supervisor (missing team.role_update)', async () => {
    const membershipRepository = buildRoleMembershipRepository(
      MANAGER_MEMBERSHIP,
      SELLER_MEMBERSHIP,
    )
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putRole(app, 'MANAGER')

    expect(response.statusCode).toBe(403)
    expect(membershipRepository.updateRole).not.toHaveBeenCalled()
  })

  it('lets an owner promote a seller to supervisor', async () => {
    const membershipRepository = buildRoleMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP)
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository,
    })

    const response = await putRole(app, 'MANAGER')

    expect(response.statusCode).toBe(204)
    expect(membershipRepository.updateRole).toHaveBeenCalledWith(
      TARGET_ID,
      ADMIN_MEMBERSHIP.organizationId,
      'MANAGER',
    )
  })

  it('returns 400 for an unknown role', async () => {
    const app = buildApp({
      authProvider: buildAuthProvider(),
      userRepository: buildUserRepository(),
      membershipRepository: buildRoleMembershipRepository(ADMIN_MEMBERSHIP, SELLER_MEMBERSHIP),
    })

    expect((await putRole(app, 'CEO')).statusCode).toBe(400)
  })
})
