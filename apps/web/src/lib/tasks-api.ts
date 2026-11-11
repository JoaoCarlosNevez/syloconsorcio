// Tipos e chamadas HTTP do módulo de Tarefas.
// Espelha o contrato de apps/api/src/routes/tasks.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'
import type { Sector } from './sectors'

export type TaskType = 'Ligação' | 'Reunião' | 'Visita' | 'Follow-up' | 'Tarefa' | 'Pendência'
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida'

/** 'atrasada' é derivado no backend (não concluída + prazo já vencido) —
 * nunca persistido. 'abertas' = não concluídas. 'todos' remove o filtro. */
export type TaskStatusFilter = TaskStatus | 'atrasada' | 'abertas' | 'todos'

export interface Task {
  id: string
  organizationId: string
  leadId: string | null
  /** null = na fila de um setor, esperando alguém pegar. */
  assignedUserId: string | null
  /** Setor pra onde a tarefa foi mandada (continua depois que alguém pega). */
  assignedSector: Sector | null
  createdByUserId: string
  type: TaskType
  title: string
  notes: string | null
  status: TaskStatus
  /** null = sem prazo: nunca fica atrasada. */
  dueAt: string | null
  /** Quando foi concluída; null enquanto não concluída. */
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskListPage {
  items: Task[]
  total: number
  page: number
  pageSize: number
}

export interface ListTasksParams {
  leadId?: string
  status?: TaskStatusFilter
  type?: TaskType
  /** Só as tarefas atribuídas ao próprio usuário. */
  mine?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export interface CreateTaskPayload {
  leadId?: string | null
  assignedUserId?: string | null
  /** Manda pra fila do setor em vez de uma pessoa. */
  assignedSector?: Sector | null
  type: TaskType
  title: string
  notes?: string | null
  /** null = sem prazo. */
  dueAt: string | null
  /** 'concluida' registra algo que já aconteceu; padrão 'pendente'. */
  status?: TaskStatus
}

export interface UpdateTaskPayload {
  leadId?: string | null
  assignedUserId?: string
  type?: TaskType
  title?: string
  notes?: string | null
  status?: TaskStatus
  /** null tira o prazo. */
  dueAt?: string | null
}

function toQueryString(params: ListTasksParams): string {
  const search = new URLSearchParams()
  if (params.leadId) search.set('leadId', params.leadId)
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  if (params.mine) search.set('mine', 'true')
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function listTasks(
  organizationId: string,
  params: ListTasksParams = {},
): Promise<TaskListPage> {
  return apiClient.get<TaskListPage>(`/tasks${toQueryString(params)}`, { organizationId })
}

export function createTask(organizationId: string, payload: CreateTaskPayload): Promise<Task> {
  return apiClient.post<Task>('/tasks', payload, { organizationId })
}

export function updateTask(
  organizationId: string,
  id: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  return apiClient.patch<Task>(`/tasks/${id}`, payload, { organizationId })
}

export function deleteTask(organizationId: string, id: string): Promise<void> {
  return apiClient.delete<void>(`/tasks/${id}`, { organizationId })
}

/** Pega uma tarefa da fila do setor (vira o responsável). 409 se alguém pegou antes. */
export function claimTask(organizationId: string, id: string): Promise<Task> {
  return apiClient.post<Task>(`/tasks/${id}/claim`, {}, { organizationId })
}
