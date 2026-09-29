// useBrowserNotificationPermission — estado da permissão de notificações do
// navegador, e o pedido de permissão.
//
// A permissão pode mudar fora do app (o usuário mexe no cadeado da barra de
// endereço), então relê ao voltar o foco pra aba.

import { useCallback, useEffect, useState } from 'react'
import {
  type BrowserNotificationPermission,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../lib/browser-notifications'

export function useBrowserNotificationPermission() {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    getBrowserNotificationPermission,
  )

  useEffect(() => {
    function refresh() {
      setPermission(getBrowserNotificationPermission())
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const request = useCallback(async () => {
    const result = await requestBrowserNotificationPermission()
    setPermission(result)
    return result
  }, [])

  return { permission, request }
}
