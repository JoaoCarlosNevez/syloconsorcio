// Rotas de funis — pipelines de vendas customizáveis por organização.
//
// GET    /funnels      — lista os funis da organização ativa, com estágios
//                        ordenados e leadCount por estágio (leitura livre —
//                        qualquer membership ativa, sem permission extra).
// POST   /funnels      — cria um funil novo (organization.update)
// PATCH  /funnels/:id  — renomeia/define como padrão/aplica diff de estágios/
//                        configura duplicateToFunnelId (organization.update)
// DELETE /funnels/:id  — remove um funil (organization.update) — falha se for
//                        o único funil da org, o funil padrão, ou tiver leads.
//
// Mesma trava de permissão que leadSegments/leadSources/leadTags hoje: só
// ADMIN tem organization.update (apps/api/src/auth/permissions.ts).

import type {
  IActivityLogRepository,
  IAuthProvider,
  IFunnelRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  CreateFunnelUseCase,
  DeleteFunnelUseCase,
  ListFunnelsUseCase,
  UpdateFunnelUseCase,
} from '@sylocrm/application'
import { Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface FunnelsRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  funnelRepository: IFunnelRepository
  activityLogRepository: IActivityLogRepository
}

const stageInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  color: z.string().min(1).optional(),
})

const createFunnelSchema = z.object({
  name: z.string().min(1),
  stages: z.array(stageInputSchema.omit({ id: true })).min(1),
})

const updateFunnelSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(stageInputSchema).optional(),
  duplicateToFunnelId: z.string().uuid().nullable().optional(),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return { error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400, details: fieldErrors }
}

function funnelNotFoundResponse() {
  return { error: 'Funil não encontrado.', code: 'FUNNEL_NOT_FOUND', status: 404 }
}

export const funnelsRoute: FastifyPluginAsync<FunnelsRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const requireOrganizationUpdate = requirePermission(Permission.ORGANIZATION_UPDATE)

  const listFunnels = new ListFunnelsUseCase(options.funnelRepository)
  const createFunnel = new CreateFunnelUseCase(
    options.funnelRepository,
    options.activityLogRepository,
  )
  const updateFunnel = new UpdateFunnelUseCase(
    options.funnelRepository,
    options.activityLogRepository,
  )
  const deleteFunnel = new DeleteFunnelUseCase(
    options.funnelRepository,
    options.activityLogRepository,
  )

  // ── GET /funnels ─────────────────────────────────────────────────────────
  fastify.get('/funnels', { preHandler: [authMiddleware, tenantMiddleware] }, async (request) => {
    const context = request.authContext as NonNullable<typeof request.authContext>
    const funnels = await listFunnels.execute({
      organizationId: context.currentMembership.organizationId,
    })
    return { funnels }
  })

  // ── POST /funnels ────────────────────────────────────────────────────────
  fastify.post(
    '/funnels',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const parsed = createFunnelSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const funnel = await createFunnel.execute({
          organizationId: context.currentMembership.organizationId,
          name: parsed.data.name,
          stages: parsed.data.stages,
          actorUserId: context.userId,
        })
        return reply.status(201).send(funnel)
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )

  // ── PATCH /funnels/:id ───────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/funnels/:id',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const parsed = updateFunnelSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const funnel = await updateFunnel.execute({
          id: request.params.id,
          organizationId: context.currentMembership.organizationId,
          changes: parsed.data,
          actorUserId: context.userId,
        })
        if (!funnel) {
          return reply.status(404).send(funnelNotFoundResponse())
        }
        return funnel
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )

  // ── DELETE /funnels/:id ──────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/funnels/:id',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const deleted = await deleteFunnel.execute({
          id: request.params.id,
          organizationId: context.currentMembership.organizationId,
          actorUserId: context.userId,
        })
        if (!deleted) {
          return reply.status(404).send(funnelNotFoundResponse())
        }
        return reply.status(204).send()
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )
}
