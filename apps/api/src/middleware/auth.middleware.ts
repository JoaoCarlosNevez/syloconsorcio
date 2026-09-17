// authMiddleware — verifica Bearer token e injeta AuthIdentity no request.
//
// Pipeline: authMiddleware → tenantMiddleware → Use Case
//
// ADR-06 (seção 5):
//   - Verifica Authorization: Bearer <token>
//   - Retorna 401 se token ausente (AUTH_TOKEN_MISSING)
//   - Retorna 401 se token inválido/expirado (AUTH_TOKEN_INVALID)
//   - Injeta request.authIdentity se token válido
//
// Factory pattern: recebe IAuthProvider via DI — testável com mocks.

import type { IAuthProvider } from '@sylocrm/application'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'

/**
 * Cria o preHandler de autenticação com o provider injetado.
 *
 * @example
 * // Em app.ts (composition root):
 * const authHandler = createAuthMiddleware(supabaseAuthAdapter)
 * fastify.addHook('preHandler', authHandler)  // ou por rota
 */
export function createAuthMiddleware(authProvider: IAuthProvider) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Token não fornecido.',
        code: AuthErrorCode.TOKEN_MISSING,
        status: 401,
      })
    }

    const token = authHeader.slice(7) // remove 'Bearer '

    const identity = await authProvider.verifyToken(token)

    if (!identity) {
      return reply.status(401).send({
        error: 'Token inválido ou expirado.',
        code: AuthErrorCode.TOKEN_INVALID,
        status: 401,
      })
    }

    request.authIdentity = identity
  }
}
