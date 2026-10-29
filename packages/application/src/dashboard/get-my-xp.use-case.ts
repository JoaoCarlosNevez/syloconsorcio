// GetMyXpUseCase — XP e nível do Perfil (o progresso interno do usuário no
// app, separado da patente). Calculado a partir do que a pessoa já faz no
// CRM, sem tabela própria:
//
//   lead atendido (cada lead diferente)  +2   simulação (proposta gerada)   +3
//   proposta enviada ao cliente          +5   cota fechada (Ganho padrão)  +40
//   dia de ofensiva (dia com atividade)  +5   conquista do Mural          bônus
//
// O Administrativo (BACKOFFICE) não vende — o XP dele vem da operação:
//
//   cota efetivada (Ganho no ADM)       +30   item de checklist marcado    +3
//   documento anexado                    +2   parcela conferida            +4
//   tarefa concluída                     +2   dia de ofensiva              +5
//   conquista do Mural (as dele)      bônus
//
// "XP do mês" = mês corrente (Brasília); o nível vem do XP acumulado desde
// sempre. As conquistas contam no mês em que foram desbloqueadas.

import { Role } from '@sylocrm/domain'
import type { IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'
import type { Achievement, AchievementId } from './get-my-achievements.use-case'
import type { GetMyAchievementsUseCase } from './get-my-achievements.use-case'

export const XP_RULES = {
  leadWorked: 2,
  proposalCreated: 3,
  proposalShared: 5,
  quotaWon: 40,
  activeDay: 5,
} as const

export const BACKOFFICE_XP_RULES = {
  quotaEffective: 30,
  checklistItem: 3,
  document: 2,
  paymentCheck: 4,
  taskCompleted: 2,
  activeDay: 5,
} as const

export const ACHIEVEMENT_XP: Record<AchievementId, number> = {
  first_quota: 100,
  sold_500k: 150,
  sold_1m: 250,
  sold_3m: 400,
  sold_5m: 600,
  sold_10m: 1000,
  first_assembly: 100,
  first_contemplation: 200,
  first_effective: 100,
  effective_10: 150,
  effective_50: 300,
  effective_100: 600,
  checklist_100: 200,
  first_payment_check: 100,
  assembly_followed: 100,
  contemplation_followed: 200,
}

export const XP_LEVELS = [
  { level: 1, name: 'Iniciante Sylo', minXp: 0 },
  { level: 2, name: 'Consultor Ágil', minXp: 500 },
  { level: 3, name: 'Especialista', minXp: 1000 },
  { level: 4, name: 'Mestre em Fechamentos', minXp: 2200 },
  { level: 5, name: 'Lenda Sylo', minXp: 4000 },
] as const

/** Mesmas faixas de XP, com nomes da operação. */
export const BACKOFFICE_XP_LEVELS = [
  { level: 1, name: 'Iniciante Sylo', minXp: 0 },
  { level: 2, name: 'Operador Ágil', minXp: 500 },
  { level: 3, name: 'Especialista', minXp: 1000 },
  { level: 4, name: 'Mestre da Operação', minXp: 2200 },
  { level: 5, name: 'Lenda Sylo', minXp: 4000 },
] as const

type XpLevel = { level: number; name: string; minXp: number }

export type XpItemKey =
  | 'leads'
  | 'proposals'
  | 'shared'
  | 'quotas'
  | 'streak'
  | 'achievements'
  // Administrativo
  | 'effective'
  | 'checklist'
  | 'documents'
  | 'payments'
  | 'tasks'

export interface XpItem {
  key: XpItemKey
  label: string
  count: number
  xp: number
}

export interface MyXp {
  month: { items: XpItem[]; total: number }
  totalXp: number
  level: XpLevel
  nextLevel: XpLevel | null
  levels: XpLevel[]
}

interface Window {
  from: Date
  to: Date
}

const EPOCH = new Date('2000-01-01T00:00:00Z')

/** "YYYY-MM-DD" de Brasília dentro de [from, to). */
function dayInWindow(day: string, window: Window): boolean {
  // Meio-dia de Brasília (15h UTC) — longe das bordas de fuso.
  const at = new Date(`${day}T15:00:00Z`)
  return at >= window.from && at < window.to
}

export function levelFor(
  totalXp: number,
  levels: readonly XpLevel[] = XP_LEVELS,
): { level: XpLevel; next: XpLevel | null } {
  let index = 0
  for (const [i, level] of levels.entries()) if (totalXp >= level.minXp) index = i
  return { level: levels[index] as XpLevel, next: levels[index + 1] ?? null }
}

interface GetMyXpInput {
  organizationId: string
  userId: string
  /** Papel na organização ativa — o Administrativo tem regras próprias. */
  role?: Role
  now?: Date
}

export class GetMyXpUseCase implements UseCase<GetMyXpInput, MyXp> {
  constructor(
    private readonly engagementRepository: IEngagementRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly streakRepository: IStreakRepository,
    private readonly getMyAchievements: GetMyAchievementsUseCase,
  ) {}

  async execute(input: GetMyXpInput): Promise<MyXp> {
    const now = input.now ?? new Date()
    const month = currentMonthInBrasilia(now)
    const monthWindow: Window = { from: month.start, to: month.end }
    const allTime: Window = { from: EPOCH, to: month.end }

    const [monthItems, allItems] = await Promise.all([
      this.itemsFor(input, monthWindow),
      this.itemsFor(input, allTime),
    ])
    const sum = (items: XpItem[]) => items.reduce((total, item) => total + item.xp, 0)
    const totalXp = sum(allItems)
    const levels = input.role === Role.BACKOFFICE ? BACKOFFICE_XP_LEVELS : XP_LEVELS
    const { level, next } = levelFor(totalXp, levels)

    return {
      month: { items: monthItems, total: sum(monthItems) },
      totalXp,
      level,
      nextLevel: next,
      levels: [...levels],
    }
  }

  private async itemsFor(input: GetMyXpInput, window: Window): Promise<XpItem[]> {
    if (input.role === Role.BACKOFFICE) return this.backofficeItemsFor(input, window)
    const range = { organizationId: input.organizationId, userId: input.userId, ...window }
    const [leads, proposals, quotas, activeDays, achievements] = await Promise.all([
      this.engagementRepository.countLeadsWorked(range),
      this.engagementRepository.proposalStats(range),
      this.leadRepository.countWonInDefaultFunnel({
        organizationId: input.organizationId,
        assignedUserId: input.userId,
        wonFrom: window.from,
        wonTo: window.to,
      }),
      this.streakRepository.listActiveDays(input.userId),
      this.getMyAchievements.execute(input),
    ])
    const days = activeDays.filter((day) => dayInWindow(day, window)).length
    const unlocked = unlockedIn(achievements, window)
    return [
      { key: 'leads', label: 'Leads atendidos', count: leads, xp: leads * XP_RULES.leadWorked },
      {
        key: 'proposals',
        label: 'Simulações',
        count: proposals.created,
        xp: proposals.created * XP_RULES.proposalCreated,
      },
      {
        key: 'shared',
        label: 'Propostas enviadas',
        count: proposals.shared,
        xp: proposals.shared * XP_RULES.proposalShared,
      },
      { key: 'quotas', label: 'Cotas fechadas', count: quotas, xp: quotas * XP_RULES.quotaWon },
      { key: 'streak', label: 'Dias de ofensiva', count: days, xp: days * XP_RULES.activeDay },
      achievementsItem(unlocked),
    ]
  }

  private async backofficeItemsFor(input: GetMyXpInput, window: Window): Promise<XpItem[]> {
    const range = { organizationId: input.organizationId, userId: input.userId, ...window }
    const [work, activeDays, achievements] = await Promise.all([
      this.engagementRepository.backofficeWork(range),
      this.streakRepository.listActiveDays(input.userId),
      this.getMyAchievements.execute(input),
    ])
    const days = activeDays.filter((day) => dayInWindow(day, window)).length
    const payments = work.paymentsPaid + work.paymentsLate
    const rules = BACKOFFICE_XP_RULES
    return [
      {
        key: 'effective',
        label: 'Cotas efetivadas',
        count: work.quotasEffective,
        xp: work.quotasEffective * rules.quotaEffective,
      },
      {
        key: 'checklist',
        label: 'Itens de checklist',
        count: work.checklistItems,
        xp: work.checklistItems * rules.checklistItem,
      },
      {
        key: 'documents',
        label: 'Documentos anexados',
        count: work.documents,
        xp: work.documents * rules.document,
      },
      {
        key: 'payments',
        label: 'Parcelas conferidas',
        count: payments,
        xp: payments * rules.paymentCheck,
      },
      {
        key: 'tasks',
        label: 'Tarefas concluídas',
        count: work.tasksCompleted,
        xp: work.tasksCompleted * rules.taskCompleted,
      },
      { key: 'streak', label: 'Dias de ofensiva', count: days, xp: days * rules.activeDay },
      achievementsItem(unlockedIn(achievements, window)),
    ]
  }
}

function unlockedIn(achievements: Achievement[], window: Window): Achievement[] {
  return achievements.filter(
    (a) => a.unlockedAt && a.unlockedAt >= window.from && a.unlockedAt < window.to,
  )
}

function achievementsItem(unlocked: Achievement[]): XpItem {
  return {
    key: 'achievements',
    label: 'Conquistas',
    count: unlocked.length,
    xp: unlocked.reduce((total, a) => total + ACHIEVEMENT_XP[a.id], 0),
  }
}
