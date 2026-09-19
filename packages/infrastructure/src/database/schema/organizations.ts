// Schema: organizations
//
// Hierarquia: INCORPORADORA → MASTER → REPRESENTACAO
// REPRESENTACAO com parent_organization_id = null é independente.

import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const organizationTypeEnum = pgEnum('organization_type', [
  'INCORPORADORA',
  'MASTER',
  'REPRESENTACAO',
])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: organizationTypeEnum('type').notNull(),
  parentOrganizationId: uuid('parent_organization_id').references(
    // Self-referential FK — AnyPgColumn is the correct return type for Drizzle
    (): AnyPgColumn => organizations.id,
  ),
  // Identidade visual (AGENTS.md §11): por padrão toda Representação usa a
  // marca Sylo. Só organizações White Label podem definir um ícone próprio —
  // ver branding.iconUrl, só respeitado pelo frontend quando isWhiteLabel=true.
  isWhiteLabel: boolean('is_white_label').notNull().default(false),
  branding: jsonb('branding'),
  // Dados cadastrais — editáveis pelo ADMIN da própria Representação em
  // Configurações > Organização (ver apps/api/src/routes/organization-settings.route.ts).
  cnpj: text('cnpj'),
  phone: text('phone'),
  website: text('website'),
  // Tipos de crédito/segmento que esta organização trabalha (ex: "Imobiliário",
  // "Auto", "Pesado") — configurados em Configurações > Organização e usados
  // pra popular o campo Segmento na criação de lead (não é mais texto livre).
  // Toda organização nova já nasce com estes 3 — decisão de produto, editável
  // depois pelo ADMIN.
  leadSegments: text('lead_segments').array().notNull().default(['Imobiliário', 'Auto', 'Pesado']),
  // Origens de lead — mesmo mecanismo do leadSegments, populando o campo
  // Origem na criação de lead. Toda organização nova já nasce com estas 3.
  leadSources: text('lead_sources')
    .array()
    .notNull()
    .default(['Facebook', 'Prospecção Ativa', 'Indicação']),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbOrganization = typeof organizations.$inferSelect
export type NewDbOrganization = typeof organizations.$inferInsert
