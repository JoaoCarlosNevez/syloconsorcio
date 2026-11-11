// useChat — server state do chat interno via TanStack Query (ADR-04).
//
// Sem websocket: a conversa aberta consulta a cada poucos segundos, a lista e o
// contador do menu num ritmo mais calmo. O push avisa quando o app está fechado.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ChatConversation,
  type CreateChatTaskPayload,
  createChatTask,
  getChatUnread,
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  openClientConversation,
  openDirectConversation,
  sendMessage,
} from '../lib/chat-api'

/** Conversa aberta na tela. */
const OPEN_CONVERSATION_REFETCH_MS = 4_000
/** Lista de conversas e contador do menu. */
const LIST_REFETCH_MS = 20_000

export function useChatUnread(organizationId: string | null) {
  return useQuery({
    queryKey: ['chat', organizationId, 'unread'],
    queryFn: () => getChatUnread(organizationId as string),
    enabled: Boolean(organizationId),
    refetchInterval: LIST_REFETCH_MS,
  })
}

export function useConversations(organizationId: string | null) {
  return useQuery({
    queryKey: ['chat', organizationId, 'conversations'],
    queryFn: () => listConversations(organizationId as string),
    enabled: Boolean(organizationId),
    refetchInterval: LIST_REFETCH_MS,
  })
}

export function useConversation(organizationId: string | null, conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', organizationId, 'conversation', conversationId],
    queryFn: () => getConversation(organizationId as string, conversationId as string),
    enabled: Boolean(organizationId && conversationId),
  })
}

export function useChatMessages(organizationId: string | null, conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', organizationId, 'messages', conversationId],
    queryFn: () => listMessages(organizationId as string, conversationId as string),
    enabled: Boolean(organizationId && conversationId),
    refetchInterval: OPEN_CONVERSATION_REFETCH_MS,
  })
}

/** A conversa do cliente de um lead (cria na primeira vez que alguém abre). */
export function useClientConversation(organizationId: string | null, leadId: string | null) {
  return useQuery({
    queryKey: ['chat', organizationId, 'client', leadId],
    queryFn: () => openClientConversation(organizationId as string, leadId as string),
    enabled: Boolean(organizationId && leadId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

/** Abre a conversa do cliente de um lead pela ação do usuário (botão). */
export function useOpenClientConversation(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) => openClientConversation(organizationId as string, leadId),
    onSuccess: (conversation: ChatConversation) => {
      queryClient.setQueryData(
        ['chat', organizationId, 'conversation', conversation.id],
        conversation,
      )
    },
  })
}

export function useOpenDirectConversation(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => openDirectConversation(organizationId as string, userId),
    onSuccess: (conversation: ChatConversation) => {
      queryClient.setQueryData(
        ['chat', organizationId, 'conversation', conversation.id],
        conversation,
      )
    },
  })
}

function useInvalidateConversation(organizationId: string | null) {
  const queryClient = useQueryClient()
  return (conversationId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['chat', organizationId, 'messages', conversationId],
    })
    queryClient.invalidateQueries({ queryKey: ['chat', organizationId, 'conversations'] })
    queryClient.invalidateQueries({ queryKey: ['chat', organizationId, 'unread'] })
  }
}

export function useSendMessage(organizationId: string | null, conversationId: string | null) {
  const invalidate = useInvalidateConversation(organizationId)
  return useMutation({
    mutationFn: (body: string) =>
      sendMessage(organizationId as string, conversationId as string, body),
    onSuccess: () => {
      if (conversationId) invalidate(conversationId)
    },
  })
}

export function useMarkConversationRead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      markConversationRead(organizationId as string, conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', organizationId, 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['chat', organizationId, 'unread'] })
    },
  })
}

export function useCreateChatTask(organizationId: string | null, conversationId: string | null) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateConversation(organizationId)
  return useMutation({
    mutationFn: (payload: CreateChatTaskPayload) =>
      createChatTask(organizationId as string, conversationId as string, payload),
    onSuccess: () => {
      if (conversationId) invalidate(conversationId)
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
    },
  })
}
