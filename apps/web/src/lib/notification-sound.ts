// Aviso sonoro de notificação nova — um "plim" de duas notas gerado com Web
// Audio, sem arquivo de áudio pra carregar.
//
// Navegadores só liberam áudio depois de alguma interação do usuário com a
// página. unlockNotificationSound() deve ser chamado num gesto (clique/tecla)
// — o NotificationAlerts faz isso no primeiro clique em qualquer lugar.

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null
  if (!context) context = new window.AudioContext()
  return context
}

/** Libera o áudio — chamar dentro de um gesto do usuário. */
export async function unlockNotificationSound(): Promise<void> {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') await ctx.resume()
}

function playTone(ctx: AudioContext, frequency: number, startAt: number, duration: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  // Ataque rápido e decaimento suave — evita o "clique" de cortar a onda seca.
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

/** Toca o aviso. Retorna false se o navegador ainda não liberou o áudio. */
export async function playNotificationSound(): Promise<boolean> {
  const ctx = getContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    await ctx.resume()
    // resume() muda o estado — o TypeScript ainda acha que é 'suspended'.
    if ((ctx.state as AudioContextState) !== 'running') return false
  }
  const now = ctx.currentTime
  playTone(ctx, 880, now, 0.22) // A5
  playTone(ctx, 1318.5, now + 0.12, 0.32) // E6
  return true
}
