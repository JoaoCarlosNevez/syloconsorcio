// Tests: tasksRoute
//
// GET    /tasks      — lista paginada e filtrada por DataScope (task.read)
// POST   /tasks      — cria uma tarefa (task.create)
// PATCH  /tasks/:id  — atualiza campos/status (task.update)
// DELETE /tasks/:id  — remove (task.delete)
//
// Usa buildApp() com todos os repositórios mockados via DI — sem banco real.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  ITaskRepository,
  LeadRecord,
  TaskRecord,
  UserMembership,
} from '@sylocrm/application'
import { OrganizationType, Role } from '@sylocrm/domain'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const ORG_ID = 'org-rep-01'
const LEAD_ID = '11111111-1111-4111-8111-111111111111'
const TASK_ID = '22222222-2222-4222-8222-222222222222'

const AUTH_HEADERS = { authorization: 'Bearer valid-token', 'x-organization-id': ORG_ID }

const SELLER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  role: Role.SELLER,
  status: 'ACTIVE',
}

const MANAGER_MEMBERSHIP: UserMembership = {
  organizationId: ORG_ID,
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Representação Teste',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  role: Role.MANAGER,
  status: 'ACTIVE',
}

const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333'

const SAMPLE_LEAD: LeadRecord = {
  id: LEAD_ID,
  organizationId: ORG_ID,
  name: 'Fulano de Tal',
  phone: '(11) 90000-0000',
  email: null,
  segment: 'Imobiliário',
  valueCents: 35_000_000,
  quotaCount: 1,
  source: 'FACEBOOK',
  funnelId: 'funnel-01',
  stageId: 'stage-01',
  assignedUserId: IDENTITY.id,
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: [],
  notes: null,
  profession: null,
  incomeCents: null,
  maritalStatus: null,
  cpf: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const SAMPLE_TASK: TaskRecord = {
  id: TASK_ID,
  organizationId: ORG_ID,
  leadId: null,
  assignedUserId: IDENTITY.id,
  createdByUserId: IDENTITY.id,
  type: 'Tarefa',
  title: 'Ligar pro cliente',
  notes: null,
  status: 'pendente',
  dueAt: new Date('2026-02-01T12:00:00Z'),
  createdAt: new Date('2026-01-05T00:00:00Z'),
  updatedAt: new Date('2026-01-05T00:00:00Z'),
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildMembershipRepository(
  membership: UserMembership = SELLER_MEMBERSHIP,
): IMembershipRepository {
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

function buildOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  }
}

function buildLeadRepository(overrides: Partial<ILeadRepository> = {}): ILeadRepository {
  return {
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(SAMPLE_LEAD),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    recordAssignmentChange: vi.fn(),
    listAssignmentHistory: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
    sumWonValueCentsInDefaultFunnel: vi.fn().mockResolvedValue(0),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function buildTaskRepository(overrides: Partial<ITaskRepository> = {}): ITaskRepository {
  return {
    list: vi.fn().mockResolvedValue({ items: [SAMPLE_TASK], total: 1, page: 1, pageSize: 25 }),
    create: vi.fn().mockResolvedValue(SAMPLE_TASK),
    update: vi.fn().mockResolvedValue(SAMPLE_TASK),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function buildTestApp(options: {
  membership?: UserMembership
  taskRepository?: ITaskRepository
  leadRepository?: ILeadRepository
}) {
  return buildApp({
    authProvider: buildAuthProvider(),
    membershipRepository: buildMembershipRepository(options.membership),
    organizationRepository: buildOrganizationRepository(),
    taskRepository: options.taskRepository ?? buildTaskRepository(),
    leadRepository: options.leadRepository ?? buildLeadRepository(),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ── GET /tasks ──────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns a paginated page of tasks when authorized', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({ method: 'GET', url: '/tasks', headers: AUTH_HEADERS })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ items: TaskRecord[]; total: number }>()
    expect(body.items).toHaveLength(1)
    expect(taskRepository.list).toHaveBeenCalled()
  })

  it('returns 400 on an invalid status filter', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'GET',
      url: '/tasks?status=inexistente',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(400)
  })

  it('passes the abertas status and mine filter to the repository', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'GET',
      url: '/tasks?status=abertas&mine=true',
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    expect(taskRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'abertas', assignedUserId: expect.any(String) }),
      expect.anything(),
      expect.anything(),
    )
  })

  it('filters by leadId when provided', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ taskRepository })

    await app.inject({ method: 'GET', url: `/tasks?leadId=${LEAD_ID}`, headers: AUTH_HEADERS })

    expect(taskRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: LEAD_ID }),
      expect.anything(),
      expect.anything(),
    )
  })
})

// ── POST /tasks ─────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  const validPayload = {
    type: 'Tarefa',
    title: 'Ligar pro cliente',
    dueAt: '2026-02-01T12:00:00.000Z',
  }

  it('returns 400 when required fields are missing', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: { title: 'Sem tipo nem prazo' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for an unknown task type', async () => {
    const app = buildTestApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, type: 'Tipo Inventado' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates the task and returns 201', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: validPayload,
    })

    expect(response.statusCode).toBe(201)
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ligar pro cliente', assignedUserId: IDENTITY.id }),
    )
  })

  it('returns 400 when leadId does not exist within scope', async () => {
    const leadRepository = buildLeadRepository({ findById: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ leadRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, leadId: LEAD_ID },
    })

    expect(response.statusCode).toBe(400)
  })

  it('forces assignedUserId to the creator for a Vendedor (missing task.assign), ignoring any value sent', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, taskRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(201)
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: IDENTITY.id }),
    )
  })

  it('allows a Supervisor (has task.assign) to assign the task to someone else', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, taskRepository })

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: AUTH_HEADERS,
      payload: { ...validPayload, assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(201)
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: OTHER_USER_ID }),
    )
  })
})

// ── PATCH /tasks/:id ────────────────────────────────────────────────────────

describe('PATCH /tasks/:id', () => {
  it('updates the status and returns the updated task', async () => {
    const taskRepository = buildTaskRepository({
      update: vi.fn().mockResolvedValue({ ...SAMPLE_TASK, status: 'concluida' }),
    })
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
      payload: { status: 'concluida' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<TaskRecord>().status).toBe('concluida')
  })

  it('returns 404 when the task does not exist or is out of scope', async () => {
    const taskRepository = buildTaskRepository({ update: vi.fn().mockResolvedValue(null) })
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
      payload: { status: 'concluida' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 403 when a Vendedor tries to reassign a task (missing task.assign)', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ membership: SELLER_MEMBERSHIP, taskRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
      payload: { assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(403)
    expect(taskRepository.update).not.toHaveBeenCalled()
  })

  it('allows a Supervisor to reassign a task', async () => {
    const taskRepository = buildTaskRepository({
      update: vi.fn().mockResolvedValue({ ...SAMPLE_TASK, assignedUserId: OTHER_USER_ID }),
    })
    const app = buildTestApp({ membership: MANAGER_MEMBERSHIP, taskRepository })

    const response = await app.inject({
      method: 'PATCH',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
      payload: { assignedUserId: OTHER_USER_ID },
    })

    expect(response.statusCode).toBe(200)
  })
})

// ── DELETE /tasks/:id ───────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('deletes the task and returns 204', async () => {
    const taskRepository = buildTaskRepository()
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(204)
  })

  it('returns 404 when the task does not exist or is out of scope', async () => {
    const taskRepository = buildTaskRepository({ delete: vi.fn().mockResolvedValue(false) })
    const app = buildTestApp({ taskRepository })

    const response = await app.inject({
      method: 'DELETE',
      url: `/tasks/${TASK_ID}`,
      headers: AUTH_HEADERS,
    })

    expect(response.statusCode).toBe(404)
  })
})
