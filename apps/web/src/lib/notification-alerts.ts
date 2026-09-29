// Decide quais notificações são "novas de verdade" pra tocar som / mostrar no
// navegador: as não lidas que não estavam na leitura anterior. Na primeira
// leitura (ao abrir o CRM ou trocar de organização) nada dispara — o que já
// estava lá aparece só no sininho.

import type { AppNotification } from './notifications-api'

export function findNewNotifications(
  previousIds: ReadonlySet<string> | null,
  items: readonly AppNotification[],
): AppNotification[] {
  if (!previousIds) return []
  return items.filter((item) => !item.readAt && !previousIds.has(item.id))
}
