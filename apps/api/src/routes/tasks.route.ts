// Rotas de tarefas — atividades de acompanhamento, opcionalmente ligadas a um lead.
//
// GET    /tasks      — lista paginada e filtrada por DataScope (task.read).
//                      `status` aceita os 3 estados reais + 'atrasada' (derivado:
//                      não concluída e com prazo vencido) + 'abertas' (não
//                      concluídas) + 'todos'; `type` filtra pelo tipo. `mine=true` restringe às tarefas
//                      do próprio usuário, mesmo com DataScope mais amplo.
// POST   /tasks      — cria uma tarefa (task.create). Sem task.assign
//                      (Vendedor), a tarefa sempre nasce atribuída a quem
//                      criou — ignora qualquer assignedUserId enviado.
// PATCH  /tasks/:id  — atualiza campos e/ou status (task.update); reatribuir
//                      (mudar assignedUserId) exige task.assign.
// DELETE /tasks/:id  — remove uma tarefa dentro do escopo (task.delete).
//
// Mesmo DataScope de leads (ver lead-scope.ts) — um Vendedor só vê/edita as
// próprias tarefas, um Supervisor vê as da representação, etc.

import type {
  IActivityLogRepository,
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  ITaskRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  CreateTaskUseCase,
  DeleteTaskUseCase,
  ListTasksUseCase,
  UpdateTaskUseCase,
} from '@sylocrm/application'
import { Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthErrorCode } from '../auth/errors'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface TasksRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  taskRepository: ITaskRepository
  leadRepository: ILeadRepository
  activityLogRepository: IActivityLogRepository
}

// Espelhado no frontend (tarefas.types.ts) — mantenha em sincronia.
const TASK_TYPES = ['Ligação', 'Reunião', 'Follow-up', 'Tarefa', 'Simulação'] as const
const TASK_STATUSES = ['pendente', 'em_andamento', 'concluida'] as const

const createTaskSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  type: z.enum(TASK_TYPES),
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  dueAt: z.string().datetime(),
})

const updateTaskSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().uuid().optional(),
  type: z.enum(TASK_TYPES).optional(),
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueAt: z.string().datetime().optional(),
})

const listQuerySchema = z.object({
  leadId: z.string().uuid().optional(),
  status: z.enum([...TASK_STATUSES, 'atrasada', 'abertas', 'todos']).optional(),
  type: z.enum(TASK_TYPES).optional(),
  mine: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return {
    error: 'Dados inválidos.',
    code: 'VALIDATION_ERROR',
    status: 400,
    details: fieldErrors,
  }
}

function taskNotFoundResponse() {
  return { error: 'Tarefa não encontrada.', code: 'TASK_NOT_FOUND', status: 404 }
}

export const tasksRoute: FastifyPluginAsync<TasksRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  const listTasks = new ListTasksUseCase(options.taskRepository, options.organizationRepository)
  const createTask = new CreateTaskUseCase(
    options.taskRepository,
    options.leadRepository,
    options.organizationRepository,
    options.activityLogRepository,
  )
  const updateTask = new UpdateTaskUseCase(
    options.taskRepository,
    options.organizationRepository,
    options.activityLogRepository,
  )
  const deleteTask = new DeleteTaskUseCase(
    options.taskRepository,
    options.organizationRepository,
    options.activityLogRepository,
  )

  // ── GET /tasks ────────────────────────────────────────────────────────────
  fastify.get(
    '/tasks',
    { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.TASK_READ)] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      return listTasks.execute({
        userId: context.userId,
        membership: context.currentMembership,
        leadId: parsed.data.leadId,
        status: parsed.data.status,
        type: parsed.data.type,
        onlyMine: parsed.data.mine,
        search: parsed.data.search,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      })
    },
  )

  // ── POST /tasks ───────────────────────────────────────────────────────────
  fastify.post(
    '/tasks',
    { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.TASK_CREATE)] },
    async (request, reply) => {
      const parsed = createTaskSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      // Sem task.assign (Vendedor), a tarefa sempre nasce atribuída a quem
      // criou — ignora qualquer assignedUserId enviado pelo cliente. Mesma
      // regra de POST /leads (ver leads.route.ts).
      const canAssign = context.currentMembership.permissions.includes(Permission.TASK_ASSIGN)
      const assignedUserId = canAssign ? parsed.data.assignedUserId : context.userId

      try {
        const task = await createTask.execute({
          userId: context.userId,
          membership: context.currentMembership,
          leadId: parsed.data.leadId,
          assignedUserId,
          type: parsed.data.type,
          title: parsed.data.title,
          notes: parsed.data.notes,
          dueAt: new Date(parsed.data.dueAt),
        })
        return reply.status(201).send(task)
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )

  // ── PATCH /tasks/:id ──────────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.TASK_UPDATE)] },
    async (request, reply) => {
      const parsed = updateTaskSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      // Reatribuir responsável exige task.assign — Vendedor não tem (mesma
      // regra de PATCH /leads/:id, ver leads.route.ts).
      if (
        parsed.data.assignedUserId !== undefined &&
        !context.currentMembership.permissions.includes(Permission.TASK_ASSIGN)
      ) {
        return reply.status(403).send({
          error: 'Ação não autorizada. Permissão necessária: task.assign.',
          code: AuthErrorCode.PERMISSION_DENIED,
          status: 403,
        })
      }

      const { dueAt, ...rest } = parsed.data

      const task = await updateTask.execute({
        id: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
        changes: { ...rest, ...(dueAt ? { dueAt: new Date(dueAt) } : {}) },
      })

      if (!task) {
        return reply.status(404).send(taskNotFoundResponse())
      }
      return task
    },
  )

  // ── DELETE /tasks/:id ─────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.TASK_DELETE)] },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>

      const deleted = await deleteTask.execute({
        id: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
      })

      if (!deleted) {
        return reply.status(404).send(taskNotFoundResponse())
      }
      return reply.status(204).send()
    },
  )
}
