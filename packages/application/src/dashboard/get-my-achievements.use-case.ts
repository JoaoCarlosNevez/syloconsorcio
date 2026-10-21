// GetMyAchievementsUseCase — Mural de Conquistas do Perfil, com dados reais
// do usuário na organização ativa:
//
// - Primeira cota: a primeira venda (lead dele ganho no funil padrão).
// - 500K, Meu primeiro milhão, 3M, 5M, 10M: crédito vendido acumulado (desde
//   sempre) — desbloqueia na venda que cruza a marca.
// - Primeira assembleia: uma cota dele chega a "Em dia" (ou depois) no
//   Pós-venda, ou alguém marca "1ª parcela paga"/"Participou da 1ª
//   assembleia" no checklist — o que vier primeiro.
// - Primeira contemplação: uma cota dele chega a "Contemplado" no Pós-venda
//   ou tem "Contemplado" marcado no checklist.

import { ASSEMBLY_CHECKLIST_KEYS, CONTEMPLATION_CHECKLIST_KEYS } from '../funnels/funnel-checklists'
import type { IAchievementsRepository } from '../ports/achievements.repository'
import type { UseCase } from '../ports/use-case'

export type AchievementId =
  | 'first_quota'
  | 'sold_500k'
  | 'sold_1m'
  | 'sold_3m'
  | 'sold_5m'
  | 'sold_10m'
  | 'first_assembly'
  | 'first_contemplation'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  unlockedAt: Date | null
  /** Pras metas de valor: quanto já vendeu e o alvo, em centavos. */
  progress: { currentCents: number; targetCents: number } | null
}

const MILLION = 1_000_000_00

const SALES_MILESTONES: { id: AchievementId; title: string; targetCents: number }[] = [
  { id: 'sold_500k', title: '500K', targetCents: 500_000_00 },
  { id: 'sold_1m', title: 'Meu primeiro milhão', targetCents: MILLION },
  { id: 'sold_3m', title: '3M', targetCents: 3 * MILLION },
  { id: 'sold_5m', title: '5M', targetCents: 5 * MILLION },
  { id: 'sold_10m', title: '10M', targetCents: 10 * MILLION },
]

/** Etapas do Pós-venda a partir de "Em dia" (a cota já está nas assembleias). */
const ASSEMBLY_STAGES = ['Em dia', 'Atrasado', 'Contemplado']
const CONTEMPLATION_STAGES = ['Contemplado']

function earliest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

function formatMillions(cents: number): string {
  const reais = cents / 100
  return reais >= 1_000_000
    ? `R$ ${(reais / 1_000_000).toLocaleString('pt-BR')} milhão${reais >= 2_000_000 ? 'ões' : ''}`
    : `R$ ${(reais / 1000).toLocaleString('pt-BR')} mil`
}

export class GetMyAchievementsUseCase
  implements UseCase<{ organizationId: string; userId: string }, Achievement[]>
{
  constructor(private readonly achievementsRepository: IAchievementsRepository) {}

  async execute(scope: { organizationId: string; userId: string }): Promise<Achievement[]> {
    const [sales, assemblyStageAt, contemplationStageAt, assemblyCheckAt, contemplationCheckAt] =
      await Promise.all([
        this.achievementsRepository.listWonSales(scope),
        this.achievementsRepository.firstPostSaleStageAt(scope, ASSEMBLY_STAGES),
        this.achievementsRepository.firstPostSaleStageAt(scope, CONTEMPLATION_STAGES),
        this.achievementsRepository.firstChecklistItemAt(scope, [...ASSEMBLY_CHECKLIST_KEYS]),
        this.achievementsRepository.firstChecklistItemAt(scope, [...CONTEMPLATION_CHECKLIST_KEYS]),
      ])
    const firstAssemblyAt = earliest(assemblyStageAt, assemblyCheckAt)
    const firstContemplationAt = earliest(contemplationStageAt, contemplationCheckAt)

    // Data em que o acumulado cruzou cada marca.
    let total = 0
    const crossedAt = new Map<AchievementId, Date>()
    for (const sale of sales) {
      total += sale.valueCents
      for (const milestone of SALES_MILESTONES) {
        if (total >= milestone.targetCents && !crossedAt.has(milestone.id)) {
          crossedAt.set(milestone.id, sale.wonAt)
        }
      }
    }

    return [
      {
        id: 'first_quota',
        title: 'Primeira cota',
        description: 'Vendeu a primeira cota de consórcio pelo Sylo CRM.',
        unlockedAt: sales[0]?.wonAt ?? null,
        progress: null,
      },
      ...SALES_MILESTONES.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: `Somou ${formatMillions(milestone.targetCents)} em crédito vendido.`,
        unlockedAt: crossedAt.get(milestone.id) ?? null,
        progress: {
          currentCents: Math.min(total, milestone.targetCents),
          targetCents: milestone.targetCents,
        },
      })),
      {
        id: 'first_assembly',
        title: 'Primeira assembleia',
        description:
          'Um cliente pagou o 1º boleto e a cota entrou nas assembleias (Em dia no Pós-venda).',
        unlockedAt: firstAssemblyAt,
        progress: null,
      },
      {
        id: 'first_contemplation',
        title: 'Primeira contemplação',
        description: 'Um cliente seu foi contemplado.',
        unlockedAt: firstContemplationAt,
        progress: null,
      },
    ]
  }
}
