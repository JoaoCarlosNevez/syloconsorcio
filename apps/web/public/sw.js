// Service worker do SyloCRM — só Web Push (app do celular, /m).
//
// Não faz cache: o app sempre carrega da rede, como o site. O push chega aqui
// mesmo com o app fechado; o toque na notificação abre (ou foca) o app na tela
// que a API mandou em `url`.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let message = { title: 'SyloCRM', body: '', url: '/m', tag: undefined }
  try {
    if (event.data) message = { ...message, ...event.data.json() }
  } catch {
    if (event.data) message.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url: message.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/m', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).pathname.startsWith('/m'))
      if (open) {
        await open.focus()
        if ('navigate' in open) return open.navigate(target)
        return undefined
      }
      return self.clients.openWindow(target)
    })(),
  )
})
