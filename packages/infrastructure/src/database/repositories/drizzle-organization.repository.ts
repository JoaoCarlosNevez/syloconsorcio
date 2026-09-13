// DrizzleOrganizationRepository — implementação concreta de IOrganizationRepository.
//
// ADR-08: Drizzle é o único ORM. Queries passam sempre por este client.

import type { IOrganizationRepository } from '@sylocrm/application'
import { eq } from 'drizzle-orm'
import type { Database } from '../client'
import { organizations } from '../schema'

export class DrizzleOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: Database) {}

  async findChildOrganizationIds(parentOrganizationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, parentOrganizationId))

    return rows.map((row) => row.id)
  }
}
