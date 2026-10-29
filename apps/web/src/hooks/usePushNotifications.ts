// usePushNotifications — estado do Web Push neste aparelho (app do celular) e
// as ações de ligar/desligar. Ver lib/web-push.ts.

import { useCallback, useEffect, useState } from 'react'
import {
  type PushSupport,
  getCurrentSubscription,
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/web-push'

export type PushStatus = PushSupport | 'denied' | 'off' | 'on'

function readPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const support = getPushSupport()
    if (support !== 'supported') return setStatus(support)
    if (readPermission() === 'denied') return setStatus('denied')
    const subscription = await getCurrentSubscription()
    setStatus(subscription && readPermission() === 'granted' ? 'on' : 'off')
  }, [])

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Não deu pra ler o estado do push.')
    })
  }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const permission = await subscribeToPush()
      setStatus(permission === 'granted' ? 'on' : permission === 'denied' ? 'denied' : 'off')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra ligar os avisos.')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await unsubscribeFromPush()
      setStatus('off')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra desligar os avisos.')
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, error, enable, disable }
}
