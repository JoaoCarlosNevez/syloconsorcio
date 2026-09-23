// Rotas de leads — primeiro módulo de negócio vertical do CRM.
//
// GET    /leads              — lista paginada e filtrada por DataScope (lead.read).
//                              `outcome` (aberto/ganho/perdido/todos) filtra por resultado;
//                              "perdido"/"todos" exigem lead.manage_lost (Vendedor não tem).
//                              `tags` (lista separada por vírgula) filtra por overlap (OR).
// POST   /leads              — cria um lead na organização ativa (lead.create)
// GET    /leads/:id          — detalhe de um lead dentro do escopo (lead.read)
// PATCH  /leads/:id          — atualiza um lead (lead.update; reatribuir exige lead.assign).
//                              `lost: true` marca como Perdido (some do board); `lost: false`
//                              reabre e exige lead.manage_lost (Vendedor não tem).
// DELETE /leads/:id          — remove um lead dentro do escopo (lead.delete)
// GET    /leads/:id/history  — histórico de atribuição + comentários (lead.read)
// POST   /leads/:id/comments — adiciona um comentário/anotação interna (lead.update)
//
// Todas as rotas rodam authMiddleware → tenantMiddleware → requirePermission,
// nessa ordem. `organizationId` do lead nunca vem do corpo da requisição —
// é sempre a organização ativa resolvida pelo tenantMiddleware.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  CreateLeadCommentUseCase,
  CreateLeadUseCase,
  DeleteLeadUseCase,
  GetLeadHistoryUseCase,
  GetLeadUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
} from '@sylocrm/application'
import { LeadStage, Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthErrorCode } from '../auth/errors'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface LeadsRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  leadRepository: ILeadRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
}

const LEAD_STAGE_VALUES = Object.values(LeadStage) as [string, ...string[]]

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  segment: z.string().min(1),
  valueCents: z.number().int().nonnegative(),
  quotaCount: z.number().int().positive().optional(),
  source: z.string().min(1),
  assignedUserId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  segment: z.string().min(1).optional(),
  valueCents: z.number().int().nonnegative().optional(),
  quotaCount: z.number().int().positive().optional(),
  source: z.string().min(1).optional(),
  stage: z.enum(LEAD_STAGE_VALUES).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  lost: z.boolean().optional(),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().nullable().optional(),
})

const listQuerySchema = z.object({
  stage: z.enum(LEAD_STAGE_VALUES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  outcome: z.enum(['aberto', 'ganho', 'perdido', 'todos']).optional(),
  // Lista separada por vírgula (?tags=Quente,Frio) — mais simples de montar
  // no client e de parsear aqui do que depender do parser de query arrays.
  tags: z.string().optional(),
})

const createCommentSchema = z.object({
  text: z.string().min(1),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return {
    error: 'Dados inválidos.',
    code: 'VALIDATION_ERROR',
    status: 400,
    details: fieldErrors,
  }
}

export const leadsRoute: FastifyPluginAsync<LeadsRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  const listLeads = new ListLeadsUseCase(options.leadRepository, options.organizationRepository)
  const getLead = new GetLeadUseCase(options.leadRepository, options.organizationRepository)
  const getLeadHistory = new GetLeadHistoryUseCase(
    options.leadRepository,
    options.organizationRepository,
  )
  const createLead = new CreateLeadUseCase(options.leadRepository)
  const createLeadComment = new CreateLeadCommentUseCase(
    options.leadRepository,
    options.organizationRepository,
  )
  const updateLead = new UpdateLeadUseCase(options.leadRepository, options.organizationRepository)
  const deleteLead = new DeleteLeadUseCase(options.leadRepository, options.organizationRepository)

  // ── GET /leads ────────────────────────────────────────────────────────────
  fastify.get(
    '/leads',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)],
    },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      // preHandlers garantem que authContext está presente neste ponto.
      const context = request.authContext as NonNullable<typeof request.authContext>

      // Ver leads perdidos exige uma permission adicional — Vendedor não a
      // possui (ver apps/api/src/auth/permissions.ts). 'todos' também inclui
      // perdidos, então exige a mesma permission.
      if (
        (parsed.data.outcome === 'perdido' || parsed.data.outcome === 'todos') &&
        !context.currentMembership.permissions.includes(Permission.LEAD_MANAGE_LOST)
      ) {
        return reply.status(403).send({
          error: 'Ação não autorizada. Permissão necessária: lead.manage_lost.',
          code: AuthErrorCode.PERMISSION_DENIED,
          status: 403,
        })
      }

      return listLeads.execute({
        userId: context.userId,
        membership: context.currentMembership,
        stage: parsed.data.stage as LeadStage | undefined,
        search: parsed.data.search,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        outcome: parsed.data.outcome,
        tags: parsed.data.tags
          ?.split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
    },
  )

  // ── POST /leads ───────────────────────────────────────────────────────────
  fastify.post(
    '/leads',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_CREATE)],
    },
    async (request, reply) => {
      const parsed = createLeadSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      // Sem lead.assign (Vendedor), o lead sempre nasce atribuído a quem criou —
      // ignora qualquer assignedUserId enviado pelo cliente. Só quem pode
      // reatribuir pode escolher outro responsável (ou deixar sem atribuição).
      const canAssign = context.currentMembership.permissions.includes(Permission.LEAD_ASSIGN)
      const assignedUserId = canAssign ? parsed.data.assignedUserId : context.userId

      const lead = await createLead.execute({
        ...parsed.data,
        assignedUserId,
        organizationId: context.currentMembership.organizationId,
      })
      return reply.status(201).send(lead)
    },
  )

  // ── GET /leads/:id ────────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/leads/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)],
    },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>

      const lead = await getLead.execute({
        id: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
      })

      if (!lead) {
        return reply
          .status(404)
          .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
      }
      return lead
    },
  )

  // ── GET /leads/:id/history ───────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/leads/:id/history',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)],
    },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>

      const history = await getLeadHistory.execute({
        id: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
      })

      if (!history) {
        return reply
          .status(404)
          .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
      }
      return history
    },
  )

  // ── POST /leads/:id/comments ──────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/leads/:id/comments',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_UPDATE)],
    },
    async (request, reply) => {
      const parsed = createCommentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      const comment = await createLeadComment.execute({
        leadId: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
        text: parsed.data.text,
      })

      if (!comment) {
        return reply
          .status(404)
          .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
      }
      return reply.status(201).send(comment)
    },
  )

  // ── PATCH /leads/:id ──────────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/leads/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_UPDATE)],
    },
    async (request, reply) => {
      const parsed = updateLeadSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>

      // Reatribuir responsável exige uma permission adicional — MANAGER/ADMIN a
      // possuem, SELLER não (ver apps/api/src/auth/permissions.ts).
      if (
        parsed.data.assignedUserId !== undefined &&
        !context.currentMembership.permissions.includes(Permission.LEAD_ASSIGN)
      ) {
        return reply.status(403).send({
          error: 'Ação não autorizada. Permissão necessária: lead.assign.',
          code: AuthErrorCode.PERMISSION_DENIED,
          status: 403,
        })
      }

      // Marcar como Perdido (lost: true) qualquer um com lead.update pode —
      // reabrir (lost: false) exige lead.manage_lost. SELLER não tem.
      if (
        parsed.data.lost === false &&
        !context.currentMembership.permissions.includes(Permission.LEAD_MANAGE_LOST)
      ) {
        return reply.status(403).send({
          error: 'Ação não autorizada. Permissão necessária: lead.manage_lost.',
          code: AuthErrorCode.PERMISSION_DENIED,
          status: 403,
        })
      }

      try {
        const lead = await updateLead.execute({
          id: request.params.id,
          userId: context.userId,
          membership: context.currentMembership,
          changes: { ...parsed.data, stage: parsed.data.stage as LeadStage | undefined },
        })

        if (!lead) {
          return reply
            .status(404)
            .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
        }
        return lead
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )

  // ── DELETE /leads/:id ─────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/leads/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_DELETE)],
    },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>

      const deleted = await deleteLead.execute({
        id: request.params.id,
        userId: context.userId,
        membership: context.currentMembership,
      })

      if (!deleted) {
        return reply
          .status(404)
          .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
      }
      return reply.status(204).send()
    },
  )
}
