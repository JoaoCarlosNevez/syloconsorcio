// ITaskRepository — port para persistência de tarefas/atividades.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Visibilidade segue o mesmo DataScope de leads (ver leads/lead-scope.ts) —
// reaproveitado aqui porque a resolução (organizationIds + assignedUserId
// opcional pra DataScope.OWN) é idêntica: um Vendedor só vê as próprias
// tarefas, um Supervisor vê as da representação, etc.

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida'

/** 'atrasada' é um filtro derivado (status != 'concluida' AND dueAt no
 * passado) — nunca persistido, ver nota em schema/tasks.ts. 'abertas' =
 * qualquer status exceto 'concluida' (atrasadas incluídas). 'todos' remove o
 * filtro de status. */
export type TaskStatusFilter = TaskStatus | 'atrasada' | 'abertas' | 'todos'

export interface TaskRecord {
  id: string
  organizationId: string
  leadId: string | null
  assignedUserId: string
  createdByUserId: string
  type: string
  title: string
  notes: string | null
  status: TaskStatus
  dueAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface NewTaskInput {
  organizationId: string
  leadId?: string | null
  assignedUserId: string
  createdByUserId: string
  type: string
  title: string
  notes?: string | null
  dueAt: Date
}

export interface UpdateTaskInput {
  leadId?: string | null
  assignedUserId?: string
  type?: string
  title?: string
  notes?: string | null
  status?: TaskStatus
  dueAt?: Date
}

export interface TaskScopeFilter {
  /** Organizações visíveis nesta requisição — resolvidas a partir do DataScope. */
  organizationIds: string[]
  /** Presente apenas quando DataScope.OWN — restringe às tarefas do próprio usuário. */
  assignedUserId?: string
}

export interface TaskListFilter extends TaskScopeFilter {
  leadId?: string
  status?: TaskStatusFilter
  /** Tipo da tarefa (ex: "Ligação") — texto livre no banco, validado na rota. */
  type?: string
  /** Busca livre por título. */
  search?: string
}

export interface TaskListPage {
  items: TaskRecord[]
  total: number
  page: number
  pageSize: number
}

export interface ITaskRepository {
  /** Ordenado por prazo (dueAt) ascendente — mais urgentes primeiro. */
  list(filter: TaskListFilter, page: number, pageSize: number): Promise<TaskListPage>

  /** Retorna null se a tarefa não existir ou estiver fora do escopo. */
  findById(id: string, scope: TaskScopeFilter): Promise<TaskRecord | null>

  create(input: NewTaskInput): Promise<TaskRecord>

  /** Retorna null se a tarefa não existir ou estiver fora do escopo. */
  update(id: string, scope: TaskScopeFilter, input: UpdateTaskInput): Promise<TaskRecord | null>

  /** Retorna false se a tarefa não existir ou estiver fora do escopo. */
  delete(id: string, scope: TaskScopeFilter): Promise<boolean>
}
