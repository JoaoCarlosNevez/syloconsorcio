// DrizzleOrganizationRepository — implementação concreta de IOrganizationRepository.
//
// ADR-08: Drizzle é o único ORM. Queries passam sempre por este client.

import type {
  IOrganizationRepository,
  NewOrganizationInput,
  OrganizationRecord,
} from '@sylocrm/application'
import type { OrganizationType } from '@sylocrm/domain'
import { eq } from 'drizzle-orm'
import type { Database } from '../client'
import { organizations } from '../schema'

const ORGANIZATION_COLUMNS = {
  id: organizations.id,
  name: organizations.name,
  type: organizations.type,
  parentOrganizationId: organizations.parentOrganizationId,
} as const

export class DrizzleOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: Database) {}

  async findChildOrganizationIds(parentOrganizationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, parentOrganizationId))

    return rows.map((row) => row.id)
  }

  async create(input: NewOrganizationInput): Promise<OrganizationRecord> {
    const rows = await this.db
      .insert(organizations)
      .values({
        name: input.name,
        type: input.type,
        parentOrganizationId: input.parentOrganizationId ?? null,
      })
      .returning(ORGANIZATION_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create organization: no row returned')
    return { ...row, type: row.type as OrganizationType }
  }
}
