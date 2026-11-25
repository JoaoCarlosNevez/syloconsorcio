// useTasks — server state do módulo de Tarefas via TanStack Query (ADR-04).

import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateTaskPayload,
  type ListTasksParams,
  type TaskListPage,
  type UpdateTaskPayload,
  claimTask,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '../lib/tasks-api'

function tasksQueryKey(organizationId: string | null, params: ListTasksParams) {
  return ['tasks', organizationId, params] as const
}

export function useTasksQuery(organizationId: string | null, params: ListTasksParams = {}) {
  return useQuery<TaskListPage>({
    queryKey: tasksQueryKey(organizationId, params),
    queryFn: () => listTasks(organizationId as string, params),
    enabled: Boolean(organizationId),
  })
}

export function useCreateTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(organizationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
      // Concluir/remarcar/reatribuir muda quais lembretes o sininho mostra.
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] })
    },
  })
}

function updateTaskMutationKey(organizationId: string | null) {
  return ['tasks', 'update', organizationId] as const
}

export function useUpdateTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: updateTaskMutationKey(organizationId),
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      updateTask(organizationId as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
      // Concluir/remarcar/reatribuir muda quais lembretes o sininho mostra.
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] })
    },
  })
}

/** Tarefas com "concluir/reabrir" ainda salvando — em qualquer tela (lista,
 * card do lead, detalhe, celular). Serve pra travar o check e mostrar que está
 * carregando, em vez de deixar a pessoa clicar de novo. */
export function useTasksChangingStatus(organizationId: string | null): Set<string> {
  const ids = useMutationState({
    filters: { mutationKey: updateTaskMutationKey(organizationId), status: 'pending' },
    select: (mutation) => {
      const variables = mutation.state.variables as
        | { id: string; payload: UpdateTaskPayload }
        | undefined
      return variables?.payload.status !== undefined ? variables.id : null
    },
  })
  return new Set(ids.filter((id): id is string => id !== null))
}

export function useDeleteTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
      // Concluir/remarcar/reatribuir muda quais lembretes o sininho mostra.
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] })
    },
  })
}

/** Pega uma tarefa da fila do setor. */
export function useClaimTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => claimTask(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] })
    },
  })
}
