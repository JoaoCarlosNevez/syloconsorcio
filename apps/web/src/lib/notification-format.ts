// Monta a frase de cada notificação do sininho a partir de type + metadata
// (o backend só guarda dados estruturados), e pra onde o clique leva. Ex:
// "Maria atribuiu uma tarefa a você".

import type { AppNotification } from './notifications-api'

function actorName(notification: AppNotification): string {
  if (!notification.actor) return 'Alguém'
  return notification.actor.name?.trim() || notification.actor.email
}

function formatDueAt(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return `hoje às ${time}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return `amanhã às ${time}`
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${day} às ${time}`
}

export interface NotificationText {
  /** Frase principal (sem aspas no título — ele vem destacado à parte). */
  headline: string
  /** Linha secundária, ex: "Vence hoje às 14:30". */
  detail: string | null
}

export function describeNotification(
  notification: AppNotification,
  now: Date = new Date(),
): NotificationText {
  const dueAt = typeof notification.metadata.dueAt === 'string' ? notification.metadata.dueAt : null
  const dueLabel = dueAt ? formatDueAt(dueAt, now) : null

  switch (notification.type) {
    case 'task.assigned':
      return {
        headline: `${actorName(notification)} atribuiu uma tarefa a você`,
        detail: dueLabel ? `Prazo: ${dueLabel}` : null,
      }
    case 'task.due_soon':
      return {
        headline: 'Tarefa vence em breve',
        detail: dueLabel ? `Vence ${dueLabel}` : null,
      }
    case 'task.overdue':
      return {
        headline: 'Tarefa atrasada',
        detail: dueLabel ? `Venceu ${dueLabel}` : null,
      }
    case 'task.completed':
      return {
        headline: `${actorName(notification)} concluiu uma tarefa que você criou`,
        detail: null,
      }
    case 'lead.received': {
      const source =
        typeof notification.metadata.source === 'string' ? notification.metadata.source : null
      return {
        headline:
          notification.metadata.queueExhausted === true
            ? 'Ninguém da fila aceitou o lead'
            : notification.metadata.assignedToYou === true
              ? 'Novo lead atribuído a você'
              : 'Novo lead recebido, sem responsável',
        detail: source ? `Origem: ${source}` : null,
      }
    }
    case 'lead.offered': {
      const expiresAt =
        typeof notification.metadata.expiresAt === 'string' ? notification.metadata.expiresAt : null
      return {
        headline: 'Novo lead pra você na fila',
        detail: expiresAt ? `Aceite até ${formatDueAt(expiresAt, now)}` : null,
      }
    }
    case 'proposal.viewed': {
      const viewedAt =
        typeof notification.metadata.viewedAt === 'string' ? notification.metadata.viewedAt : null
      return {
        headline: 'Cliente abriu a proposta',
        detail: viewedAt ? `Aberta ${formatDueAt(viewedAt, now)}` : null,
      }
    }
  }
}

export interface NotificationTarget {
  path: string
  state?: Record<string, unknown>
}

/** Pra onde o clique numa notificação leva: a tarefa (em Tarefas) ou o lead
 * (no Kanban, já no funil dele). */
export function notificationTarget(notification: AppNotification): NotificationTarget {
  // O lead só fica visível pro vendedor depois de aceito — o aceite é no card
  // do LeadOfferPrompt, que aparece em qualquer página.
  if (notification.type === 'lead.offered') return { path: '/app/kanban' }
  if (notification.type === 'lead.received' || notification.type === 'proposal.viewed') {
    const { leadId, funnelId } = notification.metadata
    return typeof leadId === 'string'
      ? {
          path: '/app/kanban',
          state: { openLeadId: leadId, funnelId: typeof funnelId === 'string' ? funnelId : null },
        }
      : { path: '/app/kanban' }
  }
  return notification.task
    ? { path: '/app/tarefas', state: { openTask: notification.task } }
    : { path: '/app/tarefas' }
}

/** "agora", "há 5 min", "há 2 h", "ontem" ou a data "25/09". */
export function notificationTimeLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 24 * 60) return `há ${Math.floor(minutes / 60)} h`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Texto do contador no sininho — "9+" acima de 9. */
export function unreadBadgeLabel(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}
