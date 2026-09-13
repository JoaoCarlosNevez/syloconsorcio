// Rotas de autenticação.
//
// POST /auth/logout      — invalida a sessão do usuário autenticado
// GET  /auth/me          — retorna a identidade do usuário autenticado
// GET  /auth/memberships — lista as organizações às quais o usuário pertence
// GET  /auth/context     — resolve o contexto multi-tenant para a organização ativa
//
// Todas requerem authMiddleware (Bearer token válido).
// Apenas /auth/context requer tenantMiddleware — as demais não dependem de
// um X-Organization-Id já escolhido (o frontend usa /auth/memberships
// justamente para decidir qual organização selecionar).
//
// Login acontece diretamente no Supabase via SDK no frontend (ADR-13).

import type { IAuthProvider, IMembershipRepository } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import { buildMembershipContext } from '../auth/membership-context'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface AuthRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
}

export const authRoute: FastifyPluginAsync<AuthRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(options.membershipRepository)

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  // Retorna a identidade do usuário autenticado.
  // Usado pelo frontend para verificar se a sessão ainda é válida no carregamento.
  fastify.get(
    '/auth/me',
    {
      preHandler: [authMiddleware],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['id', 'email'],
          },
        },
      },
    },
    async (request) => {
      // authMiddleware garante que authIdentity está presente
      const identity = request.authIdentity
      return { id: identity?.id, email: identity?.email }
    },
  )

  // ── GET /auth/memberships ─────────────────────────────────────────────────
  // Lista todas as organizações ativas do usuário, com role/dataScope/permissions
  // já calculados. O frontend usa isto para montar o seletor de organização
  // (ou auto-selecionar quando há apenas uma) antes de enviar X-Organization-Id.
  fastify.get('/auth/memberships', { preHandler: [authMiddleware] }, async (request) => {
    // authMiddleware garante que authIdentity está presente
    const identity = request.authIdentity
    const memberships = await options.membershipRepository.findActiveByUserId(identity?.id ?? '')
    return { memberships: memberships.map(buildMembershipContext) }
  })

  // ── GET /auth/context ─────────────────────────────────────────────────────
  // Resolve o AuthenticatedContext completo (membership ativa + disponíveis)
  // para a organização informada em X-Organization-Id.
  fastify.get(
    '/auth/context',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => request.authContext,
  )

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  // Invalida a sessão no Supabase Auth (server-side).
  // O frontend também deve chamar supabase.auth.signOut() (client-side).
  fastify.post(
    '/auth/logout',
    {
      preHandler: [authMiddleware],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization
      const token = authHeader?.slice(7) ?? ''

      try {
        await options.authProvider.signOut(token)
      } catch {
        // Log do erro mas não expor ao cliente — sessão local já foi limpa
        request.log.warn({ userId: request.authIdentity?.id }, 'server-side signOut failed')
      }

      return reply.status(200).send({ message: 'Logout realizado com sucesso.' })
    },
  )
}
