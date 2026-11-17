// Rotas do envio pelo Gmail do usuário (login com Google, só gmail.send).
//
// GET    /integrations/google            — { available, connected, email }
// POST   /integrations/google/connect    — { returnTo } → { url } da tela do Google
// GET    /integrations/google/callback   — volta do Google (pública: quem é o
//                                           usuário vem no `state` assinado);
//                                           redireciona pro returnTo com
//                                           ?google=connected|denied|error
// DELETE /integrations/google            — desconecta (apaga e revoga o token)
// POST   /leads/:id/adhesion/email       — envia a ficha pra uma administradora
//                                           cadastrada, com os documentos
//
// Sem GOOGLE_CLIENT_ID/SECRET/TOKEN_ENCRYPTION_KEY o recurso fica desligado
// (available: false) e o front continua abrindo o e-mail do usuário.

import type {
  GmailUseCases,
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface GoogleMailRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  /** null = Google não configurado nesta API. */
  gmail: GmailUseCases | null
  /** Origens do front aceitas como volta (CORS_ORIGIN). */
  allowedReturnOrigins: readonly string[]
}

const connectSchema = z.object({ returnTo: z.string().url() })
const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().default(''),
  error: z.string().optional(),
})
const sendSchema = z.object({
  administratorId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
})
const idParams = z.object({ id: z.string().uuid() })

function unavailable(reply: FastifyReply) {
  return reply.status(503).send({
    error: 'Envio pelo Gmail não está configurado.',
    code: 'GMAIL_UNAVAILABLE',
    status: 503,
  })
}

/** Só volta pra um endereço do próprio front. */
export function isAllowedReturn(returnTo: string, origins: readonly string[]): boolean {
  try {
    return origins.includes(new URL(returnTo).origin)
  } catch {
    return false
  }
}

function withParam(url: string, value: string): string {
  const target = new URL(url)
  target.searchParams.set('google', value)
  return target.toString()
}

export const googleMailRoute: FastifyPluginAsync<GoogleMailRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const { gmail } = options

  function userId(request: { authIdentity?: { id: string } }): string {
    return (request.authIdentity as { id: string }).id
  }

  fastify.get('/integrations/google', { preHandler: [authMiddleware] }, async (request) => {
    if (!gmail) return { available: false, connected: false, email: null }
    const account = await gmail.status(userId(request))
    return {
      available: true,
      connected: account !== null,
      email: account?.googleEmail ?? null,
    }
  })

  fastify.post(
    '/integrations/google/connect',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!gmail) return unavailable(reply)
      const parsed = connectSchema.safeParse(request.body)
      if (!parsed.success || !isAllowedReturn(parsed.data.returnTo, options.allowedReturnOrigins)) {
        return reply
          .status(400)
          .send({ error: 'Endereço de volta inválido.', code: 'VALIDATION_ERROR', status: 400 })
      }
      return { url: gmail.connectUrl(userId(request), parsed.data.returnTo) }
    },
  )

  fastify.get('/integrations/google/callback', async (request, reply) => {
    if (!gmail) return unavailable(reply)
    const query = callbackQuery.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).type('text/plain').send('Volta do Google inválida.')
    }
    try {
      const result = await gmail.handleCallback({
        code: query.data.code ?? null,
        state: query.data.state,
        error: query.data.error ?? null,
      })
      if (!result || !isAllowedReturn(result.returnTo, options.allowedReturnOrigins)) {
        return reply
          .status(400)
          .type('text/plain')
          .send('Link de conexão vencido ou inválido. Volte ao SyloCRM e tente de novo.')
      }
      return reply.redirect(withParam(result.returnTo, result.connected ? 'connected' : 'denied'))
    } catch (error) {
      request.log.error({ err: error }, 'google: falha ao conectar a conta')
      // A volta exata vem no state; aqui usa a página de Configurações do front.
      const fallback = options.allowedReturnOrigins[0]
      if (!fallback) {
        return reply
          .status(500)
          .type('text/plain')
          .send('Não foi possível conectar a conta Google.')
      }
      return reply.redirect(withParam(`${fallback}/app/config`, 'error'))
    }
  })

  fastify.delete(
    '/integrations/google',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!gmail) return unavailable(reply)
      await gmail.disconnect(userId(request))
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/leads/:id/adhesion/email',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)],
    },
    async (request, reply) => {
      if (!gmail) return unavailable(reply)
      const params = idParams.safeParse(request.params)
      const parsed = sendSchema.safeParse(request.body)
      if (!params.success || !parsed.success) {
        return reply
          .status(400)
          .send({ error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400 })
      }
      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const result = await gmail.sendAdhesion({
          userId: context.userId,
          membership: context.currentMembership,
          leadId: params.data.id,
          ...parsed.data,
        })
        if (result.ok) return result
        if (result.reason === 'not_connected') {
          return reply.status(409).send({
            error: 'Conecte sua conta Google pra enviar pelo Gmail.',
            code: 'GMAIL_NOT_CONNECTED',
            status: 409,
          })
        }
        return reply.status(404).send({
          error:
            result.reason === 'lead_not_found'
              ? 'Lead não encontrado.'
              : 'Administradora não encontrada.',
          code: result.reason === 'lead_not_found' ? 'LEAD_NOT_FOUND' : 'ADMINISTRATOR_NOT_FOUND',
          status: 404,
        })
      } catch (error) {
        if (error instanceof ValidationError) {
          // A mensagem do primeiro problema já é a frase pro usuário.
          const message = error.issues[0]?.message ?? error.message
          return reply.status(400).send({ error: message, code: error.code, status: 400 })
        }
        throw error
      }
    },
  )
}
