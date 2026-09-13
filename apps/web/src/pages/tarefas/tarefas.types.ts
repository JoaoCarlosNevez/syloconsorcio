// Tipos compartilhados entre TarefasPage e TaskModal

export type ViewMode = 'lista' | 'calendario'
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
}
