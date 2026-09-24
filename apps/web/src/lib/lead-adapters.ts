// Adapters — convertem Lead (formato da API) em CardData (formato que o
// Kanban/HomePage/LeadModal já sabem renderizar), para não precisar tocar
// nesses componentes ao trocar a fonte de dados de mock para API real.

import type { CardData } from '../data/kanban-mock'
import type { FunnelStage } from './funnels-api'
import type { Lead, OutcomeFilter } from './leads-api'
import type { TeamMember } from './team-api'

// Heurística de urgência: um lead ainda nas 2 primeiras etapas do funil (por
// ordem) e parado há muito tempo provavelmente perdeu o timing. Etapas mais
// avançadas não são marcadas como urgentes por dias-no-estágio — precisam de
// um indicador próprio (SLA por etapa) quando esse dado existir.
const URGENT_STAGE_COUNT = 2
const URGENT_AFTER_DAYS = 60

/** true se `stageId` estiver entre as 2 primeiras posições do funil informado. */
export function isUrgentStage(stageId: string, stages: FunnelStage[]): boolean {
  const index = stages.findIndex((stage) => stage.id === stageId)
  return index >= 0 && index < URGENT_STAGE_COUNT
}

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

/** Status real do lead (independente do filtro de outcome ativo na página —
 * necessário porque o filtro "todos" mistura os 3 buckets no mesmo board).
 * Ganho/Perdido são flags independentes do estágio do funil. */
export function resolveCardOutcome(card: Pick<CardData, 'wonAt' | 'lostAt'>): OutcomeFilter {
  if (card.lostAt) return 'perdido'
  if (card.wonAt) return 'ganho'
  return 'aberto'
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

/** Aceita "350000", "350.000" ou "350000,50" — sempre BRL. Retorna null se inválido. */
export function parseValueToCents(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (Number.isNaN(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
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

/** Aplica a máscara progressiva de CPF (###.###.###-##), ignorando qualquer
 * caractere que não seja dígito. */
export function formatCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean)
  let result = parts.join('.')
  const rest = digits.slice(9, 11)
  if (rest) result += `-${rest}`
  return result
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

export function toCardData(lead: Lead, stages: FunnelStage[]): CardData {
  const colors = getSourceColors(lead.source)
  // Dias no estágio atual (não dias desde a criação) — é isso que indica se
  // um lead está empacado, não a idade total dele.
  const days = daysSince(lead.stageChangedAt)

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    segment: lead.segment,
    quotaCount: lead.quotaCount,
    cota: formatCota(lead.valueCents, lead.segment, lead.quotaCount),
    valueCents: lead.valueCents,
    date: formatDate(lead.createdAt),
    createdAt: lead.createdAt,
    assignedUserId: lead.assignedUserId,
    funnelId: lead.funnelId,
    stageId: lead.stageId,
    lostAt: lead.lostAt,
    wonAt: lead.wonAt,
    tags: lead.tags,
    notes: lead.notes,
    profession: lead.profession,
    incomeCents: lead.incomeCents,
    maritalStatus: lead.maritalStatus,
    cpf: lead.cpf,
    source: lead.source,
    sourceBg: colors.bg,
    sourceText: colors.text,
    days: `${days}d`,
    daysUrgent: isUrgentStage(lead.stageId, stages) && days > URGENT_AFTER_DAYS,
  }
}

/** true se o lead corresponde à busca livre por nome (substring, sem
 * diferenciar maiúsculas/minúsculas) ou telefone (compara só os dígitos,
 * ignora formatação). Query vazia ou só espaços sempre casa. */
export function matchesLeadSearch(lead: Pick<Lead, 'name' | 'phone'>, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true

  const nameMatch = lead.name.toLowerCase().includes(trimmed.toLowerCase())
  const queryDigits = trimmed.replace(/\D/g, '')
  const phoneMatch = queryDigits.length > 0 && lead.phone.replace(/\D/g, '').includes(queryDigits)
  return nameMatch || phoneMatch
}

/** Agrupa leads por coluna (stageId) do funil — todos os estágios do funil
 * sempre presentes, mesmo vazios. */
export function groupLeadsByColumn(
  leads: Lead[],
  stages: FunnelStage[],
): Record<string, CardData[]> {
  const board: Record<string, CardData[]> = {}
  for (const stage of stages) {
    board[stage.id] = []
  }
  for (const lead of leads) {
    board[lead.stageId]?.push(toCardData(lead, stages))
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
