// useMobileAdhesion — checklist de adesão do lead no celular: a ficha (dados
// da venda, das cotas e pessoais) e os documentos. Cada campo é salvo na hora
// em que o vendedor confirma — sem formulário longo pra perder no meio da
// rua. Mesma lógica do web (lib/adhesion-checklist.ts): o que é do lead vai
// no lead, o resto na ficha.

import { useCallback, useMemo } from 'react'
import {
  type AdhesionForm,
  adhesionFields,
  adhesionProgress,
  buildAdhesionForm,
  leadChanges,
} from '../lib/adhesion-checklist'
import { toCardData } from '../lib/lead-adapters'
import type { AdhesionDocumentKind } from '../lib/leads-api'
import { useFunnelsQuery } from './useFunnels'
import {
  useAdhesionDocumentsQuery,
  useDeleteAdhesionDocument,
  useLeadAdhesionQuery,
  useLeadProposalsQuery,
  useLeadQuery,
  useSaveLeadAdhesion,
  useUpdateLead,
  useUploadAdhesionDocument,
} from './useLeads'
import { useActiveOrganization } from './useOrganization'
import { useTeamMembersQuery } from './useTeam'

export function useMobileAdhesion(leadId: string) {
  const { organizationId, membership } = useActiveOrganization()
  const lead = useLeadQuery(organizationId, leadId)
  const funnels = useFunnelsQuery(organizationId)
  const adhesion = useLeadAdhesionQuery(organizationId, leadId)
  const documents = useAdhesionDocumentsQuery(organizationId, leadId)
  const proposals = useLeadProposalsQuery(organizationId, leadId)
  const team = useTeamMembersQuery(organizationId)
  const saveAdhesion = useSaveLeadAdhesion(organizationId, leadId)
  const updateLead = useUpdateLead(organizationId)
  const upload = useUploadAdhesionDocument(organizationId, leadId)
  const remove = useDeleteAdhesionDocument(organizationId, leadId)

  const card = useMemo(() => {
    if (!lead.data) return null
    const stages = funnels.data?.funnels.find((f) => f.id === lead.data.funnelId)?.stages ?? []
    return toCardData(lead.data, stages)
  }, [lead.data, funnels.data])

  const latestProposal = proposals.data?.proposals[0] ?? null
  const form = useMemo(
    () =>
      card && adhesion.data
        ? buildAdhesionForm(card, adhesion.data.adhesion, latestProposal)
        : null,
    [card, adhesion.data, latestProposal],
  )

  const documentList = documents.data?.documents ?? []
  const progress = useMemo(
    () => (form ? adhesionProgress(form, new Set(documentList.map((d) => d.kind))) : null),
    [form, documentList],
  )

  const members = (team.data?.members ?? []).filter((m) => m.status === 'ACTIVE')
  const memberName = (userId: string) => {
    const member = members.find((m) => m.userId === userId)
    return member ? (member.name ?? member.email) : null
  }

  /** Salva a ficha inteira com a mudança — lead primeiro, depois a ficha. */
  const save = useCallback(
    async (next: AdhesionForm) => {
      if (!card) return
      const changes = leadChanges(next, card)
      if (Object.keys(changes).length > 0) {
        await updateLead.mutateAsync({ id: card.id, payload: changes })
      }
      await saveAdhesion.mutateAsync(adhesionFields(next))
    },
    [card, updateLead, saveAdhesion],
  )

  const uploadDocument = useCallback(
    (kind: AdhesionDocumentKind, file: File) => upload.mutateAsync({ kind, file }),
    [upload],
  )

  return {
    lead,
    card,
    form,
    progress,
    isLoading: lead.isLoading || adhesion.isLoading,
    documents: documentList,
    documentsLoading: documents.isLoading,
    members,
    memberName,
    organizationName: membership?.organizationName ?? '',
    save,
    isSaving: saveAdhesion.isPending || updateLead.isPending,
    uploadDocument,
    uploadingKind: upload.isPending ? (upload.variables?.kind ?? null) : null,
    removeDocument: remove.mutateAsync,
    isRemoving: remove.isPending,
  }
}
