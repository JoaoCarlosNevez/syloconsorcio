// Tests: notificationsRoute
//
// GET  /notifications          — notificações do próprio usuário na organização
//                                ativa; gera os lembretes antes de listar.
// POST /notifications/:id/read — marca uma como lida.
// POST /notifications/read-all — marca todas como lidas.

import type {
  IAuthProvider,
  IMembershipRepository,
  INotificationRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const SELLER_MEMBERSHIP: UserMembership = { ...MANAGER_MEMBERSHIP, role: Role.SELLER }

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
    findPersonalGoal: vi.fn().mockResolvedValue(null),
    updatePersonalGoal: vi.fn(),
    removeAllForUser: vi.fn(),
  }
}

const NOTIFICATION_ID = '6f1d7a52-3c1b-4e7a-9a55-0d6c1f0b9e21'
const RECIPIENT = { userId: IDENTITY.id, organizationId: ORG_ID }

function buildNotificationRepository(
  overrides: Partial<INotificationRepository> = {},
): INotificationRepository {
  return {
    notify: vi.fn(),
    syncTaskReminders: vi.fn(),
    list: vi.fn().mockResolvedValue({
      unreadCount: 1,
      items: [
        {
          id: NOTIFICATION_ID,
          organizationId: ORG_ID,
          type: 'task.overdue',
          actor: null,
          title: 'Ligar pro cliente',
          metadata: { taskType: 'Ligação', dueAt: '2026-09-25T12:00:00+00:00' },
          task: {
            id: 'task-01',
            organizationId: ORG_ID,
            leadId: null,
            assignedUserId: IDENTITY.id,
            createdByUserId: IDENTITY.id,
            type: 'Ligação',
            title: 'Ligar pro cliente',
            notes: null,
            status: 'pendente',
            dueAt: new Date('2026-09-25T12:00:00Z'),
            createdAt: new Date('2026-09-20T12:00:00Z'),
            updatedAt: new Date('2026-09-20T12:00:00Z'),
          },
          readAt: null,
          createdAt: new Date('2026-09-25T12:01:00Z'),
        },
      ],
    }),
    markRead: vi.fn().mockResolvedValue(true),
    markAllRead: vi.fn(),
    ...overrides,
  }
}

function buildTestApp(membership: UserMembership, notificationRepository: INotificationRepository) {
  return buildApp({
    authProvider: buildAuthProvider(),
    userRepository: buildUserRepository(),
    membershipRepository: buildMembershipRepository(membership),
    notificationRepository,
  })
}

describe('GET /notifications', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const app = buildTestApp(SELLER_MEMBERSHIP, buildNotificationRepository())

    const response = await app.inject({ method: 'GET', url: '/notifications' })

    expect(response.statusCode).toBe(401)
  })

  it("syncs reminders and lists the user's own notifications, capping the limit", async () => {
    const notificationRepository = buildNotificationRepository()
    const app = buildTestApp(SELLER_MEMBERSHIP, notificationRepository)

    const response = await app.inject({
      method: 'GET',
      url: '/notifications?limit=500',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(notificationRepository.syncTaskReminders).toHaveBeenCalledWith(
      RECIPIENT,
      expect.objectContaining({ dueSoonWindowMs: expect.any(Number) }),
    )
    expect(notificationRepository.list).toHaveBeenCalledWith(RECIPIENT, 50)
    const body = response.json<{
      unreadCount: number
      items: { type: string; createdAt: string; task: { dueAt: string } | null }[]
    }>()
    expect(body.unreadCount).toBe(1)
    expect(body.items[0]).toEqual(
      expect.objectContaining({ type: 'task.overdue', createdAt: '2026-09-25T12:01:00.000Z' }),
    )
    expect(body.items[0]?.task?.dueAt).toBe('2026-09-25T12:00:00.000Z')
  })
})

describe('POST /notifications/:id/read', () => {
  it('marks the notification as read for the current user', async () => {
    const notificationRepository = buildNotificationRepository()
    const app = buildTestApp(SELLER_MEMBERSHIP, notificationRepository)

    const response = await app.inject({
      method: 'POST',
      url: `/notifications/${NOTIFICATION_ID}/read`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(notificationRepository.markRead).toHaveBeenCalledWith(NOTIFICATION_ID, RECIPIENT)
  })

  it("returns 404 when the notification isn't the user's", async () => {
    const notificationRepository = buildNotificationRepository({
      markRead: vi.fn().mockResolvedValue(false),
    })
    const app = buildTestApp(SELLER_MEMBERSHIP, notificationRepository)

    const response = await app.inject({
      method: 'POST',
      url: `/notifications/${NOTIFICATION_ID}/read`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 404 for a malformed id without touching the database', async () => {
    const notificationRepository = buildNotificationRepository()
    const app = buildTestApp(SELLER_MEMBERSHIP, notificationRepository)

    const response = await app.inject({
      method: 'POST',
      url: '/notifications/nao-e-uuid/read',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
    expect(notificationRepository.markRead).not.toHaveBeenCalled()
  })
})

describe('POST /notifications/read-all', () => {
  it("marks all of the user's notifications in the active organization as read", async () => {
    const notificationRepository = buildNotificationRepository()
    const app = buildTestApp(SELLER_MEMBERSHIP, notificationRepository)

    const response = await app.inject({
      method: 'POST',
      url: '/notifications/read-all',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
    expect(notificationRepository.markAllRead).toHaveBeenCalledWith(RECIPIENT)
  })
})
