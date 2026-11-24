// Avisos no celular: a lista do sininho e o liga/desliga do push neste
// aparelho. A troca de organização e o "sair" ficam na aba Perfil.

import { Skeleton } from '@sylocrm/ui'
import { useNavigate } from 'react-router-dom'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
} from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { mobileNotificationPath } from '../../lib/mobile'
import { describeNotification, notificationTimeLabel } from '../../lib/notification-format'
import type { AppNotification } from '../../lib/notifications-api'
import styles from './Mobile.module.css'
import { PushCard } from './PushCard'
import { BoltIcon, ClockIcon, EyeIcon } from './icons'

function NotificationIcon({ notification }: { notification: AppNotification }) {
  if (notification.type === 'lead.offered' || notification.type === 'lead.received') {
    return (
      <span className={`${styles.iconBox} ${styles.iconOffer}`}>
        <BoltIcon />
      </span>
    )
  }
  if (notification.type === 'proposal.viewed') {
    return (
      <span className={`${styles.iconBox} ${styles.iconInfo}`}>
        <EyeIcon />
      </span>
    )
  }
  return (
    <span
      className={`${styles.iconBox} ${notification.type === 'task.overdue' ? styles.iconDanger : ''}`}
    >
      <ClockIcon />
    </span>
  )
}

export function MobileNotificationsPage() {
  const navigate = useNavigate()
  const { organizationId } = useActiveOrganization()
  const notifications = useNotificationsQuery(organizationId)
  const markRead = useMarkNotificationRead(organizationId)
  const markAllRead = useMarkAllNotificationsRead(organizationId)
  const now = new Date()

  function open(notification: AppNotification) {
    if (!notification.readAt) markRead.mutate(notification.id)
    navigate(mobileNotificationPath(notification))
  }

  const items = notifications.data?.items ?? []

  return (
    <main className={styles.content}>
      <div className={styles.top}>
        <h1 className={styles.title}>Avisos</h1>
        {(notifications.data?.unreadCount ?? 0) > 0 && (
          <button type="button" className={styles.link} onClick={() => markAllRead.mutate()}>
            Marcar como lidos
          </button>
        )}
      </div>

      <PushCard />

      <div className={`${styles.card} ${styles.list}`}>
        {notifications.isLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ))
        ) : items.length === 0 ? (
          <p className={styles.empty}>Nenhum aviso por enquanto.</p>
        ) : (
          items.map((notification) => {
            const text = describeNotification(notification, now)
            return (
              <button
                key={notification.id}
                type="button"
                className={styles.row}
                onClick={() => open(notification)}
              >
                <NotificationIcon notification={notification} />
                <div className={styles.grow}>
                  <span className={styles.rowTitle}>{text.headline}</span>
                  <div className={styles.rowSub}>
                    {notification.title} · {notificationTimeLabel(notification.createdAt, now)}
                  </div>
                </div>
                {!notification.readAt && <span className={styles.unread} />}
              </button>
            )
          })
        )}
      </div>
    </main>
  )
}
