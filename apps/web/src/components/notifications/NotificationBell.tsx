// NotificationBell — o sininho: botão com contador de não lidas e o painel
// com as notificações do usuário na organização ativa.
//
// O botão recebe a classe da página (`triggerClassName`) pra manter o visual
// de cada lugar onde o sininho aparece; o contador e o painel são daqui.
//
// As não lidas ficam em "Novas" e as já vistas em "Visualizadas", abaixo.
// Clicar numa notificação marca como lida e abre o que ela aponta — a tarefa
// em Tarefas ou o lead no Kanban (ver notificationTarget).

import { Skeleton } from '@sylocrm/ui'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
} from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import {
  describeNotification,
  notificationTarget,
  notificationTimeLabel,
  unreadBadgeLabel,
} from '../../lib/notification-format'
import type { AppNotification, NotificationType } from '../../lib/notifications-api'
import styles from './NotificationBell.module.css'

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function TypeIcon({ type }: { type: NotificationType }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (type) {
    case 'task.assigned':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      )
    case 'task.due_soon':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'task.overdue':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    case 'task.completed':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'lead.received':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      )
  }
}

const TYPE_CLASS: Record<NotificationType, string | undefined> = {
  'task.assigned': styles.typeAssigned,
  'task.due_soon': styles.typeDueSoon,
  'task.overdue': styles.typeOverdue,
  'task.completed': styles.typeCompleted,
  'lead.received': styles.typeLead,
}

export interface NotificationBellProps {
  /** Classe do botão na página onde o sininho aparece. */
  triggerClassName?: string
  /** Lado em que o painel se alinha ao botão. */
  align?: 'left' | 'right'
}

export function NotificationBell({ triggerClassName, align = 'right' }: NotificationBellProps) {
  const { organizationId } = useActiveOrganization()
  const { data, isLoading, isError, refetch } = useNotificationsQuery(organizationId)
  const markRead = useMarkNotificationRead(organizationId)
  const markAllRead = useMarkAllNotificationsRead(organizationId)
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const unreadCount = data?.unreadCount ?? 0
  const badge = unreadBadgeLabel(unreadCount)

  useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleSelect(notification: AppNotification) {
    if (!notification.readAt) markRead.mutate(notification.id)
    setOpen(false)
    const target = notificationTarget(notification)
    navigate(target.path, target.state ? { state: target.state } : {})
  }

  const now = new Date()
  const unreadItems = data?.items.filter((item) => !item.readAt) ?? []
  const readItems = data?.items.filter((item) => item.readAt) ?? []

  function renderItem(notification: AppNotification) {
    const text = describeNotification(notification, now)
    const unread = !notification.readAt
    return (
      <li key={notification.id}>
        <button
          type="button"
          className={`${styles.item} ${unread ? styles.itemUnread : styles.itemRead}`}
          onClick={() => handleSelect(notification)}
        >
          <span className={`${styles.typeIcon} ${TYPE_CLASS[notification.type]}`}>
            <TypeIcon type={notification.type} />
          </span>
          <span className={styles.itemText}>
            <span className={styles.itemHeadline}>{text.headline}</span>
            <span className={styles.itemTitle}>{notification.title}</span>
            <span className={styles.itemMeta}>
              {text.detail && <>{text.detail} · </>}
              {notificationTimeLabel(notification.createdAt, now)}
            </span>
          </span>
          {unread && <span className={styles.unreadDot} aria-label="Não lida" />}
        </button>
      </li>
    )
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={badge ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
      </button>
      {badge && (
        <span className={styles.badge} aria-hidden="true">
          {badge}
        </span>
      )}

      {open && (
        <dialog
          open
          id={panelId}
          aria-label="Notificações"
          className={`${styles.panel} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
        >
          <div className={styles.header}>
            <span className={styles.headerTitle}>Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={() => markAllRead.mutate()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className={styles.body}>
            {isLoading ? (
              <ul className={styles.list} aria-hidden="true">
                {[0, 1, 2].map((key) => (
                  <li key={key} className={styles.skeletonRow}>
                    <Skeleton variant="circle" width="32px" height="32px" />
                    <div className={styles.skeletonText}>
                      <Skeleton variant="text" width="75%" height="14px" />
                      <Skeleton variant="text" width="50%" height="12px" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : isError ? (
              <div className={styles.state}>
                <p>Não foi possível carregar as notificações.</p>
                <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
                  Tentar de novo
                </button>
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className={styles.state}>
                <p className={styles.stateTitle}>Tudo em dia</p>
                <p>Avisos de tarefas e de leads novos recebidos pela API aparecem aqui.</p>
              </div>
            ) : (
              <>
                {unreadItems.length > 0 ? (
                  <section aria-label="Novas">
                    <h3 className={styles.sectionTitle}>Novas</h3>
                    <ul className={styles.list}>{unreadItems.map(renderItem)}</ul>
                  </section>
                ) : (
                  <p className={styles.noNew}>Nenhuma notificação nova.</p>
                )}
                {readItems.length > 0 && (
                  <section aria-label="Visualizadas" className={styles.readSection}>
                    <h3 className={styles.sectionTitle}>Visualizadas</h3>
                    <ul className={styles.list}>{readItems.map(renderItem)}</ul>
                  </section>
                )}
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  )
}
