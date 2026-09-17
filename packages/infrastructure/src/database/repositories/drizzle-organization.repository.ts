// DrizzleOrganizationRepository — implementação concreta de IOrganizationRepository.
//
// ADR-02: Drizzle é o único ORM. Queries passam sempre por este client.

import type {
  IOrganizationRepository,
  NewOrganizationInput,
  OrganizationBranding,
  OrganizationRecord,
  UpdateOrganizationInput,
} from '@sylocrm/application'
import type { OrganizationType } from '@sylocrm/domain'
import { desc, eq } from 'drizzle-orm'
import type { Database } from '../client'
import { organizations } from '../schema'

const ORGANIZATION_COLUMNS = {
  id: organizations.id,
  name: organizations.name,
  type: organizations.type,
  parentOrganizationId: organizations.parentOrganizationId,
  isWhiteLabel: organizations.isWhiteLabel,
  branding: organizations.branding,
  cnpj: organizations.cnpj,
  phone: organizations.phone,
  website: organizations.website,
} as const

function toOrganizationRecord(row: {
  id: string
  name: string
  type: string
  parentOrganizationId: string | null
  isWhiteLabel: boolean
  branding: unknown
  cnpj: string | null
  phone: string | null
  website: string | null
}): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type as OrganizationType,
    parentOrganizationId: row.parentOrganizationId,
    isWhiteLabel: row.isWhiteLabel,
    branding: (row.branding as OrganizationBranding | null) ?? null,
    cnpj: row.cnpj,
    phone: row.phone,
    website: row.website,
  }
}

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
    return toOrganizationRecord(row)
  }

  async list(): Promise<OrganizationRecord[]> {
    const rows = await this.db
      .select(ORGANIZATION_COLUMNS)
      .from(organizations)
      .orderBy(desc(organizations.createdAt))

    return rows.map(toOrganizationRecord)
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const rows = await this.db
      .select(ORGANIZATION_COLUMNS)
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1)

    const row = rows[0]
    return row ? toOrganizationRecord(row) : null
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationRecord | null> {
    const rows = await this.db
      .update(organizations)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isWhiteLabel !== undefined ? { isWhiteLabel: input.isWhiteLabel } : {}),
        ...(input.branding !== undefined ? { branding: input.branding } : {}),
        ...(input.cnpj !== undefined ? { cnpj: input.cnpj } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.website !== undefined ? { website: input.website } : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning(ORGANIZATION_COLUMNS)

    const row = rows[0]
    return row ? toOrganizationRecord(row) : null
  }
}
