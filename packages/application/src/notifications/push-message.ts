// Frase do push de cada notificação — a mesma do sininho (lib/notification-
// format.ts no front), montada aqui porque o push sai do servidor. O toque
// abre o app do celular (/m) na tela certa, já na organização da notificação.

import type { NotificationMetadata } from '../ports/notification.repository'
import type { PendingPush, PushMessage } from '../ports/push.ports'

const TIME_ZONE = 'America/Sao_Paulo'

function dayKey(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: TIME_ZONE })
}

/** "hoje às 14:30", "amanhã às 09:00" ou "05/11 às 10:00" — no fuso de Brasília. */
export function formatPushDate(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
  if (dayKey(date) === dayKey(now)) return `hoje às ${time}`
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (dayKey(date) === dayKey(tomorrow)) return `amanhã às ${time}`
  const day = date.toLocaleDateString('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  })
  return `${day} às ${time}`
}

function text(metadata: NotificationMetadata, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

function headline(push: PendingPush): string {
  const actor = push.actorName ?? 'Alguém'
  switch (push.type) {
    case 'task.assigned':
      return `${actor} atribuiu uma tarefa a você`
    case 'task.due_soon':
      return 'Tarefa vence em breve'
    case 'task.overdue':
      return 'Tarefa atrasada'
    case 'task.completed':
      return `${actor} concluiu uma tarefa que você criou`
    case 'lead.received':
      if (push.metadata.queueExhausted === true) return 'Ninguém da fila aceitou o lead'
      return push.metadata.assignedToYou === true
        ? 'Novo lead atribuído a você'
        : 'Novo lead recebido, sem responsável'
    case 'lead.offered':
      return 'Novo lead pra você na fila'
    case 'proposal.viewed':
      return 'Cliente abriu a proposta'
  }
}

function detail(push: PendingPush, now: Date): string | null {
  const dueAt = text(push.metadata, 'dueAt')
  switch (push.type) {
    case 'task.assigned':
      return dueAt ? `Prazo: ${formatPushDate(dueAt, now)}` : null
    case 'task.due_soon':
      return dueAt ? `Vence ${formatPushDate(dueAt, now)}` : null
    case 'task.overdue':
      return dueAt ? `Venceu ${formatPushDate(dueAt, now)}` : null
    case 'task.completed':
      return null
    case 'lead.received': {
      const source = text(push.metadata, 'source')
      return source ? `Origem: ${source}` : null
    }
    case 'lead.offered': {
      const expiresAt = text(push.metadata, 'expiresAt')
      return expiresAt ? `Aceite até ${formatPushDate(expiresAt, now)}` : null
    }
    case 'proposal.viewed':
      return 'É a melhor hora pra ligar'
  }
}

function target(push: PendingPush): string {
  const org = `?org=${encodeURIComponent(push.organizationId)}`
  const leadId = text(push.metadata, 'leadId')
  if (push.type === 'lead.offered') {
    const offerId = text(push.metadata, 'offerId')
    return offerId ? `/m/oferta/${encodeURIComponent(offerId)}${org}` : `/m${org}`
  }
  if ((push.type === 'lead.received' || push.type === 'proposal.viewed') && leadId) {
    return `/m/leads/${encodeURIComponent(leadId)}${org}`
  }
  if (push.type.startsWith('task.')) return `/m/tarefas${org}`
  return `/m/avisos${org}`
}

export function buildPushMessage(push: PendingPush, now: Date = new Date()): PushMessage {
  const extra = detail(push, now)
  return {
    title: headline(push),
    body: extra ? `${push.title} · ${extra}` : push.title,
    url: target(push),
    tag: push.id,
  }
}
