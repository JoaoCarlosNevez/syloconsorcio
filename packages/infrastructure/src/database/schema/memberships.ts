// Schema: organization_memberships
//
// Entidade central de autorização (ADR-05).
// Role está no membership — não no usuário global.
// O mesmo usuário pode ter roles diferentes em organizações diferentes.
//
// Constraint UNIQUE (user_id, organization_id): um usuário não pode ter
// dois memberships na mesma organização.

import { bigint, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const membershipStatusEnum = pgEnum('membership_status', ['ACTIVE', 'INVITED', 'SUSPENDED'])

export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'SELLER'])

export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    role: roleEnum('role').notNull(),
    status: membershipStatusEnum('status').notNull().default('ACTIVE'),
    // Meta de vendas do membro nesta organização, em valor de crédito
    // (centavos). null = sem meta definida. bigint porque metas somadas de
    // crédito de consórcio passam fácil do teto de integer (~R$ 21 mi).
    salesGoalCents: bigint('sales_goal_cents', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.organizationId)],
)

export type DbMembership = typeof organizationMemberships.$inferSelect
export type NewDbMembership = typeof organizationMemberships.$inferInsert
