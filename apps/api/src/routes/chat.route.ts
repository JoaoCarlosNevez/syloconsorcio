// Rotas do chat interno — conversas por cliente e diretas entre a equipe.
//
// GET  /chat/conversations                 — conversas que o usuário acompanha
// GET  /chat/unread                        — quantas têm mensagem não lida
// POST /chat/conversations/client          — abre (ou cria) a do cliente de um lead
// POST /chat/conversations/direct          — abre (ou cria) a direta com alguém
// GET  /chat/conversations/:id             — cabeçalho da conversa
// GET  /chat/conversations/:id/messages    — últimas 50; ?before= pagina pra trás
// POST /chat/conversations/:id/messages    — manda uma mensagem
// POST /chat/conversations/:id/read        — marca como lida
// POST /chat/conversations/:id/tasks       — cria uma tarefa pela conversa
// POST /chat/direct-messages               — mensagem direta pra alguém sobre um
//                                            cliente (vai pra conversa direta,
//                                            com o cliente anexado)
//
// Sem permissão nova: quem vê a conversa de um cliente é quem vê o lead
// (ChatUseCases). 404 tanto pra conversa inexistente quanto sem acesso.

import type {
  ChatConversationSummary,
  ChatMessageRecord,
  ChatUseCases,
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { MEMBER_SECTORS, type MemberSector, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface ChatRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  chat: ChatUseCases
}

const idParams = z.object({ id: z.string().uuid() })
const openClientSchema = z.object({ leadId: z.string().uuid() })
const openDirectSchema = z.object({ userId: z.string().uuid() })
const messagesQuery = z.object({ before: z.string().datetime().optional() })
const sendSchema = z.object({ body: z.string().min(1) })
const directAboutLeadSchema = z.object({
  userId: z.string().uuid(),
  leadId: z.string().uuid(),
  body: z.string().min(1),
})
const createTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  assignedSector: z
    .enum(MEMBER_SECTORS as [MemberSector, ...MemberSector[]])
    .nullable()
    .optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

function notFound(reply: FastifyReply) {
  return reply
    .status(404)
    .send({ error: 'Conversa não encontrada.', code: 'CONVERSATION_NOT_FOUND', status: 404 })
}

function invalid(reply: FastifyReply, details: Record<string, string[] | undefined>) {
  return reply
    .status(400)
    .send({ error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400, details })
}

function serializeSummary(summary: ChatConversationSummary) {
  const { conversation } = summary
  return {
    id: conversation.id,
    organizationId: conversation.organizationId,
    kind: conversation.kind,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    clientLead: summary.clientLead,
    otherUser: summary.otherUser,
    lastMessage: summary.lastMessage,
    unreadCount: summary.unreadCount,
  }
}

function serializeMessage(message: ChatMessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    kind: message.kind,
    body: message.body,
    author: message.author,
    createdAt: message.createdAt.toISOString(),
    task: message.task
      ? {
          ...message.task,
          dueAt: message.task.dueAt?.toISOString() ?? null,
          completedAt: message.task.completedAt?.toISOString() ?? null,
        }
      : null,
    lead: message.lead,
  }
}

function actor(request: FastifyRequest) {
  const context = request.authContext as NonNullable<typeof request.authContext>
  return { userId: context.userId, membership: context.currentMembership }
}

export const chatRoute: FastifyPluginAsync<ChatRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const preHandler = [authMiddleware, tenantMiddleware]
  const { chat } = options

  fastify.get('/chat/conversations', { preHandler }, async (request) => {
    const summaries = await chat.list(actor(request))
    return { items: summaries.map(serializeSummary) }
  })

  fastify.get('/chat/unread', { preHandler }, async (request) => {
    return { count: await chat.unreadCount(actor(request)) }
  })

  fastify.post('/chat/conversations/client', { preHandler }, async (request, reply) => {
    const parsed = openClientSchema.safeParse(request.body)
    if (!parsed.success) return invalid(reply, parsed.error.flatten().fieldErrors)
    const summary = await chat.openClient({ ...actor(request), leadId: parsed.data.leadId })
    if (!summary) {
      return reply
        .status(404)
        .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
    }
    return serializeSummary(summary)
  })

  fastify.post('/chat/conversations/direct', { preHandler }, async (request, reply) => {
    const parsed = openDirectSchema.safeParse(request.body)
    if (!parsed.success) return invalid(reply, parsed.error.flatten().fieldErrors)
    try {
      const summary = await chat.openDirect({ ...actor(request), otherUserId: parsed.data.userId })
      return serializeSummary(summary)
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
      }
      throw error
    }
  })

  fastify.get('/chat/conversations/:id', { preHandler }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const summary = await chat.summary({ ...actor(request), conversationId: params.data.id })
    return summary ? serializeSummary(summary) : notFound(reply)
  })

  fastify.get('/chat/conversations/:id/messages', { preHandler }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const query = messagesQuery.safeParse(request.query)
    if (!query.success) return invalid(reply, query.error.flatten().fieldErrors)
    const messages = await chat.messages({
      ...actor(request),
      conversationId: params.data.id,
      before: query.data.before ? new Date(query.data.before) : undefined,
    })
    return messages ? { items: messages.map(serializeMessage) } : notFound(reply)
  })

  fastify.post('/chat/conversations/:id/messages', { preHandler }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const parsed = sendSchema.safeParse(request.body)
    if (!parsed.success) return invalid(reply, parsed.error.flatten().fieldErrors)
    try {
      const message = await chat.send({
        ...actor(request),
        conversationId: params.data.id,
        body: parsed.data.body,
      })
      return message ? reply.status(201).send(serializeMessage(message)) : notFound(reply)
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
      }
      throw error
    }
  })

  fastify.post('/chat/conversations/:id/read', { preHandler }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const ok = await chat.markRead({ ...actor(request), conversationId: params.data.id })
    return ok ? reply.status(204).send() : notFound(reply)
  })

  fastify.post('/chat/conversations/:id/tasks', { preHandler }, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return notFound(reply)
    const parsed = createTaskSchema.safeParse(request.body)
    if (!parsed.success) return invalid(reply, parsed.error.flatten().fieldErrors)
    try {
      const message = await chat.createTaskFromChat({
        ...actor(request),
        conversationId: params.data.id,
        title: parsed.data.title,
        notes: parsed.data.notes,
        assignedUserId: parsed.data.assignedUserId,
        assignedSector: parsed.data.assignedSector,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      })
      return message ? reply.status(201).send(serializeMessage(message)) : notFound(reply)
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
      }
      throw error
    }
  })

  fastify.post('/chat/direct-messages', { preHandler }, async (request, reply) => {
    const parsed = directAboutLeadSchema.safeParse(request.body)
    if (!parsed.success) return invalid(reply, parsed.error.flatten().fieldErrors)
    try {
      const result = await chat.sendDirectAboutLead({
        ...actor(request),
        otherUserId: parsed.data.userId,
        leadId: parsed.data.leadId,
        body: parsed.data.body,
      })
      if (!result) {
        return reply
          .status(404)
          .send({ error: 'Lead não encontrado.', code: 'LEAD_NOT_FOUND', status: 404 })
      }
      return reply.status(201).send({
        conversationId: result.conversationId,
        message: serializeMessage(result.message),
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, code: error.code, status: 400 })
      }
      throw error
    }
  })
}
