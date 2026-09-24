// Tipos e configuração visual compartilhados entre TarefasPage, TaskModal e o
// card de Tarefas do LeadModal. O tipo `Task` de verdade vem da API — ver
// ../../lib/tasks-api.ts.

import type { Task, TaskStatus, TaskType } from '../../lib/tasks-api'

export type { Task, TaskStatus, TaskType, TaskStatusFilter } from '../../lib/tasks-api'

export type ViewMode = 'lista' | 'calendario'

/** 'atrasada' é sempre calculado a partir de status+dueAt — nunca vem do
 * backend como status persistido (ver lib/tasks-api.ts). */
export type DisplayStatus = TaskStatus | 'atrasada'

export interface TypeBadge {
  label: TaskType
  bg: string
  border: string
  color: string
}

export const TYPE_BADGES: Record<TaskType, TypeBadge> = {
  Ligação: { label: 'Ligação', bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  Reunião: { label: 'Reunião', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  'Follow-up': { label: 'Follow-up', bg: '#faf5ff', border: '#e9d5ff', color: '#7e22ce' },
  Tarefa: { label: 'Tarefa', bg: '#f3f4f6', border: '#e5e7eb', color: '#4b5563' },
  Simulação: { label: 'Simulação', bg: '#eef2ff', border: '#c7d2fe', color: '#4338ca' },
}

export const TASK_TYPES: TaskType[] = ['Ligação', 'Reunião', 'Follow-up', 'Tarefa', 'Simulação']

export const STATUS_CFG: Record<
  DisplayStatus,
  { dot: string; label: string; bg: string; border: string; color: string }
> = {
  atrasada: {
    dot: '#ba1a1a',
    label: 'Atrasada',
    bg: '#fff1f2',
    border: '#fecdd3',
    color: '#ba1a1a',
  },
  em_andamento: {
    dot: '#3b82f6',
    label: 'Em andamento',
    bg: '#eff6ff',
    border: '#bfdbfe',
    color: '#1d4ed8',
  },
  pendente: {
    dot: '#94a3b8',
    label: 'Pendente',
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#475569',
  },
  concluida: {
    dot: '#059669',
    label: 'Concluída',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    color: '#047857',
  },
}

/** Status "de verdade" só tem 3 valores — "atrasada" é sempre derivado aqui a
 * partir do prazo, nunca lido de um campo persistido. */
export function displayStatus(task: Pick<Task, 'status' | 'dueAt'>): DisplayStatus {
  if (task.status === 'concluida') return 'concluida'
  return new Date(task.dueAt).getTime() < Date.now() ? 'atrasada' : task.status
}

export function formatTaskDateTime(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}
