// IOrganizationRepository — port para leitura, criação e atualização de organizações.
//
// Usado pelo resolvedor de DataScope (packages/application/src/leads/lead-scope.ts)
// para descobrir quais organizações um Membership MASTER ou INCORPORADORA alcança,
// pelo fluxo de criação de Representações (Super Admin), e pelo painel de
// Administração (listar/editar tenants).
// Implementação concreta: packages/infrastructure/src/database/repositories/

import type { OrganizationType } from '@sylocrm/domain'

export interface OrganizationBranding {
  iconUrl?: string
  /** Cor secundária (hex "#RRGGBB") — substitui o âmbar da Sylo (tokens
   * --color-accent*) enquanto a organização está ativa. Só White Label. */
  secondaryColor?: string
}

export interface OrganizationRecord {
  id: string
  name: string
  type: OrganizationType
  parentOrganizationId: string | null
  /** Só organizações White Label podem definir branding.iconUrl (AGENTS.md §11). */
  isWhiteLabel: boolean
  branding: OrganizationBranding | null
  cnpj: string | null
  phone: string | null
  website: string | null
  /** Tipos de crédito/segmento que a organização trabalha — usado pra popular
   * o campo Segmento na criação de lead. */
  leadSegments: string[]
  /** Origens de lead (ex: "Facebook", "Indicação") — usado pra popular o
   * campo Origem na criação de lead. */
  leadSources: string[]
  /** Tags livres (ex: "Quente", "Frio") — um lead pode ter várias ao mesmo
   * tempo. Usado pra popular o filtro de tags e o editor de tags no Kanban. */
  leadTags: string[]
  /** Meta de vendas mensal da organização, em centavos de crédito. null = sem meta. */
  salesGoalCents: number | null
}

export interface NewOrganizationInput {
  name: string
  type: OrganizationType
  parentOrganizationId?: string | null
}

export interface UpdateOrganizationInput {
  name?: string
  isWhiteLabel?: boolean
  branding?: OrganizationBranding
  cnpj?: string | null
  phone?: string | null
  website?: string | null
  leadSegments?: string[]
  leadSources?: string[]
  leadTags?: string[]
  salesGoalCents?: number | null
}

export interface IOrganizationRepository {
  /** IDs das organizações cujo parentOrganizationId é `parentOrganizationId`. */
  findChildOrganizationIds(parentOrganizationId: string): Promise<string[]>

  create(input: NewOrganizationInput): Promise<OrganizationRecord>

  /** Lista todas as organizações — usado pelo painel de Administração (Super Admin). */
  list(): Promise<OrganizationRecord[]>

  findById(id: string): Promise<OrganizationRecord | null>

  update(id: string, input: UpdateOrganizationInput): Promise<OrganizationRecord | null>
}
