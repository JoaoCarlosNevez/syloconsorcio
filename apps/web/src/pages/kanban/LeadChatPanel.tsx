// LeadChatPanel — aba Chat da ficha do lead: a conversa interna sobre o
// cliente (a mesma do Comercial, do ADM e do Pós-venda — ver ChatUseCases).
// Abrir a aba cria a conversa na primeira vez.

import { Skeleton } from '@sylocrm/ui'
import { Link } from 'react-router-dom'
import { ChatThread } from '../../components/chat/ChatThread'
import { useClientConversation } from '../../hooks/useChat'
import styles from './LeadModal.module.css'

export function LeadChatPanel({
  organizationId,
  leadId,
}: {
  organizationId: string
  leadId: string
}) {
  const conversation = useClientConversation(organizationId, leadId)

  if (conversation.isLoading) return <Skeleton width="100%" height={320} />
  if (!conversation.data) {
    return <p className={styles.chatHint}>Não foi possível abrir a conversa deste cliente.</p>
  }
  return (
    <div className={styles.chatPanel}>
      <p className={styles.chatHint}>
        Conversa interna sobre o cliente, vista por vendas, ADM e pós-venda.{' '}
        <Link to={`/app/chat/${conversation.data.id}`}>Abrir no Chat</Link>
      </p>
      <ChatThread organizationId={organizationId} conversationId={conversation.data.id} compact />
    </div>
  )
}
