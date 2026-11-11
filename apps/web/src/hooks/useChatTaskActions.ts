// useChatTaskActions — "Pegar" e "Concluir" no card de tarefa do chat. Depois
// de mexer na tarefa, a conversa recarrega pra o card mostrar o estado novo.

import { useToast } from '@sylocrm/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useClaimTask, useUpdateTask } from './useTasks'

export function useChatTaskActions(organizationId: string | null, conversationId: string) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const claimTask = useClaimTask(organizationId)
  const updateTask = useUpdateTask(organizationId)

  function refresh() {
    queryClient.invalidateQueries({
      queryKey: ['chat', organizationId, 'messages', conversationId],
    })
  }

  function fail(title: string) {
    return (error: unknown) =>
      toast({
        type: 'error',
        title,
        description: error instanceof Error ? error.message : undefined,
      })
  }

  const busyTaskId = claimTask.isPending
    ? (claimTask.variables ?? null)
    : updateTask.isPending
      ? (updateTask.variables?.id ?? null)
      : null

  return {
    busyTaskId,
    claim(taskId: string) {
      claimTask.mutate(taskId, {
        onSuccess: () => {
          toast({ type: 'success', title: 'Tarefa é sua agora' })
          refresh()
        },
        onError: fail('Não foi possível pegar a tarefa'),
      })
    },
    complete(taskId: string) {
      updateTask.mutate(
        { id: taskId, payload: { status: 'concluida' } },
        { onSuccess: refresh, onError: fail('Não foi possível concluir a tarefa') },
      )
    },
  }
}
