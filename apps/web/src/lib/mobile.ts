// Regras puras do app do celular (/m): links de ligação/WhatsApp, agrupamento
// das tarefas por dia, leads "quentes" (abriram a proposta) e pra onde cada
// aviso leva. As telas ficam em pages/mobile/.

import type { AppNotification } from './notifications-api'
import type { Task } from './tasks-api'

/** Só os dígitos, com DDI 55 quando o número veio sem (padrão BR). */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function telLink(phone: string): string {
  return `tel:+${phoneDigits(phone)}`
}

export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/** "350.000" → 35000000 centavos; vazio/inválido → 0. */
export function parseMoneyToCents(value: string): number {
  const normalized = value.replace(/[^\d,]/g, '').replace(',', '.')
  const reais = Number.parseFloat(normalized)
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0
}

export type TaskGroup = 'atrasadas' | 'hoje' | 'amanha' | 'depois'

function startOfDay(date: Date): number {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

const DAY_MS = 24 * 60 * 60 * 1000

export function taskGroup(task: Pick<Task, 'dueAt'>, now: Date): TaskGroup {
  const due = new Date(task.dueAt)
  if (due.getTime() < now.getTime()) return 'atrasadas'
  const today = startOfDay(now)
  const dueDay = startOfDay(due)
  if (dueDay === today) return 'hoje'
  if (dueDay === today + DAY_MS) return 'amanha'
  return 'depois'
}

export function groupTasks<T extends Pick<Task, 'dueAt'>>(
  tasks: readonly T[],
  now: Date,
): Record<TaskGroup, T[]> {
  const groups: Record<TaskGroup, T[]> = { atrasadas: [], hoje: [], amanha: [], depois: [] }
  const sorted = [...tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  for (const task of sorted) groups[taskGroup(task, now)].push(task)
  return groups
}

/** "14:30" pra hoje/amanhã; "05/11 14:30" pro resto. */
export function taskTimeLabel(dueAt: string, now: Date): string {
  const date = new Date(dueAt)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const group = taskGroup({ dueAt }, now)
  if (group === 'hoje' || group === 'amanha') return time
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`
}

export interface HotLead {
  leadId: string
  name: string
  viewedAt: string
}

/** Leads cujo cliente abriu a proposta nas últimas `windowMs` — o mais
 * recente primeiro, um por lead. */
export function hotLeads(
  notifications: readonly AppNotification[],
  now: Date,
  windowMs: number = DAY_MS,
): HotLead[] {
  const seen = new Set<string>()
  const result: HotLead[] = []
  const recent = [...notifications]
    .filter((n) => n.type === 'proposal.viewed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const notification of recent) {
    const leadId = notification.metadata.leadId
    if (typeof leadId !== 'string' || seen.has(leadId)) continue
    if (now.getTime() - new Date(notification.createdAt).getTime() > windowMs) continue
    seen.add(leadId)
    result.push({ leadId, name: notification.title, viewedAt: notification.createdAt })
  }
  return result
}

/** Pra onde o toque num aviso leva dentro do app do celular. */
export function mobileNotificationPath(notification: AppNotification): string {
  const { leadId, offerId } = notification.metadata
  if (notification.type === 'lead.offered') {
    return typeof offerId === 'string' ? `/m/oferta/${offerId}` : '/m'
  }
  if (
    (notification.type === 'lead.received' || notification.type === 'proposal.viewed') &&
    typeof leadId === 'string'
  ) {
    return `/m/leads/${leadId}`
  }
  if (notification.task?.leadId) return `/m/leads/${notification.task.leadId}`
  return '/m/tarefas'
}

/** Amanhã às 10h (hora do aparelho) — o retorno de uma ligação sem resposta. */
export function tomorrowAtTen(now: Date): Date {
  const date = new Date(now)
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return date
}

export const LOST_REASONS = [
  'Sem contato',
  'Desistiu da compra',
  'Fechou com outra administradora',
  'Parcela não cabe no orçamento',
] as const
