// Preferências de notificação do usuário — Configurações > Notificações.
//
// `push`: quais tipos de notificação viram notificação do navegador (fora da
// aba do CRM). `sound`: tocar um aviso sonoro quando chega notificação nova.
// O sininho (in-app) sempre mostra tudo — isso não é configurável.
//
// Guardado como jsonb em users.notification_preferences. O que estiver
// faltando no banco (usuário antigo, tipo novo) cai no padrão: tudo ligado.

import type { NotificationType } from '../ports/notification.repository'

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'task.assigned',
  'task.due_soon',
  'task.overdue',
  'task.completed',
  'lead.received',
]

export interface NotificationPreferences {
  push: Record<NotificationType, boolean>
  sound: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push: {
    'task.assigned': true,
    'task.due_soon': true,
    'task.overdue': true,
    'task.completed': true,
    'lead.received': true,
  },
  sound: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Completa o que vier do banco com os padrões, ignorando valores inválidos. */
export function resolveNotificationPreferences(stored: unknown): NotificationPreferences {
  const source = isRecord(stored) ? stored : {}
  const storedPush = isRecord(source.push) ? source.push : {}
  const push = { ...DEFAULT_NOTIFICATION_PREFERENCES.push }
  for (const type of NOTIFICATION_TYPES) {
    const value = storedPush[type]
    if (typeof value === 'boolean') push[type] = value
  }
  return {
    push,
    sound:
      typeof source.sound === 'boolean' ? source.sound : DEFAULT_NOTIFICATION_PREFERENCES.sound,
  }
}
