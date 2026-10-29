// Web Push do app do celular (/m): registra o service worker (public/sw.js),
// inscreve o aparelho no serviço de push do navegador e manda a inscrição
// pra API, que passa a enviar os avisos mesmo com o app fechado.
//
// No iPhone só funciona com o app instalado na tela de início (iOS 16.4+);
// no Android funciona no Chrome direto ou instalado.

import { API_URL, apiClient } from './api-client'

export type PushSupport = 'supported' | 'needs-install' | 'unsupported'

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
  )
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const hasApis =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  // No iPhone, PushManager só existe com o app aberto pela tela de início.
  if (isIos() && !isStandalone()) return 'needs-install'
  return hasApis ? 'supported' : 'unsupported'
}

/** O endereço da API vai na URL do service worker: é por ela que os botões
 * Aceitar/Recusar da notificação respondem o lead da fila (sw.js). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register(`/sw.js?api=${encodeURIComponent(API_URL)}`, {
    scope: '/',
  })
}

/** Chave VAPID (base64url) → bytes, como o PushManager espera. */
function decodeKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** Pede permissão (chamar dentro de um toque), inscreve e salva na API. */
export async function subscribeToPush(): Promise<NotificationPermission> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission

  const { publicKey } = await apiClient.get<{ publicKey: string | null }>('/push/public-key')
  if (!publicKey) throw new Error('O push ainda não está ligado no servidor.')

  const registration = (await registerServiceWorker()) ?? undefined
  if (!registration) throw new Error('Este navegador não aceita push.')
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(publicKey),
    }))

  const json = subscription.toJSON()
  await apiClient.post('/push/subscriptions', {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  })
  return permission
}

/** Tira o aparelho da API e cancela a inscrição (logout, "desligar avisos"). */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return
  await apiClient.delete('/push/subscriptions', { body: { endpoint: subscription.endpoint } })
  await subscription.unsubscribe()
}
