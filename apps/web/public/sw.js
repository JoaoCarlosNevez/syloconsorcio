// Service worker do SyloCRM — só Web Push (app do celular, /m).
//
// Não faz cache: o app sempre carrega da rede, como o site. O push chega aqui
// mesmo com o app fechado; o toque na notificação abre (ou foca) o app na tela
// que a API mandou em `url`.
//
// Lead da fila (do webhook): a notificação fica na tela até o vendedor mexer
// e traz os botões Aceitar/Recusar (Android e computador — o iPhone não
// mostra botões; lá o toque abre a tela da oferta). O botão responde direto
// na API com o token assinado que veio no push, sem abrir o app. O endereço
// da API vem no registro do service worker (/sw.js?api=...).

const API_URL = new URL(self.location.href).searchParams.get('api') || ''

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
  const offer = message.offerActions && API_URL ? message.offerActions : null
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      requireInteraction: message.requireInteraction === true,
      renotify: Boolean(message.tag && message.requireInteraction),
      vibrate: message.requireInteraction ? [300, 150, 300, 150, 300] : undefined,
      actions: offer ? offer.actions : [],
      data: { url: message.url, offerToken: offer ? offer.token : null },
    }),
  )
})

async function openApp(url) {
  const target = new URL(url || '/m', self.location.origin).href
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const open = windows.find((client) => new URL(client.url).pathname.startsWith('/m'))
  if (open) {
    await open.focus()
    if ('navigate' in open) return open.navigate(target)
    return undefined
  }
  return self.clients.openWindow(target)
}

/** Aceitar/Recusar pela notificação — avisa o resultado numa notificação nova. */
async function respondOffer(action, token, fallbackUrl) {
  let response
  try {
    response = await fetch(`${API_URL}/lead-offers/push-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    })
  } catch {
    // Sem rede: abre a tela da oferta pra tentar por lá.
    return openApp(fallbackUrl)
  }
  const body = await response.json().catch(() => ({}))

  if (response.ok && action === 'accept' && body.lead) {
    const url = `/m/leads/${body.lead.id}?org=${encodeURIComponent(body.organizationId)}`
    await self.registration.showNotification('Lead aceito', {
      body: `${body.lead.name} agora é seu. Toque pra abrir e ligar.`,
      tag: `accepted-${body.lead.id}`,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url },
    })
    return undefined
  }
  if (response.ok) return undefined
  return self.registration.showNotification('Não deu pra responder o lead', {
    body: body.error || 'O tempo acabou ou ele já foi pra outra pessoa.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    data: { url: '/m' },
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  if ((event.action === 'accept' || event.action === 'decline') && data.offerToken) {
    event.waitUntil(respondOffer(event.action, data.offerToken, data.url))
    return
  }
  event.waitUntil(openApp(data.url))
})
