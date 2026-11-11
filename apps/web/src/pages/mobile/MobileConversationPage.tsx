// Uma conversa do chat no celular — o mesmo ChatThread do computador, ocupando
// a tela entre o cabeçalho e a barra de abas. O push de mensagem abre aqui.

import { Skeleton } from '@sylocrm/ui'
import { Link, useParams } from 'react-router-dom'
import { ChatThread } from '../../components/chat/ChatThread'
import { useConversation } from '../../hooks/useChat'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { conversationTitle } from '../../lib/chat-api'
import styles from './Mobile.module.css'
import { BackBar } from './MobileUi'

export function MobileConversationPage() {
  const { conversationId = '' } = useParams<{ conversationId: string }>()
  const { organizationId } = useActiveOrganization()
  const conversation = useConversation(organizationId, conversationId)

  return (
    <main className={styles.chatScreen}>
      <div className={styles.chatHeader}>
        <BackBar label="Conversas" fallback="/m/chat" />
        {conversation.data ? (
          <div className={styles.chatTitles}>
            <span className={styles.rowTitle}>{conversationTitle(conversation.data)}</span>
            {conversation.data.kind === 'client' && conversation.data.clientLead ? (
              <Link to={`/m/leads/${conversation.data.clientLead.id}`} className={styles.chatLink}>
                Ver ficha do cliente
              </Link>
            ) : (
              <span className={styles.rowSub}>Conversa direta</span>
            )}
          </div>
        ) : conversation.isError ? (
          <span className={styles.rowTitle}>Conversa não encontrada</span>
        ) : (
          <Skeleton width={160} height={18} />
        )}
      </div>
      {organizationId && !conversation.isError && (
        <div className={styles.chatBody}>
          <ChatThread organizationId={organizationId} conversationId={conversationId} />
        </div>
      )}
    </main>
  )
}
