// GetMyXpUseCase — XP e nível do Perfil (o progresso interno do usuário no
// app, separado da patente). Calculado a partir do que a pessoa já faz no
// CRM, sem tabela própria:
//
//   lead atendido (cada lead diferente)  +2   simulação (proposta gerada)   +3
//   proposta enviada ao cliente          +5   cota fechada (Ganho padrão)  +40
//   dia de ofensiva (dia com atividade)  +5   conquista do Mural          bônus
//
// "XP do mês" = mês corrente (Brasília); o nível vem do XP acumulado desde
// sempre. As conquistas contam no mês em que foram desbloqueadas.

import type { IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'
import type { AchievementId } from './get-my-achievements.use-case'
import type { GetMyAchievementsUseCase } from './get-my-achievements.use-case'

export const XP_RULES = {
  leadWorked: 2,
  proposalCreated: 3,
  proposalShared: 5,
  quotaWon: 40,
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
}

export const XP_LEVELS = [
  { level: 1, name: 'Iniciante Sylo', minXp: 0 },
  { level: 2, name: 'Consultor Ágil', minXp: 500 },
  { level: 3, name: 'Especialista', minXp: 1000 },
  { level: 4, name: 'Mestre em Fechamentos', minXp: 2200 },
  { level: 5, name: 'Lenda Sylo', minXp: 4000 },
] as const

export type XpItemKey = 'leads' | 'proposals' | 'shared' | 'quotas' | 'streak' | 'achievements'

export interface XpItem {
  key: XpItemKey
  label: string
  count: number
  xp: number
}

export interface MyXp {
  month: { items: XpItem[]; total: number }
  totalXp: number
  level: { level: number; name: string; minXp: number }
  nextLevel: { level: number; name: string; minXp: number } | null
  levels: { level: number; name: string; minXp: number }[]
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

export function levelFor(totalXp: number): {
  level: (typeof XP_LEVELS)[number]
  next: (typeof XP_LEVELS)[number] | null
} {
  let index = 0
  for (const [i, level] of XP_LEVELS.entries()) if (totalXp >= level.minXp) index = i
  return {
    level: XP_LEVELS[index] as (typeof XP_LEVELS)[number],
    next: XP_LEVELS[index + 1] ?? null,
  }
}

export class GetMyXpUseCase
  implements UseCase<{ organizationId: string; userId: string; now?: Date }, MyXp>
{
  constructor(
    private readonly engagementRepository: IEngagementRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly streakRepository: IStreakRepository,
    private readonly getMyAchievements: GetMyAchievementsUseCase,
  ) {}

  async execute(input: { organizationId: string; userId: string; now?: Date }): Promise<MyXp> {
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
    const { level, next } = levelFor(totalXp)

    return {
      month: { items: monthItems, total: sum(monthItems) },
      totalXp,
      level,
      nextLevel: next,
      levels: [...XP_LEVELS],
    }
  }

  private async itemsFor(
    input: { organizationId: string; userId: string },
    window: Window,
  ): Promise<XpItem[]> {
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
    const unlocked = achievements.filter(
      (a) => a.unlockedAt && a.unlockedAt >= window.from && a.unlockedAt < window.to,
    )
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
      {
        key: 'achievements',
        label: 'Conquistas',
        count: unlocked.length,
        xp: unlocked.reduce((total, a) => total + ACHIEVEMENT_XP[a.id], 0),
      },
    ]
  }
}
