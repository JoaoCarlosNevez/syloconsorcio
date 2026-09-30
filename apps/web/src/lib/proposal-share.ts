// Status do link público da proposta, mostrado no card da proposta no
// LeadModal: se o link já foi gerado e quantas vezes/quando o cliente abriu.

import type { LeadProposal } from './leads-api'

function formatViewedAt(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === now.toDateString()) return `hoje às ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `ontem às ${time}`
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${day} às ${time}`
}

/** null enquanto ninguém gerou o link. */
export function describeProposalViews(
  proposal: Pick<LeadProposal, 'shareToken' | 'viewCount' | 'lastViewedAt'>,
  now: Date = new Date(),
): string | null {
  if (!proposal.shareToken) return null
  if (proposal.viewCount === 0 || !proposal.lastViewedAt) return 'Link gerado · ainda não aberto'
  const times = proposal.viewCount === 1 ? '1 vez' : `${proposal.viewCount} vezes`
  return `Cliente abriu ${times} · última ${formatViewedAt(proposal.lastViewedAt, now)}`
}
