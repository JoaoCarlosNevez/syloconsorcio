// requirePlatformAdmin — preHandler que exige a flag isPlatformAdmin no
// usuário autenticado (Super Admin da plataforma).
//
// Deve rodar DEPOIS do authMiddleware (depende de request.authIdentity).
// Diferente de tenantMiddleware/requirePermission: não é sobre uma
// organização específica — é uma capacidade de nível plataforma, hoje usada
// só para criar novas Representações (tenants).
//
// Erro:
//   403 — usuário autenticado mas sem a flag (PERMISSION_DENIED)

import type { IUserRepository } from '@sylocrm/application'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'

export function requirePlatformAdmin(userRepository: IUserRepository) {
  return async function platformAdminMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const identity = request.authIdentity
    if (!identity) {
      return reply.status(401).send({
        error: 'Identidade não resolvida. authMiddleware deve preceder requirePlatformAdmin.',
        code: AuthErrorCode.TOKEN_MISSING,
        status: 401,
      })
    }

    const user = await userRepository.findById(identity.id)
    if (!user?.isPlatformAdmin) {
      return reply.status(403).send({
        error: 'Ação restrita ao Super Admin da plataforma.',
        code: AuthErrorCode.PERMISSION_DENIED,
        status: 403,
      })
    }
  }
}
