// Fastify request type augmentation.
//
// Declara as propriedades injetadas pelos middlewares de auth:
//   authIdentity  — injetado pelo authMiddleware após verificação do token
//   authContext   — injetado pelo tenantMiddleware após resolução de membership
//
// Ambas são undefined antes dos respectivos middlewares executarem.

import type { AuthIdentity, AuthenticatedContext } from '@sylocrm/application'

declare module 'fastify' {
  interface FastifyRequest {
    authIdentity: AuthIdentity | undefined
    authContext: AuthenticatedContext | undefined
  }
}
