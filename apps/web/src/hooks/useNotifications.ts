// useNotifications — o sininho via TanStack Query (ADR-04).
//
// Consulta a cada minuto, mesmo com a aba em segundo plano, e ao voltar pra
// aba: é essa leitura que faz o backend gerar os lembretes de prazo, então o
// "vence em breve" e o "atrasada" aparecem sem ninguém recarregar a página.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type NotificationList,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notifications-api'

const REFETCH_INTERVAL_MS = 60_000

function notificationsQueryKey(organizationId: string | null) {
  return ['notifications', organizationId] as const
}

export function useNotificationsQuery(organizationId: string | null) {
  return useQuery<NotificationList>({
    queryKey: notificationsQueryKey(organizationId),
    queryFn: () => listNotifications(organizationId as string),
    enabled: Boolean(organizationId),
    refetchInterval: REFETCH_INTERVAL_MS,
    // Continua consultando com a aba em segundo plano — é justamente quando a
    // notificação do navegador e o som fazem diferença.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

/** Marca como lida já na tela (otimista) e desfaz se a API falhar. */
function useOptimisticRead<TVariables>(
  organizationId: string | null,
  mutationFn: (variables: TVariables) => Promise<void>,
  apply: (list: NotificationList, variables: TVariables) => NotificationList,
) {
  const queryClient = useQueryClient()
  const queryKey = notificationsQueryKey(organizationId)
  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NotificationList>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, apply(previous, variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

export function useMarkNotificationRead(organizationId: string | null) {
  return useOptimisticRead<string>(
    organizationId,
    (id) => markNotificationRead(organizationId as string, id),
    (list, id) => {
      const target = list.items.find((item) => item.id === id)
      if (!target || target.readAt) return list
      const readAt = new Date().toISOString()
      return {
        unreadCount: Math.max(0, list.unreadCount - 1),
        items: list.items.map((item) => (item.id === id ? { ...item, readAt } : item)),
      }
    },
  )
}

export function useMarkAllNotificationsRead(organizationId: string | null) {
  return useOptimisticRead<void>(
    organizationId,
    () => markAllNotificationsRead(organizationId as string),
    (list) => {
      const readAt = new Date().toISOString()
      return {
        unreadCount: 0,
        items: list.items.map((item) => (item.readAt ? item : { ...item, readAt })),
      }
    },
  )
}
