// Chat no celular: as conversas que a pessoa acompanha (clientes e diretas) e
// "Nova conversa" com alguém da equipe. A conversa de um cliente começa pelo
// botão "Chat do cliente" na ficha do lead.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConversations, useOpenDirectConversation } from '../../hooks/useChat'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import { conversationPreview, conversationTitle } from '../../lib/chat-api'
import styles from './Mobile.module.css'
import { Sheet, useToast } from './MobileUi'

function shortTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function MobileChatPage() {
  const navigate = useNavigate()
  const { organizationId } = useActiveOrganization()
  const { data: currentUser } = useCurrentUser()
  const conversations = useConversations(organizationId)
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const openDirect = useOpenDirectConversation(organizationId)
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const items = conversations.data?.items ?? []
  const people = (teamData?.members ?? []).filter(
    (member) => member.status === 'ACTIVE' && member.userId !== currentUser?.id,
  )

  return (
    <main className={styles.content}>
      <div className={styles.top}>
        <h1 className={styles.title}>Chat</h1>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
          onClick={() => setPicking(true)}
        >
          Nova conversa
        </button>
      </div>

      {conversations.isLoading ? (
        <div className={`${styles.card} ${styles.list}`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          Nenhuma conversa ainda. Abra a de um cliente pela ficha do lead, ou comece uma com alguém
          da equipe.
        </p>
      ) : (
        <div className={`${styles.card} ${styles.list}`}>
          {items.map((item) => (
            <Link key={item.id} to={`/m/chat/${item.id}`} className={styles.row}>
              <span className={styles.grow}>
                <span className={styles.rowTitle}>
                  {item.kind === 'client' ? '' : '@ '}
                  {conversationTitle(item)}
                </span>
                <span
                  className={`${styles.rowSub} ${item.unreadCount > 0 ? styles.rowSubStrong : ''}`}
                >
                  {conversationPreview(item)}
                </span>
              </span>
              <span className={styles.chatMeta}>
                <span className={styles.time}>{shortTime(item.lastMessageAt)}</span>
                {item.unreadCount > 0 && (
                  <span className={styles.chatUnread}>{item.unreadCount}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}

      {picking && (
        <Sheet onClose={() => setPicking(false)}>
          <h2 className={styles.sectionTitle}>Conversar com</h2>
          <div className={`${styles.card} ${styles.list}`}>
            {people.map((member) => (
              <button
                key={member.userId}
                type="button"
                className={styles.row}
                disabled={openDirect.isPending}
                onClick={() =>
                  openDirect.mutate(member.userId, {
                    onSuccess: (conversation) => navigate(`/m/chat/${conversation.id}`),
                    onError: () => toast.show('Não foi possível abrir a conversa'),
                  })
                }
              >
                <span className={styles.rowTitle}>{member.name ?? member.email}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {toast.node}
    </main>
  )
}
