// Tipos compartilhados entre TarefasPage e TaskModal

export type ViewMode = 'lista' | 'calendario' | 'gantt'
export type TaskStatus = 'atrasada' | 'em_andamento' | 'pendente' | 'concluida'

export interface TypeBadge {
  label: string
  bg: string
  border: string
  color: string
}

export interface Task {
  id: string
  type: TypeBadge
  title: string
  lead: string
  dateTime: string
  status: TaskStatus
  // Gantt: offset from today in the week (0=today, -1=yesterday, +1=tomorrow)
  ganttOffset: number
  ganttSpan: number
  ganttLabel: string
  ganttSubLabel?: string
  ganttLeadName?: string
  ganttLeadSub?: string
}
