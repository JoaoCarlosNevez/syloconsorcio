// Rotas das administradoras de consórcio da organização ativa.
//
// GET    /administrators      — lista (qualquer membro: a ficha de adesão usa)
// POST   /administrators      — cadastra { name, emails[] } (organization.update)
// PATCH  /administrators/:id  — edita nome e e-mails (organization.update)
// DELETE /administrators/:id  — remove (organization.update)
//
// 409 quando o nome já existe na organização (sem diferenciar maiúsculas).

import type {
  AdministratorRecord,
  AdministratorUseCases,
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { ConflictError, Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface AdministratorsRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  administrators: AdministratorUseCases
}

const bodySchema = z.object({
  name: z.string(),
  emails: z.array(z.string()).max(20),
})
const idParams = z.object({ id: z.string().uuid() })

function serialize(record: AdministratorRecord) {
  return {
    id: record.id,
    name: record.name,
    emails: record.emails,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function notFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'Administradora não encontrada.',
    code: 'ADMINISTRATOR_NOT_FOUND',
    status: 404,
  })
}

/** ValidationError → 400, ConflictError → 409; o resto segue pro handler global. */
function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof ValidationError) {
    return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
  }
  if (error instanceof ConflictError) {
    return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
  }
  throw error
}

export const administratorsRoute: FastifyPluginAsync<AdministratorsRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const canEdit = [
    authMiddleware,
    tenantMiddleware,
    requirePermission(Permission.ORGANIZATION_UPDATE),
  ]
  const { administrators } = options

  function organizationId(request: { authContext?: unknown }): string {
    const context = request.authContext as { currentMembership: { organizationId: string } }
    return context.currentMembership.organizationId
  }

  fastify.get(
    '/administrators',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const items = await administrators.list(organizationId(request))
      return { items: items.map(serialize) }
    },
  )

  fastify.post('/administrators', { preHandler: canEdit }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten().fieldErrors,
      })
    }
    try {
      const created = await administrators.create(organizationId(request), parsed.data)
      return reply.status(201).send(serialize(created))
    } catch (error) {
      return handleError(error, reply)
    }
  })

  fastify.patch('/administrators/:id', { preHandler: canEdit }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten().fieldErrors,
      })
    }
    try {
      const updated = await administrators.update(
        params.data.id,
        organizationId(request),
        parsed.data,
      )
      return updated ? serialize(updated) : notFound(reply)
    } catch (error) {
      return handleError(error, reply)
    }
  })

  fastify.delete('/administrators/:id', { preHandler: canEdit }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const deleted = await administrators.delete(params.data.id, organizationId(request))
    return deleted ? reply.status(204).send() : notFound(reply)
  })
}
