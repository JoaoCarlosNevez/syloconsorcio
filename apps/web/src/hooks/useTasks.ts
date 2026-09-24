// useTasks — server state do módulo de Tarefas via TanStack Query (ADR-04).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateTaskPayload,
  type ListTasksParams,
  type TaskListPage,
  type UpdateTaskPayload,
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
    },
  })
}

export function useUpdateTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      updateTask(organizationId as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
    },
  })
}

export function useDeleteTask(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', organizationId] })
    },
  })
}
