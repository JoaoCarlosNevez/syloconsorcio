// Rotas de gerenciamento das chaves de API — Configurações > Integrações.
//
// GET    /organization/api-keys      — chaves ativas da organização.
// POST   /organization/api-keys      — cria uma chave; a resposta traz a chave
//                                      completa (`key`), que nunca mais aparece.
// DELETE /organization/api-keys/:id  — revoga; a chave para de funcionar na hora.
//
// Todas exigem integration.manage (só Dono — ver auth/permissions.ts). A
// criação e a revogação entram no log de atividades.

import type {
  ApiKeyRecord,
  IActivityLogRepository,
  IApiKeyRepository,
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { Permission } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { generateApiKey } from '../lib/api-keys'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface ApiKeysRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  apiKeyRepository: IApiKeyRepository
  activityLogRepository: IActivityLogRepository
}

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

function serializeApiKey(apiKey: ApiKeyRecord) {
  return {
    ...apiKey,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    createdAt: apiKey.createdAt.toISOString(),
  }
}

export const apiKeysRoute: FastifyPluginAsync<ApiKeysRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const preHandler = [
    authMiddleware,
    tenantMiddleware,
    requirePermission(Permission.INTEGRATION_MANAGE),
  ]

  // ── GET /organization/api-keys ────────────────────────────────────────────
  fastify.get('/organization/api-keys', { preHandler }, async (request) => {
    const context = request.authContext as NonNullable<typeof request.authContext>
    const apiKeys = await options.apiKeyRepository.listActiveByOrganization(
      context.currentMembership.organizationId,
    )
    return { items: apiKeys.map(serializeApiKey) }
  })

  // ── POST /organization/api-keys ───────────────────────────────────────────
  fastify.post('/organization/api-keys', { preHandler }, async (request, reply) => {
    const parsed = createApiKeySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const context = request.authContext as NonNullable<typeof request.authContext>
    const organizationId = context.currentMembership.organizationId
    const generated = generateApiKey()
    const apiKey = await options.apiKeyRepository.create({
      organizationId,
      name: parsed.data.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      createdByUserId: context.userId,
    })

    await options.activityLogRepository.record({
      organizationId,
      actorUserId: context.userId,
      action: 'organization.api_key_created',
      entityType: 'organization',
      entityId: apiKey.id,
      entityLabel: apiKey.name,
      metadata: { keyPrefix: apiKey.keyPrefix },
    })

    return reply.status(201).send({ ...serializeApiKey(apiKey), key: generated.key })
  })

  // ── DELETE /organization/api-keys/:id ─────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/organization/api-keys/:id',
    { preHandler },
    async (request, reply) => {
      const notFound = {
        error: 'Chave de API não encontrada.',
        code: 'API_KEY_NOT_FOUND',
        status: 404,
      }
      if (!z.string().uuid().safeParse(request.params.id).success) {
        return reply.status(404).send(notFound)
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const organizationId = context.currentMembership.organizationId
      const apiKeys = await options.apiKeyRepository.listActiveByOrganization(organizationId)
      const target = apiKeys.find((apiKey) => apiKey.id === request.params.id)
      const revoked = target
        ? await options.apiKeyRepository.revoke(target.id, organizationId)
        : false
      if (!target || !revoked) {
        return reply.status(404).send(notFound)
      }

      await options.activityLogRepository.record({
        organizationId,
        actorUserId: context.userId,
        action: 'organization.api_key_revoked',
        entityType: 'organization',
        entityId: target.id,
        entityLabel: target.name,
        metadata: { keyPrefix: target.keyPrefix },
      })

      return reply.status(204).send()
    },
  )
}
