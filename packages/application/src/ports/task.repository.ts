// ITaskRepository — port para persistência de tarefas/atividades.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Visibilidade segue o mesmo DataScope de leads (ver leads/lead-scope.ts) —
// reaproveitado aqui porque a resolução (organizationIds + assignedUserId
// opcional pra DataScope.OWN) é idêntica: um Vendedor só vê as próprias
// tarefas, um Supervisor vê as da representação, etc.

import type { MemberSector } from '@sylocrm/domain'

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
  /** null = tarefa na fila de um setor, ainda sem ninguém (ver assignedSector). */
  assignedUserId: string | null
  /** Setor pra onde a tarefa foi mandada; continua registrado depois que
   * alguém pega. null nas tarefas mandadas direto pra uma pessoa. */
  assignedSector: MemberSector | null
  createdByUserId: string
  type: string
  title: string
  notes: string | null
  status: TaskStatus
  /** null = sem prazo (pedidos do chat): nunca fica atrasada. */
  dueAt: Date | null
  /** Quando foi concluída; null enquanto não concluída. */
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NewTaskInput {
  organizationId: string
  leadId?: string | null
  /** Pessoa responsável; null quando vai pra fila de um setor. */
  assignedUserId: string | null
  assignedSector?: MemberSector | null
  createdByUserId: string
  type: string
  title: string
  notes?: string | null
  dueAt: Date | null
  /** Padrão 'pendente'. 'concluida' registra algo que já aconteceu (ex: a
   * visita que o cliente acabou de fazer). */
  status?: TaskStatus
}

export interface UpdateTaskInput {
  leadId?: string | null
  assignedUserId?: string
  type?: string
  title?: string
  notes?: string | null
  status?: TaskStatus
  /** null tira o prazo. */
  dueAt?: Date | null
}

export interface TaskScopeFilter {
  /** Organizações visíveis nesta requisição — resolvidas a partir do DataScope. */
  organizationIds: string[]
  /** Só as tarefas atribuídas a este usuário ("minhas tarefas"). */
  assignedUserId?: string
  /** DataScope.OWN (ver task-scope.ts): as tarefas do usuário, as que ele
   * pediu pra outra pessoa e as da fila dos setores dele (ownSectors). */
  ownUserId?: string
  ownSectors?: readonly MemberSector[]
  /** Supervisor com time — atribuídas a um destes usuários ou sem responsável. */
  teamUserIds?: string[]
}

export interface TaskListFilter extends TaskScopeFilter {
  leadId?: string
  status?: TaskStatusFilter
  /** Tipo da tarefa (ex: "Ligação") — texto livre no banco, validado na rota. */
  type?: string
  /** Busca livre por título. */
  search?: string
}

/** Contagem das tarefas de um responsável por tipo e prazo — cards do início. */
export interface TaskCountFilter {
  organizationId: string
  assignedUserId: string
  type: string
  /** Prazo (dueAt) em [dueFrom, dueTo). */
  dueFrom?: Date
  dueTo?: Date
  /** Concluída (completedAt) em [completedFrom, completedTo) — o ranking de
   * ligações e visitas conta pelo dia em que foram feitas. */
  completedFrom?: Date
  completedTo?: Date
  /** Só tarefas neste status; ausente = qualquer status. */
  status?: TaskStatus
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

  /** Fila de setor: atribui a tarefa ao usuário só se ela ainda estiver sem
   * ninguém (dois pegando ao mesmo tempo: o segundo recebe null). */
  claim(id: string, scope: TaskScopeFilter, userId: string): Promise<TaskRecord | null>

  /** Retorna false se a tarefa não existir ou estiver fora do escopo. */
  delete(id: string, scope: TaskScopeFilter): Promise<boolean>

  count(filter: TaskCountFilter): Promise<number>
}
