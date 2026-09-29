// Tests: UpdateTaskUseCase — notificações disparadas pela atualização

import { DataScope, OrganizationType, Role } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { INotificationRepository } from '../ports/notification.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { ITaskRepository, TaskRecord } from '../ports/task.repository'
import { UpdateTaskUseCase } from './update-task.use-case'

const ORG_ID = 'org-01'
const MANAGER_ID = 'user-manager'
const SELLER_ID = 'user-seller'

const MEMBERSHIP: MembershipContext = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  role: Role.MANAGER,
  dataScope: DataScope.ORGANIZATION,
  permissions: [],
}

const TASK: TaskRecord = {
  id: 'task-01',
  organizationId: ORG_ID,
  leadId: null,
  assignedUserId: MANAGER_ID,
  createdByUserId: MANAGER_ID,
  type: 'Ligação',
  title: 'Ligar pro cliente',
  notes: null,
  status: 'pendente',
  dueAt: new Date('2026-02-01T12:00:00Z'),
  createdAt: new Date('2026-01-05T00:00:00Z'),
  updatedAt: new Date('2026-01-05T00:00:00Z'),
}

function buildOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  }
}

function buildTaskRepository(before: TaskRecord, after: TaskRecord): ITaskRepository {
  return {
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(before),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(after),
    delete: vi.fn(),
  }
}

function buildNotificationRepository(): INotificationRepository {
  return {
    notify: vi.fn(),
    syncTaskReminders: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
}

function buildUseCase(
  before: TaskRecord,
  after: TaskRecord,
  notifications: INotificationRepository,
) {
  return new UpdateTaskUseCase(
    buildTaskRepository(before, after),
    buildOrganizationRepository(),
    undefined,
    notifications,
  )
}

describe('UpdateTaskUseCase — notifications', () => {
  it('notifies the new assignee when the task is reassigned to someone else', async () => {
    const notifications = buildNotificationRepository()
    const useCase = buildUseCase(TASK, { ...TASK, assignedUserId: SELLER_ID }, notifications)

    await useCase.execute({
      id: TASK.id,
      userId: MANAGER_ID,
      membership: MEMBERSHIP,
      changes: { assignedUserId: SELLER_ID },
    })

    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: SELLER_ID,
        actorUserId: MANAGER_ID,
        type: 'task.assigned',
        taskId: TASK.id,
      }),
    )
  })

  it('notifies the creator when someone else completes the task', async () => {
    const notifications = buildNotificationRepository()
    const before = { ...TASK, assignedUserId: SELLER_ID }
    const useCase = buildUseCase(before, { ...before, status: 'concluida' }, notifications)

    await useCase.execute({
      id: TASK.id,
      userId: SELLER_ID,
      membership: MEMBERSHIP,
      changes: { status: 'concluida' },
    })

    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MANAGER_ID,
        actorUserId: SELLER_ID,
        type: 'task.completed',
      }),
    )
  })

  it('does not notify when the creator completes their own task', async () => {
    const notifications = buildNotificationRepository()
    const useCase = buildUseCase(TASK, { ...TASK, status: 'concluida' }, notifications)

    await useCase.execute({
      id: TASK.id,
      userId: MANAGER_ID,
      membership: MEMBERSHIP,
      changes: { status: 'concluida' },
    })

    expect(notifications.notify).not.toHaveBeenCalled()
  })

  it('does not notify on edits that change neither assignee nor completion', async () => {
    const notifications = buildNotificationRepository()
    const useCase = buildUseCase(TASK, { ...TASK, title: 'Novo título' }, notifications)

    await useCase.execute({
      id: TASK.id,
      userId: MANAGER_ID,
      membership: MEMBERSHIP,
      changes: { title: 'Novo título' },
    })

    expect(notifications.notify).not.toHaveBeenCalled()
  })
})
