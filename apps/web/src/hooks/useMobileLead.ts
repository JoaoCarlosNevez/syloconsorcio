// useMobileLead — o lead aberto no app do celular e as ações de rua: registrar
// ligação/visita (como tarefa já concluída, que conta no histórico e na
// ofensiva), mudar etapa, ganhar, perder, comentar e reenviar a proposta.

import { useCallback, useMemo } from 'react'
import { proposalShareUrl } from '../lib/leads-api'
import { tomorrowAtTen } from '../lib/mobile'
import { useFunnelsQuery } from './useFunnels'
import {
  useCreateLeadComment,
  useLeadHistoryQuery,
  useLeadProposalsQuery,
  useLeadQuery,
  useShareLeadProposal,
  useUpdateLead,
} from './useLeads'
import { useActiveOrganization } from './useOrganization'
import { useCreateTask, useTasksQuery } from './useTasks'

export type CallResult = 'atendeu' | 'nao_atendeu'

export function useMobileLead(leadId: string) {
  const { organizationId } = useActiveOrganization()
  const lead = useLeadQuery(organizationId, leadId)
  const funnels = useFunnelsQuery(organizationId)
  const history = useLeadHistoryQuery(organizationId, leadId)
  const proposals = useLeadProposalsQuery(organizationId, leadId)
  const openTasks = useTasksQuery(organizationId, { leadId, status: 'abertas', pageSize: 20 })
  const updateLead = useUpdateLead(organizationId)
  const createTask = useCreateTask(organizationId)
  const createComment = useCreateLeadComment(organizationId, leadId)
  const shareProposal = useShareLeadProposal(organizationId, leadId)

  const funnel = useMemo(
    () => funnels.data?.funnels.find((f) => f.id === lead.data?.funnelId) ?? null,
    [funnels.data, lead.data?.funnelId],
  )
  const stages = funnel?.stages ?? []
  const stageIndex = stages.findIndex((stage) => stage.id === lead.data?.stageId)

  const logDone = useCallback(
    (type: 'Ligação' | 'Visita', title: string, notes?: string) =>
      createTask.mutateAsync({
        leadId,
        type,
        title,
        notes: notes ?? null,
        dueAt: new Date().toISOString(),
        status: 'concluida',
      }),
    [createTask, leadId],
  )

  const registerCall = useCallback(
    async (result: CallResult, scheduleReturn: boolean) => {
      await logDone(
        'Ligação',
        result === 'atendeu' ? 'Ligação feita · atendeu' : 'Tentativa de ligação · não atendeu',
      )
      if (scheduleReturn) {
        await createTask.mutateAsync({
          leadId,
          type: 'Ligação',
          title: `Retornar ligação${lead.data ? ` para ${lead.data.name}` : ''}`,
          dueAt: tomorrowAtTen(new Date()).toISOString(),
        })
      }
    },
    [createTask, lead.data, leadId, logDone],
  )

  /** Visita feita também leva o card pra etapa "Visita", se ainda estiver antes. */
  const registerVisit = useCallback(async () => {
    await logDone('Visita', 'Visita feita')
    const visitIndex = stages.findIndex((stage) => stage.name.toLowerCase() === 'visita')
    const visitStage = stages[visitIndex]
    if (visitStage && stageIndex >= 0 && stageIndex < visitIndex) {
      await updateLead.mutateAsync({ id: leadId, payload: { stageId: visitStage.id } })
    }
  }, [leadId, logDone, stageIndex, stages, updateLead])

  const moveToStage = useCallback(
    (stageId: string) => updateLead.mutateAsync({ id: leadId, payload: { stageId } }),
    [leadId, updateLead],
  )

  const markWon = useCallback(
    () => updateLead.mutateAsync({ id: leadId, payload: { won: true } }),
    [leadId, updateLead],
  )

  const markLost = useCallback(
    (reason: string) =>
      updateLead.mutateAsync({ id: leadId, payload: { lost: true, lostReason: reason } }),
    [leadId, updateLead],
  )

  /** Gera (ou reaproveita) o link público e devolve a URL pra mandar. */
  const proposalLink = useCallback(
    async (proposalId: string, existingToken: string | null) => {
      const token = existingToken ?? (await shareProposal.mutateAsync(proposalId)).shareToken
      return proposalShareUrl(token)
    },
    [shareProposal],
  )

  return {
    lead,
    stages,
    stageIndex,
    history,
    proposals,
    openTasks,
    isSaving: updateLead.isPending || createTask.isPending,
    registerCall,
    registerVisit,
    moveToStage,
    markWon,
    markLost,
    addComment: createComment.mutateAsync,
    isCommenting: createComment.isPending,
    proposalLink,
  }
}
