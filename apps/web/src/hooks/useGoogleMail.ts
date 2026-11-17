// useGoogleMail — conexão com o Gmail e envio da ficha (TanStack Query).

import { useToast } from '@sylocrm/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  type SendAdhesionEmailPayload,
  disconnectGoogle,
  getGoogleMailStatus,
  sendAdhesionEmail,
  startGoogleConnect,
} from '../lib/google-mail-api'

const STATUS_KEY = ['google-mail', 'status'] as const

export function useGoogleMailStatus() {
  return useQuery({ queryKey: STATUS_KEY, queryFn: getGoogleMailStatus })
}

/** Leva o navegador pra tela de autorização do Google. */
export function useConnectGoogle() {
  return useMutation({
    mutationFn: (returnTo: string) => startGoogleConnect(returnTo),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  })
}

export function useSendAdhesionEmail(organizationId: string | null, leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendAdhesionEmailPayload) =>
      sendAdhesionEmail(organizationId as string, leadId, payload),
    onSettled: () => {
      // Token morto (409) desconecta no servidor; o envio entra no histórico.
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
    },
  })
}

const RETURN_MESSAGES: Record<string, { type: 'success' | 'warning' | 'error'; title: string }> = {
  connected: { type: 'success', title: 'Gmail conectado. Já dá pra enviar a ficha por ele.' },
  denied: { type: 'warning', title: 'Conexão com o Google cancelada.' },
  error: { type: 'error', title: 'Não foi possível conectar o Gmail. Tente de novo.' },
}

/** Volta da tela do Google (?google=connected|denied|error): avisa e limpa a URL. */
export function useGoogleReturnToast() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  useEffect(() => {
    const url = new URL(window.location.href)
    const result = url.searchParams.get('google')
    if (!result) return
    const message = RETURN_MESSAGES[result]
    if (message) toast(message)
    queryClient.invalidateQueries({ queryKey: STATUS_KEY })
    url.searchParams.delete('google')
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [toast, queryClient])
}
