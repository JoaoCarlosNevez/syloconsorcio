// DrizzleTaskRepository — implementação concreta de ITaskRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).
// `organizationIds` vazio nunca deve virar "SELECT * FROM tasks" — retorna
// vazio/false imediatamente em vez de emitir um `IN ()` inválido.

import type {
  ITaskRepository,
  NewTaskInput,
  TaskCountFilter,
  TaskListFilter,
  TaskListPage,
  TaskRecord,
  TaskScopeFilter,
  TaskStatus,
  UpdateTaskInput,
} from '@sylocrm/application'
import { and, asc, count, eq, gte, ilike, inArray, lt, ne, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { type DbTask, tasks } from '../schema'

const TASK_COLUMNS = {
  id: tasks.id,
  organizationId: tasks.organizationId,
  leadId: tasks.leadId,
  assignedUserId: tasks.assignedUserId,
  createdByUserId: tasks.createdByUserId,
  type: tasks.type,
  title: tasks.title,
  notes: tasks.notes,
  status: tasks.status,
  dueAt: tasks.dueAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
} as const

function toTaskRecord(row: DbTask): TaskRecord {
  return { ...row, status: row.status as TaskStatus }
}

function buildScopeConditions(scope: TaskScopeFilter) {
  const conditions = [inArray(tasks.organizationId, scope.organizationIds)]
  if (scope.assignedUserId) {
    conditions.push(eq(tasks.assignedUserId, scope.assignedUserId))
  }
  return conditions
}

export class DrizzleTaskRepository implements ITaskRepository {
  constructor(private readonly db: Database) {}

  async list(filter: TaskListFilter, page: number, pageSize: number): Promise<TaskListPage> {
    if (filter.organizationIds.length === 0) {
      return { items: [], total: 0, page, pageSize }
    }

    const conditions = [...buildScopeConditions(filter)]
    if (filter.leadId) {
      conditions.push(eq(tasks.leadId, filter.leadId))
    }
    if (filter.status && filter.status !== 'todos') {
      if (filter.status === 'atrasada') {
        conditions.push(sql`${tasks.status} != 'concluida' AND ${tasks.dueAt} < now()`)
      } else if (filter.status === 'abertas') {
        conditions.push(ne(tasks.status, 'concluida'))
      } else {
        conditions.push(eq(tasks.status, filter.status))
      }
    }
    if (filter.type) {
      conditions.push(eq(tasks.type, filter.type))
    }
    if (filter.search) {
      conditions.push(ilike(tasks.title, `%${filter.search}%`))
    }
    const where = and(...conditions)

    const [rows, countRows] = await Promise.all([
      this.db
        .select(TASK_COLUMNS)
        .from(tasks)
        .where(where)
        .orderBy(asc(tasks.dueAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(where),
    ])

    return {
      items: rows.map(toTaskRecord),
      total: countRows[0]?.count ?? 0,
      page,
      pageSize,
    }
  }

  async create(input: NewTaskInput): Promise<TaskRecord> {
    const rows = await this.db
      .insert(tasks)
      .values({
        organizationId: input.organizationId,
        leadId: input.leadId ?? null,
        assignedUserId: input.assignedUserId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        title: input.title,
        notes: input.notes ?? null,
        dueAt: input.dueAt,
        status: input.status ?? 'pendente',
      })
      .returning(TASK_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create task: no row returned')
    return toTaskRecord(row)
  }

  async findById(id: string, scope: TaskScopeFilter): Promise<TaskRecord | null> {
    if (scope.organizationIds.length === 0) return null

    const rows = await this.db
      .select(TASK_COLUMNS)
      .from(tasks)
      .where(and(eq(tasks.id, id), ...buildScopeConditions(scope)))
      .limit(1)

    const row = rows[0]
    return row ? toTaskRecord(row) : null
  }

  async update(
    id: string,
    scope: TaskScopeFilter,
    input: UpdateTaskInput,
  ): Promise<TaskRecord | null> {
    if (scope.organizationIds.length === 0) return null

    const rows = await this.db
      .update(tasks)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), ...buildScopeConditions(scope)))
      .returning(TASK_COLUMNS)

    const row = rows[0]
    return row ? toTaskRecord(row) : null
  }

  async delete(id: string, scope: TaskScopeFilter): Promise<boolean> {
    if (scope.organizationIds.length === 0) return false

    const rows = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), ...buildScopeConditions(scope)))
      .returning({ id: tasks.id })

    return rows.length > 0
  }

  async count(filter: TaskCountFilter): Promise<number> {
    const conditions = [
      eq(tasks.organizationId, filter.organizationId),
      eq(tasks.assignedUserId, filter.assignedUserId),
      eq(tasks.type, filter.type),
      gte(tasks.dueAt, filter.dueFrom),
      lt(tasks.dueAt, filter.dueTo),
    ]
    if (filter.status) conditions.push(eq(tasks.status, filter.status))

    const rows = await this.db
      .select({ total: count() })
      .from(tasks)
      .where(and(...conditions))

    return rows[0]?.total ?? 0
  }
}
