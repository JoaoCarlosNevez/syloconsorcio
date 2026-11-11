// ChatThread — uma conversa do chat interno: mensagens, cards de tarefa e a
// caixa de escrever. Usado na tela Chat e na aba Chat da ficha do lead.
//
// Enter manda, Shift+Enter quebra linha. "Pedir tarefa" abre o ChatTaskModal.
// Marca como lida ao abrir e sempre que chega mensagem nova.

import { Avatar, Skeleton, useToast } from '@sylocrm/ui'
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useChatMessages, useMarkConversationRead, useSendMessage } from '../../hooks/useChat'
import { useChatTaskActions } from '../../hooks/useChatTaskActions'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type { ChatMessage, ChatMessageTask } from '../../lib/chat-api'
import { SECTOR_LABEL } from '../../lib/sectors'
import type { TeamMember } from '../../lib/team-api'
import { ChatTaskModal } from './ChatTaskModal'
import styles from './ChatThread.module.css'

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function personName(userId: string | null, members: TeamMember[], currentUserId?: string) {
  if (!userId) return null
  if (userId === currentUserId) return 'você'
  const member = members.find((m) => m.userId === userId)
  return member?.name ?? member?.email ?? 'alguém'
}

const STATUS_LABEL: Record<ChatMessageTask['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

function TaskCard({
  task,
  members,
  currentUserId,
  onClaim,
  onComplete,
  busy,
}: {
  task: ChatMessageTask
  members: TeamMember[]
  currentUserId?: string
  onClaim: () => void
  onComplete: () => void
  busy: boolean
}) {
  const done = task.status === 'concluida'
  const queued = task.assignedUserId === null
  const assignee = queued
    ? `Fila ${task.assignedSector ? SECTOR_LABEL[task.assignedSector] : ''}`.trim()
    : personName(task.assignedUserId, members, currentUserId)
  const due = task.dueAt
    ? new Date(task.dueAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sem prazo'
  return (
    <div className={`${styles.taskCard} ${done ? styles.taskCardDone : ''}`}>
      <div className={styles.taskHead}>
        <TaskIcon />
        <span className={styles.taskLabel}>Tarefa</span>
        <span className={`${styles.taskStatus} ${done ? styles.taskStatusDone : ''}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>
      <div className={styles.taskTitle}>{task.title}</div>
      <div className={styles.taskMeta}>
        Para {assignee} · {due}
      </div>
      {!done && (queued || task.assignedUserId === currentUserId) && (
        <div className={styles.taskActions}>
          {queued ? (
            <button type="button" className={styles.taskButton} onClick={onClaim} disabled={busy}>
              Pegar
            </button>
          ) : (
            <button
              type="button"
              className={styles.taskButton}
              onClick={onComplete}
              disabled={busy}
            >
              Concluir
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export interface ChatThreadProps {
  organizationId: string
  conversationId: string
  /** Mais baixo, sem bordas — dentro da ficha do lead. */
  compact?: boolean
}

export function ChatThread({ organizationId, conversationId, compact = false }: ChatThreadProps) {
  const { toast } = useToast()
  const { data: currentUser } = useCurrentUser()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = useMemo(
    () => (teamData?.members ?? []).filter((member) => member.status === 'ACTIVE'),
    [teamData],
  )
  const messages = useChatMessages(organizationId, conversationId)
  const send = useSendMessage(organizationId, conversationId)
  const markRead = useMarkConversationRead(organizationId)
  const taskActions = useChatTaskActions(organizationId, conversationId)
  const [draft, setDraft] = useState('')
  const [taskOpen, setTaskOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const items = messages.data?.items ?? []
  const lastId = items[items.length - 1]?.id

  // Lida ao abrir e a cada mensagem nova; rola pro fim.
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara pela última mensagem, não pela função
  useEffect(() => {
    if (!lastId) return
    markRead.mutate(conversationId)
    const scroller = scrollRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [conversationId, lastId])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || send.isPending) return
    send.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: (error) =>
        toast({
          type: 'error',
          title: 'Mensagem não enviada',
          description: error instanceof Error ? error.message : undefined,
        }),
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  let lastDay = ''

  return (
    <div className={`${styles.thread} ${compact ? styles.compact : ''}`}>
      <div className={styles.messages} ref={scrollRef}>
        {messages.isLoading ? (
          <div className={styles.loading}>
            <Skeleton width="60%" height={40} />
            <Skeleton width="45%" height={40} />
            <Skeleton width="55%" height={40} />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <strong>Nenhuma mensagem ainda.</strong>
            <span>Escreva abaixo ou peça uma tarefa pra alguém da equipe.</span>
          </div>
        ) : (
          items.map((message: ChatMessage) => {
            const day = dayLabel(message.createdAt)
            const showDay = day !== lastDay
            lastDay = day
            const mine = message.author?.id === currentUser?.id
            const authorName = message.author?.name ?? message.author?.email ?? 'Alguém'
            return (
              <div key={message.id}>
                {showDay && <div className={styles.daySeparator}>{day}</div>}
                <div className={`${styles.row} ${mine ? styles.rowMine : ''}`}>
                  {!mine && (
                    <Avatar
                      src={message.author?.avatarUrl ?? undefined}
                      initials={initials(authorName)}
                      size="sm"
                    />
                  )}
                  <div className={styles.bubbleWrap}>
                    {!mine && <span className={styles.author}>{authorName}</span>}
                    {message.kind === 'task' && message.task ? (
                      <TaskCard
                        task={message.task}
                        members={members}
                        currentUserId={currentUser?.id}
                        busy={taskActions.busyTaskId === message.task.id}
                        onClaim={() => message.task && taskActions.claim(message.task.id)}
                        onComplete={() => message.task && taskActions.complete(message.task.id)}
                      />
                    ) : message.kind === 'task' ? (
                      <div className={styles.bubble}>
                        <em>Tarefa apagada: {message.body}</em>
                      </div>
                    ) : (
                      <div className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>
                        {message.body}
                      </div>
                    )}
                    <span className={styles.time}>{timeLabel(message.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <button
          type="button"
          className={styles.taskTrigger}
          onClick={() => setTaskOpen(true)}
          aria-label="Pedir tarefa"
        >
          <TaskIcon />
          <span className={styles.taskTriggerLabel}>Pedir tarefa</span>
        </button>
        <textarea
          className={styles.input}
          rows={1}
          placeholder="Escreva uma mensagem…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={4000}
          aria-label="Mensagem"
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!draft.trim() || send.isPending}
          aria-label="Enviar"
        >
          <SendIcon />
        </button>
      </form>

      {taskOpen && (
        <ChatTaskModal
          organizationId={organizationId}
          conversationId={conversationId}
          members={members}
          currentUserId={currentUser?.id}
          onClose={() => setTaskOpen(false)}
        />
      )}
    </div>
  )
}
