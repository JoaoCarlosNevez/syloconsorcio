// useLeadQueue — Fila de Leads via TanStack Query (ADR-04).
//
// As ofertas do usuário são consultadas a cada 10s, mesmo com a aba em
// segundo plano: o prazo pra aceitar é de poucos minutos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type LeadQueueOverview,
  type LeadQueueSettings,
  type MyLeadOffer,
  acceptLeadOffer,
  declineLeadOffer,
  getLeadQueue,
  listMyLeadOffers,
  updateLeadQueue,
} from '../lib/lead-queue-api'

const MY_OFFERS_REFETCH_MS = 10_000
const QUEUE_REFETCH_MS = 15_000

function myOffersKey(organizationId: string | null) {
  return ['lead-offers', 'mine', organizationId] as const
}

function queueKey(organizationId: string | null) {
  return ['lead-queue', organizationId] as const
}

export function useMyLeadOffersQuery(organizationId: string | null) {
  return useQuery<{ offers: MyLeadOffer[] }>({
    queryKey: myOffersKey(organizationId),
    queryFn: () => listMyLeadOffers(organizationId as string),
    enabled: Boolean(organizationId),
    refetchInterval: MY_OFFERS_REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

export function useRespondLeadOffer(organizationId: string | null) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: myOffersKey(organizationId) })
    queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
  }
  const accept = useMutation({
    mutationFn: (offerId: string) => acceptLeadOffer(organizationId as string, offerId),
    onSettled: invalidate,
  })
  const decline = useMutation({
    mutationFn: (offerId: string) => declineLeadOffer(organizationId as string, offerId),
    onSettled: invalidate,
  })
  return { accept, decline }
}

export function useLeadQueueQuery(organizationId: string | null, enabled = true) {
  return useQuery<LeadQueueOverview>({
    queryKey: queueKey(organizationId),
    queryFn: () => getLeadQueue(organizationId as string),
    enabled: Boolean(organizationId) && enabled,
    refetchInterval: QUEUE_REFETCH_MS,
  })
}

export function useUpdateLeadQueue(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<LeadQueueSettings, 'organizationId'>) =>
      updateLeadQueue(organizationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKey(organizationId) })
    },
  })
}
