// Rotas de leads — primeiro módulo de negócio vertical do CRM.
//
// GET    /leads      — lista paginada e filtrada por DataScope (lead.read)
// POST   /leads      — cria um lead na organização ativa (lead.create)
// GET    /leads/:id  — detalhe de um lead dentro do escopo (lead.read)
// PATCH  /leads/:id  — atualiza um lead (lead.update; reatribuir exige lead.assign).
//                      `lost: true` marca como Perdido (some do board); `lost: false` reabre.
// DELETE /leads/:id  — remove um lead dentro do escopo (lead.delete)
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
  CreateLeadUseCase,
  DeleteLeadUseCase,
  GetLeadUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
} from '@sylocrm/application'
import { LeadStage, Permission } from '@sylocrm/domain'
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
})

const listQuerySchema = z.object({
  stage: z.enum(LEAD_STAGE_VALUES).optional(),
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

export const leadsRoute: FastifyPluginAsync<LeadsRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  const listLeads = new ListLeadsUseCase(options.leadRepository, options.organizationRepository)
  const getLead = new GetLeadUseCase(options.leadRepository, options.organizationRepository)
  const createLead = new CreateLeadUseCase(options.leadRepository)
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

      return listLeads.execute({
        userId: context.userId,
        membership: context.currentMembership,
        stage: parsed.data.stage as LeadStage | undefined,
        search: parsed.data.search,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
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

      const lead = await createLead.execute({
        ...parsed.data,
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
