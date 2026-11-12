// LeadChatPanel — aba Chat da ficha do lead: a conversa interna sobre o
// cliente (a mesma do Comercial, do ADM e do Pós-venda — ver ChatUseCases).
// Abrir a aba cria a conversa na primeira vez. "Mandar pra alguém" manda uma
// mensagem direta pra uma pessoa com o cliente anexado.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatThread } from '../../components/chat/ChatThread'
import { SendAboutClientModal } from '../../components/chat/SendAboutClientModal'
import { useClientConversation } from '../../hooks/useChat'
import styles from './LeadModal.module.css'

export function LeadChatPanel({
  organizationId,
  leadId,
  leadName,
}: {
  organizationId: string
  leadId: string
  leadName: string
}) {
  const conversation = useClientConversation(organizationId, leadId)
  const [sendingTo, setSendingTo] = useState(false)

  if (conversation.isLoading) return <Skeleton width="100%" height={320} />
  if (!conversation.data) {
    return <p className={styles.chatHint}>Não foi possível abrir a conversa deste cliente.</p>
  }
  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatTop}>
        <p className={styles.chatHint}>
          Conversa interna sobre o cliente, vista por vendas, ADM e pós-venda.{' '}
          <Link to={`/app/chat/${conversation.data.id}`}>Abrir no Chat</Link>
        </p>
        <button type="button" className={styles.chatSendTo} onClick={() => setSendingTo(true)}>
          Mandar pra alguém
        </button>
      </div>
      <ChatThread organizationId={organizationId} conversationId={conversation.data.id} compact />
      {sendingTo && (
        <SendAboutClientModal
          organizationId={organizationId}
          leadId={leadId}
          leadName={leadName}
          onClose={() => setSendingTo(false)}
        />
      )}
    </div>
  )
}
