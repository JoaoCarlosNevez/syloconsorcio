// usePublicProposal — proposta aberta pelo link público (/p/:token).
//
// Cada busca conta como uma abertura no backend (e pode avisar o vendedor),
// então nada de refetch automático: busca uma vez por visita.

import { useQuery } from '@tanstack/react-query'
import { type PublicProposal, getPublicProposal } from '../lib/leads-api'

export function usePublicProposalQuery(token: string) {
  return useQuery<PublicProposal>({
    queryKey: ['public-proposal', token],
    queryFn: () => getPublicProposal(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
