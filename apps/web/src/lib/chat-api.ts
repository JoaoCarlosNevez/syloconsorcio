// Tipos e chamadas HTTP do chat interno.
// Espelha apps/api/src/routes/chat.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'
import type { Sector } from './sectors'
import type { TaskStatus } from './tasks-api'

export interface ChatUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export interface ChatConversation {
  id: string
  organizationId: string
  kind: 'client' | 'direct'
  lastMessageAt: string | null
  /** Lead mais recente do cliente — título e link pra ficha. */
  clientLead: { id: string; name: string; funnelId: string } | null
  /** A outra pessoa da conversa direta. */
  otherUser: ChatUser | null
  lastMessage: { body: string; kind: 'text' | 'task'; authorName: string | null } | null
  unreadCount: number
}

export interface ChatMessageTask {
  id: string
  title: string
  status: TaskStatus
  assignedUserId: string | null
  assignedSector: Sector | null
  dueAt: string | null
  completedAt: string | null
}

export interface ChatMessage {
  id: string
  conversationId: string
  kind: 'text' | 'task'
  body: string
  author: ChatUser | null
  /** Estado atual da tarefa (só em 'task'; null se foi apagada). */
  task: ChatMessageTask | null
  /** Cliente anexado (mensagem mandada de dentro da ficha). */
  lead: { id: string; name: string; funnelId: string } | null
  createdAt: string
}

export interface CreateChatTaskPayload {
  title: string
  notes?: string | null
  assignedUserId?: string | null
  assignedSector?: Sector | null
  dueAt?: string | null
}

export function listConversations(organizationId: string): Promise<{ items: ChatConversation[] }> {
  return apiClient.get('/chat/conversations', { organizationId })
}

export function getChatUnread(organizationId: string): Promise<{ count: number }> {
  return apiClient.get('/chat/unread', { organizationId })
}

export function getConversation(organizationId: string, id: string): Promise<ChatConversation> {
  return apiClient.get(`/chat/conversations/${id}`, { organizationId })
}

export function openClientConversation(
  organizationId: string,
  leadId: string,
): Promise<ChatConversation> {
  return apiClient.post('/chat/conversations/client', { leadId }, { organizationId })
}

export function openDirectConversation(
  organizationId: string,
  userId: string,
): Promise<ChatConversation> {
  return apiClient.post('/chat/conversations/direct', { userId }, { organizationId })
}

export function listMessages(
  organizationId: string,
  conversationId: string,
): Promise<{ items: ChatMessage[] }> {
  return apiClient.get(`/chat/conversations/${conversationId}/messages`, { organizationId })
}

export function sendMessage(
  organizationId: string,
  conversationId: string,
  body: string,
): Promise<ChatMessage> {
  return apiClient.post(
    `/chat/conversations/${conversationId}/messages`,
    { body },
    { organizationId },
  )
}

export function markConversationRead(
  organizationId: string,
  conversationId: string,
): Promise<void> {
  return apiClient.post(`/chat/conversations/${conversationId}/read`, {}, { organizationId })
}

export function createChatTask(
  organizationId: string,
  conversationId: string,
  payload: CreateChatTaskPayload,
): Promise<ChatMessage> {
  return apiClient.post(`/chat/conversations/${conversationId}/tasks`, payload, { organizationId })
}

/** Mensagem direta pra alguém sobre um cliente (vai pra conversa direta). */
export function sendDirectAboutLead(
  organizationId: string,
  payload: { userId: string; leadId: string; body: string },
): Promise<{ conversationId: string; message: ChatMessage }> {
  return apiClient.post('/chat/direct-messages', payload, { organizationId })
}

/** Nome que aparece na lista e no cabeçalho. */
export function conversationTitle(conversation: ChatConversation): string {
  if (conversation.kind === 'client') return conversation.clientLead?.name ?? 'Cliente'
  return conversation.otherUser?.name ?? conversation.otherUser?.email ?? 'Conversa'
}

/** Linha de prévia da lista ("Ana: falta o RG", "Tarefa: Conferir RG"). */
export function conversationPreview(conversation: ChatConversation): string {
  const last = conversation.lastMessage
  if (!last) return 'Sem mensagens ainda'
  const text = last.kind === 'task' ? `Tarefa: ${last.body}` : last.body
  return last.authorName ? `${last.authorName.split(' ')[0]}: ${text}` : text
}
