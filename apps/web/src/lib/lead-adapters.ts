// Adapters — convertem Lead (formato da API) em CardData (formato que o
// Kanban/HomePage/LeadModal já sabem renderizar), para não precisar tocar
// nesses componentes ao trocar a fonte de dados de mock para API real.

import type { CardData } from '../data/kanban-mock'
import type { Lead, LeadStage } from './leads-api'
import type { TeamMember } from './team-api'

export const STAGE_TO_COLUMN_ID: Record<LeadStage, string> = {
  LEAD: 'lead',
  ATENDIMENTO: 'atendimento',
  SIMULACAO: 'simulacao',
  PROPOSTA: 'proposta',
  FECHADO: 'fechado',
  VENDA: 'venda',
}

export const COLUMN_ID_TO_STAGE: Record<string, LeadStage> = Object.fromEntries(
  Object.entries(STAGE_TO_COLUMN_ID).map(([stage, columnId]) => [columnId, stage as LeadStage]),
)

// Heurística de urgência: um lead que ainda não chegou em Simulação e está
// parado há muito tempo provavelmente perdeu o timing. Etapas mais avançadas
// não são marcadas como urgentes por dias-no-funil — precisam de um
// indicador próprio (SLA por etapa) quando esse dado existir.
const URGENT_STAGES: ReadonlySet<LeadStage> = new Set(['LEAD', 'ATENDIMENTO'])
const URGENT_AFTER_DAYS = 60

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  FACEBOOK: { bg: '#2563eb', text: '#fff' },
  INSTAGRAM: { bg: '#7c3aed', text: '#fff' },
  INDICAÇÃO: { bg: '#059669', text: '#fff' },
  SITE: { bg: '#334155', text: '#fff' },
}
const DEFAULT_SOURCE_COLOR = { bg: '#475569', text: '#fff' }

function getSourceColors(source: string): { bg: string; text: string } {
  return SOURCE_COLORS[source.toUpperCase()] ?? DEFAULT_SOURCE_COLOR
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

/**
 * Aplica a máscara de telefone brasileiro progressivamente, ignorando
 * qualquer caractere que não seja dígito. Até 10 dígitos usa o formato de
 * fixo "(DD) NNNN-NNNN"; ao digitar o 11º dígito (celular com o 9 na
 * frente) passa pra "(DD) NNNNN-NNNN".
 */
export function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (digits.length <= 10) {
    return rest.length <= 4 ? `(${ddd}) ${rest}` : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

export function formatCota(valueCents: number, segment: string, quotaCount: number): string {
  const prefix = quotaCount > 1 ? `${quotaCount} Cotas` : 'Cota'
  return `${prefix} R$ ${formatBRL(valueCents)} (${segment})`
}

export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function toCardData(lead: Lead): CardData {
  const colors = getSourceColors(lead.source)
  // Dias no estágio atual (não dias desde a criação) — é isso que indica se
  // um lead está empacado, não a idade total dele.
  const days = daysSince(lead.stageChangedAt)

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    cota: formatCota(lead.valueCents, lead.segment, lead.quotaCount),
    valueCents: lead.valueCents,
    date: formatDate(lead.createdAt),
    assignedUserId: lead.assignedUserId,
    stage: lead.stage,
    tags: lead.tags,
    notes: lead.notes,
    source: lead.source,
    sourceBg: colors.bg,
    sourceText: colors.text,
    days: `${days}d`,
    daysUrgent: URGENT_STAGES.has(lead.stage) && days > URGENT_AFTER_DAYS,
  }
}

/** Agrupa leads por coluna do Kanban — todas as 6 colunas sempre presentes, mesmo vazias. */
export function groupLeadsByColumn(leads: Lead[]): Record<string, CardData[]> {
  const board: Record<string, CardData[]> = {}
  for (const columnId of Object.values(STAGE_TO_COLUMN_ID)) {
    board[columnId] = []
  }
  for (const lead of leads) {
    const columnId = STAGE_TO_COLUMN_ID[lead.stage]
    board[columnId]?.push(toCardData(lead))
  }
  return board
}

// ── Resolução do responsável (assignedUserId → nome/foto reais) ────────────────

export interface ResolvedAgent {
  name: string
  photo: string
  roleLabel: string | null
}

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

const UNASSIGNED_AGENT: ResolvedAgent = {
  name: 'Não atribuído',
  photo: '/default-avatar.svg',
  roleLabel: null,
}

/** Resolve o responsável real de um lead a partir da lista de membros da equipe. */
export function resolveAgent(
  assignedUserId: string | null,
  members: TeamMember[] | undefined,
): ResolvedAgent {
  const member = assignedUserId ? members?.find((m) => m.userId === assignedUserId) : undefined
  if (!member) return UNASSIGNED_AGENT

  return {
    name: member.name ?? member.email,
    photo: member.avatarUrl ?? '/default-avatar.svg',
    roleLabel: ROLE_LABEL[member.role],
  }
}
