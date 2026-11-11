// IChatRepository — port do chat interno (conversas, participantes, mensagens).
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Quem pode ver uma conversa NÃO é decidido aqui — os use cases checam (a do
// cliente segue a visibilidade dos leads; a direta, os dois participantes).

export type ChatConversationKind = 'client' | 'direct'
export type ChatMessageKind = 'text' | 'task'

export interface ChatConversationRecord {
  id: string
  organizationId: string
  kind: ChatConversationKind
  /** Chave do cliente (coalesce(leads.client_id, leads.id)); só em 'client'. */
  clientId: string | null
  /** "<userA>:<userB>" em ordem; só em 'direct'. */
  directKey: string | null
  lastMessageAt: Date | null
  createdAt: Date
}

/** Um lead do cliente — o mesmo cliente pode estar no Comercial, no ADM e no
 * Pós-venda (cópias do Ganho), e ter uma cópia por cota. */
export interface ChatClientLead {
  id: string
  organizationId: string
  name: string
  assignedUserId: string | null
  funnelId: string
  funnelKind: string
  createdAt: Date
}

export interface ChatUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

/** Estado atual da tarefa criada pela conversa (o card acompanha). */
export interface ChatMessageTask {
  id: string
  title: string
  status: 'pendente' | 'em_andamento' | 'concluida'
  assignedUserId: string | null
  assignedSector: string | null
  dueAt: Date | null
  completedAt: Date | null
}

export interface ChatMessageRecord {
  id: string
  conversationId: string
  kind: ChatMessageKind
  body: string
  author: ChatUser | null
  /** Só em 'task'; null se a tarefa foi apagada. */
  task: ChatMessageTask | null
  createdAt: Date
}

export interface ChatConversationSummary {
  conversation: ChatConversationRecord
  /** Lead mais recente do cliente (título e link pra ficha); só em 'client'. */
  clientLead: { id: string; name: string; funnelId: string } | null
  /** A outra pessoa; só em 'direct'. */
  otherUser: ChatUser | null
  lastMessage: { body: string; kind: ChatMessageKind; authorName: string | null } | null
  unreadCount: number
}

export interface NewChatMessage {
  conversationId: string
  authorUserId: string
  kind: ChatMessageKind
  body: string
  taskId?: string | null
}

export interface IChatRepository {
  /** Cria na primeira vez (seguro contra corrida: a chave é única). */
  findOrCreateClientConversation(
    organizationId: string,
    clientId: string,
  ): Promise<ChatConversationRecord>

  findOrCreateDirectConversation(
    organizationId: string,
    directKey: string,
  ): Promise<ChatConversationRecord>

  findById(id: string): Promise<ChatConversationRecord | null>

  /** Leads do cliente na organização, mais recentes primeiro. */
  listClientLeads(organizationId: string, clientId: string): Promise<ChatClientLead[]>

  /** Conversas que o usuário acompanha na organização, mais recentes primeiro. */
  listForUser(userId: string, organizationId: string): Promise<ChatConversationSummary[]>

  /** Um resumo só (cabeçalho da conversa aberta). */
  summarize(conversationId: string, userId: string): Promise<ChatConversationSummary | null>

  /** Mais antigas primeiro; `before` pagina pra trás. */
  listMessages(
    conversationId: string,
    options: { limit: number; before?: Date },
  ): Promise<ChatMessageRecord[]>

  addMessage(message: NewChatMessage): Promise<ChatMessageRecord>

  isParticipant(conversationId: string, userId: string): Promise<boolean>

  listParticipantIds(conversationId: string): Promise<string[]>

  /** Ignora quem já participa. */
  addParticipants(conversationId: string, userIds: readonly string[]): Promise<void>

  /** Marca lida até `at` (e entra como participante se ainda não era). */
  markRead(conversationId: string, userId: string, at: Date): Promise<void>

  /** Quantas conversas têm mensagem não lida pro usuário na organização. */
  countUnreadConversations(userId: string, organizationId: string): Promise<number>
}
