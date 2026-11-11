// ChatPage — chat interno entre vendas, ADM e pós-venda (/app/chat).
//
// À esquerda as conversas que o usuário acompanha (clientes e diretas, as com
// mensagem nova primeiro pelo horário); à direita a conversa aberta. "Nova
// conversa" abre uma direta com alguém da equipe; a conversa de um cliente
// nasce na aba Chat da ficha do lead.

import { Avatar, Skeleton, useToast } from '@sylocrm/ui'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChatThread } from '../../components/chat/ChatThread'
import { AppLayout } from '../../components/layout/AppLayout'
import { useConversation, useConversations, useOpenDirectConversation } from '../../hooks/useChat'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import { type ChatConversation, conversationPreview, conversationTitle } from '../../lib/chat-api'
import styles from './ChatPage.module.css'

type Filter = 'todas' | 'client' | 'direct'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'client', label: 'Clientes' },
  { key: 'direct', label: 'Diretas' },
]

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function shortTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ConversationAvatar({ conversation }: { conversation: ChatConversation }) {
  const title = conversationTitle(conversation)
  if (conversation.kind === 'direct') {
    return (
      <Avatar
        src={conversation.otherUser?.avatarUrl ?? undefined}
        initials={initials(title)}
        size="sm"
      />
    )
  }
  return (
    <span className={styles.clientAvatar} aria-hidden="true">
      {initials(title)}
    </span>
  )
}

function NewConversationMenu({
  organizationId,
  onOpened,
}: {
  organizationId: string
  onOpened: (conversationId: string) => void
}) {
  const { toast } = useToast()
  const { data: currentUser } = useCurrentUser()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const openDirect = useOpenDirectConversation(organizationId)
  const [open, setOpen] = useState(false)
  const people = (teamData?.members ?? []).filter(
    (member) => member.status === 'ACTIVE' && member.userId !== currentUser?.id,
  )

  return (
    <div className={styles.newWrap}>
      <button type="button" className={styles.newButton} onClick={() => setOpen((v) => !v)}>
        Nova conversa
      </button>
      {open && (
        <div className={styles.newMenu} role="menu">
          {people.length === 0 && <span className={styles.newEmpty}>Ninguém na equipe ainda.</span>}
          {people.map((member) => {
            const name = member.name ?? member.email
            return (
              <button
                key={member.userId}
                type="button"
                role="menuitem"
                className={styles.newItem}
                disabled={openDirect.isPending}
                onClick={() =>
                  openDirect.mutate(member.userId, {
                    onSuccess: (conversation) => {
                      setOpen(false)
                      onOpened(conversation.id)
                    },
                    onError: (error) =>
                      toast({
                        type: 'error',
                        title: 'Não foi possível abrir a conversa',
                        description: error instanceof Error ? error.message : undefined,
                      }),
                  })
                }
              >
                <Avatar src={member.avatarUrl ?? undefined} initials={initials(name)} size="sm" />
                <span>{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChatPage() {
  const { conversationId = null } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { organizationId } = useActiveOrganization()
  const conversations = useConversations(organizationId)
  const opened = useConversation(organizationId, conversationId)
  const [filter, setFilter] = useState<Filter>('todas')

  const items = useMemo(() => {
    const all = conversations.data?.items ?? []
    return filter === 'todas' ? all : all.filter((item) => item.kind === filter)
  }, [conversations.data, filter])

  const current =
    conversations.data?.items.find((item) => item.id === conversationId) ?? opened.data ?? null

  return (
    <AppLayout>
      <div className={`${styles.page} ${conversationId ? styles.hasOpen : ''}`}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.title}>Chat</h1>
            {organizationId && (
              <NewConversationMenu
                organizationId={organizationId}
                onOpened={(id) => navigate(`/app/chat/${id}`)}
              />
            )}
          </div>
          <div className={styles.filters} role="tablist">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={filter === option.key}
                className={`${styles.filter} ${filter === option.key ? styles.filterActive : ''}`}
                onClick={() => setFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            {conversations.isLoading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.item}>
                  <Skeleton width="100%" height={44} />
                </div>
              ))
            ) : items.length === 0 ? (
              <p className={styles.listEmpty}>
                {filter === 'direct'
                  ? 'Nenhuma conversa direta. Use "Nova conversa".'
                  : 'As conversas dos clientes começam na aba Chat da ficha do lead.'}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.item} ${item.id === conversationId ? styles.itemActive : ''}`}
                  onClick={() => navigate(`/app/chat/${item.id}`)}
                >
                  <ConversationAvatar conversation={item} />
                  <span className={styles.itemBody}>
                    <span className={styles.itemTop}>
                      <span className={styles.itemTitle}>{conversationTitle(item)}</span>
                      <span className={styles.itemTime}>{shortTime(item.lastMessageAt)}</span>
                    </span>
                    <span className={styles.itemBottom}>
                      <span
                        className={`${styles.itemPreview} ${item.unreadCount > 0 ? styles.itemPreviewUnread : ''}`}
                      >
                        {conversationPreview(item)}
                      </span>
                      {item.unreadCount > 0 && (
                        <span className={styles.unread}>{item.unreadCount}</span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={styles.main}>
          {conversationId && organizationId ? (
            <>
              <header className={styles.mainHeader}>
                <button
                  type="button"
                  className={styles.back}
                  onClick={() => navigate('/app/chat')}
                  aria-label="Voltar pras conversas"
                >
                  ←
                </button>
                {current ? (
                  <div className={styles.mainTitles}>
                    <span className={styles.mainTitle}>{conversationTitle(current)}</span>
                    <span className={styles.mainSubtitle}>
                      {current.kind === 'client' ? (
                        current.clientLead ? (
                          <Link
                            to="/app/kanban"
                            state={{
                              openLeadId: current.clientLead.id,
                              funnelId: current.clientLead.funnelId,
                            }}
                          >
                            Conversa do cliente · abrir ficha
                          </Link>
                        ) : (
                          'Conversa do cliente'
                        )
                      ) : (
                        'Conversa direta'
                      )}
                    </span>
                  </div>
                ) : opened.isError ? (
                  <span className={styles.mainTitle}>Conversa não encontrada</span>
                ) : (
                  <Skeleton width={180} height={20} />
                )}
              </header>
              {!opened.isError && (
                <ChatThread organizationId={organizationId} conversationId={conversationId} />
              )}
            </>
          ) : (
            <div className={styles.placeholder}>
              <strong>Escolha uma conversa</strong>
              <span>
                Fale com vendas, ADM e pós-venda sobre um cliente, ou peça uma checagem com "Pedir
                tarefa".
              </span>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
