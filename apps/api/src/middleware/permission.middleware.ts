// requirePermission — preHandler que verifica se a Membership ativa possui
// uma Permission específica.
//
// Deve rodar DEPOIS do tenantMiddleware (depende de request.authContext).
//
// Erro:
//   403 — permission ausente (PERMISSION_DENIED)

import type { Permission } from '@sylocrm/domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'

export function requirePermission(permission: Permission) {
  return async function permissionMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const context = request.authContext
    if (!context) {
      return reply.status(401).send({
        error:
          'Contexto de organização não resolvido. tenantMiddleware deve preceder requirePermission.',
        code: AuthErrorCode.TOKEN_MISSING,
        status: 401,
      })
    }

    if (!context.currentMembership.permissions.includes(permission)) {
      return reply.status(403).send({
        error: `Ação não autorizada. Permissão necessária: ${permission}.`,
        code: AuthErrorCode.PERMISSION_DENIED,
        status: 403,
      })
    }
  }
}
