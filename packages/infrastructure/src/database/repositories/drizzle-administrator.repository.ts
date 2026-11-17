// DrizzleAdministratorRepository — implementação concreta de
// IAdministratorRepository. Nome repetido na organização (índice único em
// lower(name)) vira ConflictError.

import type {
  AdministratorInput,
  AdministratorRecord,
  IAdministratorRepository,
} from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'
import { and, asc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { administrators } from '../schema'

const COLUMNS = {
  id: administrators.id,
  organizationId: administrators.organizationId,
  name: administrators.name,
  emails: administrators.emails,
  createdAt: administrators.createdAt,
  updatedAt: administrators.updatedAt,
} as const

/** Código do Postgres pra violação de índice único. */
const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as { code?: unknown }).code
  const cause = (error as { cause?: { code?: unknown } }).cause
  return code === UNIQUE_VIOLATION || cause?.code === UNIQUE_VIOLATION
}

function duplicate(name: string): ConflictError {
  return new ConflictError(`Já existe a administradora "${name}".`)
}

export class DrizzleAdministratorRepository implements IAdministratorRepository {
  constructor(private readonly db: Database) {}

  list(organizationId: string): Promise<AdministratorRecord[]> {
    return this.db
      .select(COLUMNS)
      .from(administrators)
      .where(eq(administrators.organizationId, organizationId))
      .orderBy(asc(sql`lower(${administrators.name})`))
  }

  async create(organizationId: string, input: AdministratorInput): Promise<AdministratorRecord> {
    try {
      const rows = await this.db
        .insert(administrators)
        .values({ organizationId, name: input.name, emails: input.emails })
        .returning(COLUMNS)
      const row = rows[0]
      if (!row) throw new Error('Failed to create administrator: no row returned')
      return row
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicate(input.name)
      throw error
    }
  }

  async update(
    id: string,
    organizationId: string,
    input: AdministratorInput,
  ): Promise<AdministratorRecord | null> {
    try {
      const rows = await this.db
        .update(administrators)
        .set({ name: input.name, emails: input.emails, updatedAt: new Date() })
        .where(and(eq(administrators.id, id), eq(administrators.organizationId, organizationId)))
        .returning(COLUMNS)
      return rows[0] ?? null
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicate(input.name)
      throw error
    }
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const rows = await this.db
      .delete(administrators)
      .where(and(eq(administrators.id, id), eq(administrators.organizationId, organizationId)))
      .returning({ id: administrators.id })
    return rows.length > 0
  }
}
