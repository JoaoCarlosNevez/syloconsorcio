// NotificationAlerts — avisa quando chega notificação nova, em qualquer tela.
//
// Não renderiza nada: observa a mesma query do sininho (cache compartilhado)
// e, pra cada notificação nova (ver findNewNotifications):
//   - toca o aviso sonoro, se o usuário deixou o som ligado;
//   - mostra a notificação do navegador, se o push daquele tipo está ligado,
//     a permissão foi dada e o usuário não está olhando pro CRM agora.
//
// Montado no ProtectedRoute (e não no AppLayout, que remonta a cada troca de
// página) pra não perder o que já foi visto ao navegar.

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotificationsQuery } from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { showBrowserNotification } from '../../lib/browser-notifications'
import { findNewNotifications } from '../../lib/notification-alerts'
import { describeNotification } from '../../lib/notification-format'
import { playNotificationSound, unlockNotificationSound } from '../../lib/notification-sound'

function isUserLookingAtApp(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

export function NotificationAlerts() {
  const { organizationId } = useActiveOrganization()
  const { data } = useNotificationsQuery(organizationId)
  const { data: currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const seen = useRef<{ organizationId: string | null; ids: Set<string> | null }>({
    organizationId: null,
    ids: null,
  })

  // Libera o áudio no primeiro gesto do usuário (política de autoplay).
  useEffect(() => {
    function unlock() {
      unlockNotificationSound().catch((error: unknown) => {
        console.warn('Não foi possível liberar o aviso sonoro:', error)
      })
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    // Trocou de organização: a próxima leitura é "primeira" de novo.
    if (seen.current.organizationId !== organizationId) {
      seen.current = { organizationId, ids: null }
    }

    const fresh = findNewNotifications(seen.current.ids, data.items)
    seen.current.ids = new Set(data.items.map((item) => item.id))
    if (fresh.length === 0) return

    const preferences = currentUser?.notificationPreferences
    if (preferences?.sound ?? true) {
      playNotificationSound().catch((error: unknown) => {
        console.warn('Não foi possível tocar o aviso sonoro:', error)
      })
    }

    if (isUserLookingAtApp()) return
    for (const notification of fresh) {
      if (!(preferences?.push[notification.type] ?? true)) continue
      const text = describeNotification(notification)
      showBrowserNotification({
        tag: notification.id,
        title: text.headline,
        body: text.detail ? `${notification.title}\n${text.detail}` : notification.title,
        onClick: () =>
          navigate(
            '/app/tarefas',
            notification.task ? { state: { openTask: notification.task } } : {},
          ),
      })
    }
  }, [data, organizationId, currentUser, navigate])

  return null
}
