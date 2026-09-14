// DrizzleMembershipRepository — implementação concreta de IMembershipRepository.
//
// Acessa organization_memberships com JOIN em organizations/users quando
// necessário para obter o tipo/nome/ícone da organização ou os dados do usuário.
// Usa queries explícitas com seleção de colunas (sem SELECT *).
// ADR-08: Drizzle é o único ORM. Queries passam sempre por este client.

import type {
  IMembershipRepository,
  NewMembershipInput,
  OrganizationBranding,
  TeamMember,
  UserMembership,
} from '@sylocrm/application'
import type { OrganizationType, Role } from '@sylocrm/domain'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../client'
import { organizationMemberships, organizations, users } from '../schema'

const MEMBERSHIP_COLUMNS = {
  organizationId: organizationMemberships.organizationId,
  organizationType: organizations.type,
  organizationName: organizations.name,
  organizationBranding: organizations.branding,
  role: organizationMemberships.role,
  status: organizationMemberships.status,
} as const

function toUserMembership(row: {
  organizationId: string
  organizationType: string
  organizationName: string
  organizationBranding: unknown
  role: string
  status: string
}): UserMembership {
  const branding = row.organizationBranding as OrganizationBranding | null
  return {
    organizationId: row.organizationId,
    organizationType: row.organizationType as OrganizationType,
    organizationName: row.organizationName,
    organizationIconUrl: branding?.iconUrl ?? null,
    role: row.role as Role,
    status: row.status as UserMembership['status'],
  }
}

export class DrizzleMembershipRepository implements IMembershipRepository {
  constructor(private readonly db: Database) {}

  async findActiveByUserId(userId: string): Promise<UserMembership[]> {
    const rows = await this.db
      .select(MEMBERSHIP_COLUMNS)
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, 'ACTIVE'),
        ),
      )

    return rows.map(toUserMembership)
  }

  async findActiveByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<UserMembership | null> {
    const rows = await this.db
      .select(MEMBERSHIP_COLUMNS)
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.status, 'ACTIVE'),
        ),
      )
      .limit(1)

    const row = rows[0]
    return row ? toUserMembership(row) : null
  }

  async findActiveByOrganizationId(organizationId: string): Promise<TeamMember[]> {
    const rows = await this.db
      .select({
        userId: organizationMemberships.userId,
        name: users.name,
        email: users.email,
        role: organizationMemberships.role,
        status: organizationMemberships.status,
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.status, 'ACTIVE'),
        ),
      )

    return rows.map((row) => ({ ...row, role: row.role as Role }))
  }

  async create(input: NewMembershipInput): Promise<void> {
    await this.db.insert(organizationMemberships).values({
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
    })
  }
}
