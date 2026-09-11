// Rotas de autenticação.
//
// POST /auth/logout — invalida a sessão do usuário autenticado
// GET  /auth/me     — retorna a identidade do usuário autenticado
//
// Ambas requerem authMiddleware (Bearer token válido).
// Nenhuma requer tenantMiddleware (não dependem de contexto organizacional).
//
// Login acontece diretamente no Supabase via SDK no frontend (ADR-13).

import type { IAuthProvider } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import { createAuthMiddleware } from '../middleware/auth.middleware'

interface AuthRouteOptions {
  authProvider: IAuthProvider
}

export const authRoute: FastifyPluginAsync<AuthRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)

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
