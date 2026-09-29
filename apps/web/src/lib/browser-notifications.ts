// Notificações do navegador (API Notification) — o "push" das configurações.
//
// Aparecem enquanto o CRM estiver aberto em alguma aba, mesmo que o usuário
// esteja em outra aba ou outro programa. Com o navegador fechado não chegam:
// isso exigiria Web Push com service worker, que ainda não existe aqui.

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Abre o pedido de permissão do navegador — chamar dentro de um clique. */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export interface BrowserNotificationInput {
  /** Id da notificação — o navegador substitui em vez de duplicar (várias abas). */
  tag: string
  title: string
  body: string
  onClick: () => void
}

export function showBrowserNotification(input: BrowserNotificationInput): void {
  if (getBrowserNotificationPermission() !== 'granted') return
  const notification = new Notification(input.title, {
    body: input.body,
    tag: input.tag,
    icon: '/sylo-3d-logo.png',
  })
  notification.onclick = () => {
    window.focus()
    input.onClick()
    notification.close()
  }
}
