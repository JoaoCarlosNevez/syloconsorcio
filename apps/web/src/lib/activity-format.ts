// Monta a frase de cada evento do log de atividades a partir de action +
// metadata (o backend só guarda dados estruturados). Ex: "moveu o lead
// “Maria” de “Contato” para “Proposta”".

import type { ActivityEntityType, ActivityEntry, ActivityMetadata } from './activity-api'
import { formatBRL } from './lead-adapters'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

const LEAD_FIELD_LABEL: Record<string, string> = {
  name: 'nome',
  phone: 'telefone',
  email: 'e-mail',
  segment: 'segmento',
  valueCents: 'valor',
  quotaCount: 'cotas',
  source: 'origem',
  tags: 'tags',
  notes: 'observações',
  profession: 'profissão',
  incomeCents: 'renda',
  maritalStatus: 'estado civil',
  cpf: 'CPF',
}

const TASK_FIELD_LABEL: Record<string, string> = {
  leadId: 'lead',
  assignedUserId: 'responsável',
  type: 'tipo',
  title: 'título',
  notes: 'observações',
  dueAt: 'prazo',
}

const ORGANIZATION_FIELD_LABEL: Record<string, string> = {
  name: 'nome',
  cnpj: 'CNPJ',
  phone: 'telefone',
  website: 'site',
  leadSegments: 'tipos de crédito',
  leadSources: 'origens de lead',
  leadTags: 'tags de lead',
}

const FUNNEL_FIELD_LABEL: Record<string, string> = {
  name: 'nome',
  isDefault: 'funil padrão',
  duplicateToFunnelId: 'passar o bastão',
  stages: 'etapas',
}

export const ACTIVITY_CATEGORY: Record<
  ActivityEntityType,
  { label: string; color: string; bg: string }
> = {
  lead: { label: 'Leads', color: '#1d4ed8', bg: '#eff6ff' },
  task: { label: 'Tarefas', color: '#059669', bg: '#dcfce7' },
  funnel: { label: 'Funis', color: '#c2410c', bg: '#fff7ed' },
  team: { label: 'Equipe', color: '#7c3aed', bg: '#f3e8ff' },
  organization: { label: 'Organização', color: '#475569', bg: '#f1f5f9' },
}

function str(metadata: ActivityMetadata, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

function num(metadata: ActivityMetadata, key: string): number | null {
  const value = metadata[key]
  return typeof value === 'number' ? value : null
}

function fieldList(metadata: ActivityMetadata, labels: Record<string, string>): string {
  const fields = metadata.fields
  if (!Array.isArray(fields) || fields.length === 0) return ''
  return ` (${fields.map((f) => labels[f] ?? f).join(', ')})`
}

function money(cents: number | null): string {
  return cents === null ? '' : `R$ ${formatBRL(cents)}`
}

function quoted(text: string | null): string {
  return `“${text ?? '—'}”`
}

/** Nome de quem fez a ação — "Sistema" pras ações automáticas. */
export function activityActorName(entry: ActivityEntry): string {
  if (!entry.actor) return 'Sistema'
  return entry.actor.name?.trim() || entry.actor.email
}

/** Frase do evento, sem o nome de quem fez (vem antes, em negrito). */
export function describeActivity(
  entry: ActivityEntry,
  memberName: (userId: string | null) => string,
): string {
  const m = entry.metadata
  const label = quoted(entry.entityLabel)
  // Eventos de equipe guardam o id do membro; o nome vem da lista da equipe.
  const member = entry.entityLabel ?? memberName(entry.entityId)

  switch (entry.action) {
    case 'lead.created': {
      const where = [str(m, 'funnelName'), str(m, 'stageName')].filter(Boolean).join(' › ')
      const value = money(num(m, 'valueCents'))
      return `criou o lead ${label}${where ? ` em ${where}` : ''}${value ? ` · ${value}` : ''}`
    }
    case 'lead.updated':
      return `editou o lead ${label}${fieldList(m, LEAD_FIELD_LABEL)}`
    case 'lead.stage_changed':
      return `moveu o lead ${label} de ${quoted(str(m, 'fromStage'))} para ${quoted(str(m, 'toStage'))}`
    case 'lead.assigned':
      return `transferiu o lead ${label} de ${memberName(str(m, 'fromUserId'))} para ${memberName(str(m, 'toUserId'))}`
    case 'lead.won':
      return `marcou o lead ${label} como Ganho${num(m, 'valueCents') !== null ? ` · ${money(num(m, 'valueCents'))}` : ''}`
    case 'lead.lost':
      return `marcou o lead ${label} como Perdido`
    case 'lead.reopened':
      return `reabriu o lead ${label}${str(m, 'from') === 'won' ? ' (estava Ganho)' : str(m, 'from') === 'lost' ? ' (estava Perdido)' : ''}`
    case 'lead.deleted':
      return `apagou o lead ${label}`
    case 'lead.duplicated':
      return m.automatic === true
        ? `copiou o lead ${label} para o funil ${quoted(str(m, 'toFunnelName'))} (passar o bastão)`
        : `duplicou o lead ${label} para o funil ${quoted(str(m, 'toFunnelName'))}`
    case 'lead.comment_added':
      return `comentou no lead ${label}${str(m, 'preview') ? `: ${quoted(str(m, 'preview'))}` : ''}`
    case 'lead.proposal_created':
      return `criou uma simulação para o lead ${label} · entrada ${money(num(m, 'downPaymentCents'))} em ${num(m, 'termMonths') ?? '—'} meses`
    case 'task.created':
      return `criou a tarefa ${label}${str(m, 'type') ? ` (${str(m, 'type')})` : ''}${str(m, 'leadName') ? ` para o lead ${quoted(str(m, 'leadName'))}` : ''}`
    case 'task.updated':
      return `editou a tarefa ${label}${fieldList(m, TASK_FIELD_LABEL)}`
    case 'task.completed':
      return `concluiu a tarefa ${label}`
    case 'task.reopened':
      return `reabriu a tarefa ${label}`
    case 'task.deleted':
      return `apagou a tarefa ${label}`
    case 'funnel.created':
      return `criou o funil ${label}`
    case 'funnel.updated':
      return str(m, 'previousName')
        ? `renomeou o funil ${quoted(str(m, 'previousName'))} para ${label}`
        : `editou o funil ${label}${fieldList(m, FUNNEL_FIELD_LABEL)}`
    case 'funnel.deleted':
      return `apagou o funil ${label}`
    case 'team.member_invited':
      return `adicionou ${member} à equipe${str(m, 'role') ? ` como ${ROLE_LABEL[str(m, 'role') as string] ?? str(m, 'role')}` : ''}`
    case 'team.member_removed':
      return `removeu ${member} da equipe`
    case 'team.member_reactivated':
      return `reativou ${member} na equipe`
    case 'team.goal_updated':
      return num(m, 'salesGoalCents') === null
        ? `removeu a meta de ${member}`
        : `definiu a meta de ${member} em ${money(num(m, 'salesGoalCents'))}`
    case 'organization.updated':
      return `atualizou os dados da organização${fieldList(m, ORGANIZATION_FIELD_LABEL)}`
    case 'organization.goal_updated':
      return num(m, 'salesGoalCents') === null
        ? 'removeu a meta da organização'
        : `definiu a meta da organização em ${money(num(m, 'salesGoalCents'))}`
    case 'organization.icon_updated':
      return 'alterou o logo da organização'
    case 'organization.branding_updated':
      return str(m, 'secondaryColor')
        ? `alterou a cor secundária para ${(str(m, 'secondaryColor') as string).toUpperCase()}`
        : 'restaurou a cor padrão da Sylo'
    case 'organization.api_key_created':
      return `criou a chave de API “${entry.entityLabel ?? ''}”`
    case 'organization.api_key_revoked':
      return `revogou a chave de API “${entry.entityLabel ?? ''}”`
    default:
      return entry.action
  }
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** "Hoje", "Ontem" ou "25 de setembro" — cabeçalho do grupo de eventos. */
export function activityDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** "agora", "há 5 min", "há 2 h" ou só o horário "14:30". */
export function activityTimeLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 6 * 60) return `há ${Math.floor(minutes / 60)} h`
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
