// Tests: administratorsRoute — Configurações > Administradoras
//
// GET libera qualquer membro (a ficha de adesão usa a lista); gravar exige
// organization.update (só Dono).

import type {
  AdministratorRecord,
  IAdministratorRepository,
  IAuthProvider,
  IMembershipRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { ConflictError, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

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
  sectors: [],
  role: Role.ADMIN,
  status: 'ACTIVE',
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildUserRepository(): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: IDENTITY.id,
      email: IDENTITY.email,
      name: null,
      isPlatformAdmin: false,
    }),
    upsert: vi.fn(),
    updateProfile: vi.fn(),
    listPlatformAdmins: vi.fn().mockResolvedValue([]),
  }
}

function buildMembershipRepository(membership: UserMembership): IMembershipRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([membership]),
    findActiveByUserAndOrganization: vi.fn().mockResolvedValue(membership),
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
    updateSupervisor: vi.fn(),
    findTeamUserIds: vi.fn().mockResolvedValue([]),
    clearSupervisorLinks: vi.fn(),
    updateSectors: vi.fn(),
    findActiveUserIdsBySector: vi.fn().mockResolvedValue([]),
  }
}

const SELLER_MEMBERSHIP: UserMembership = { ...ADMIN_MEMBERSHIP, role: Role.SELLER }

const PORTO: AdministratorRecord = {
  id: '9b2f4c1e-7d3a-4f5b-8c6d-1e2f3a4b5c6d',
  organizationId: ORG_ID,
  name: 'Porto Seguro',
  emails: ['cadastro@porto.com.br'],
  createdAt: new Date('2026-11-17T12:00:00Z'),
  updatedAt: new Date('2026-11-17T12:00:00Z'),
}

function buildRepository(
  overrides: Partial<IAdministratorRepository> = {},
): IAdministratorRepository {
  return {
    list: vi.fn().mockResolvedValue([PORTO]),
    create: vi.fn().mockResolvedValue(PORTO),
    update: vi.fn().mockResolvedValue(PORTO),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function setup(membership: UserMembership, repository = buildRepository()) {
  const app = buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
    administratorRepository: repository,
  })
  return { app, repository }
}

describe('administratorsRoute', () => {
  it('lists the administrators for any member', async () => {
    const { app } = setup(SELLER_MEMBERSHIP)
    const response = await app.inject({
      method: 'GET',
      url: '/administrators',
      headers: AUTH_HEADERS,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ items: { name: string }[] }>().items[0]?.name).toBe('Porto Seguro')
  })

  it('lets the owner create one, normalizing the e-mails', async () => {
    const { app, repository } = setup(ADMIN_MEMBERSHIP)
    const response = await app.inject({
      method: 'POST',
      url: '/administrators',
      headers: AUTH_HEADERS,
      payload: { name: ' Porto Seguro ', emails: ['Cadastro@Porto.com.br'] },
    })
    expect(response.statusCode).toBe(201)
    expect(repository.create).toHaveBeenCalledWith(ORG_ID, {
      name: 'Porto Seguro',
      emails: ['cadastro@porto.com.br'],
    })
  })

  it('refuses a seller', async () => {
    const { app, repository } = setup(SELLER_MEMBERSHIP)
    const response = await app.inject({
      method: 'POST',
      url: '/administrators',
      headers: AUTH_HEADERS,
      payload: { name: 'Porto', emails: ['a@b.com'] },
    })
    expect(response.statusCode).toBe(403)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('answers 409 for a repeated name and 400 for a bad e-mail', async () => {
    const { app } = setup(
      ADMIN_MEMBERSHIP,
      buildRepository({
        create: vi.fn().mockRejectedValue(new ConflictError('Já existe a administradora "Porto".')),
      }),
    )
    const repeated = await app.inject({
      method: 'POST',
      url: '/administrators',
      headers: AUTH_HEADERS,
      payload: { name: 'Porto', emails: ['a@b.com'] },
    })
    expect(repeated.statusCode).toBe(409)
    const invalid = await app.inject({
      method: 'POST',
      url: '/administrators',
      headers: AUTH_HEADERS,
      payload: { name: 'Porto', emails: ['sem-arroba'] },
    })
    expect(invalid.statusCode).toBe(400)
  })
})
