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
//
// O Administrativo (BACKOFFICE) não vende: o Mural dele conta o que ELE faz
// na operação — cotas efetivadas no ADM (1, 10, 50, 100), checklist (100
// itens marcados), a primeira parcela conferida e a primeira assembleia /
// contemplação que ele acompanhou no Pós-venda.

import { Role } from '@sylocrm/domain'
import { ASSEMBLY_CHECKLIST_KEYS, CONTEMPLATION_CHECKLIST_KEYS } from '../funnels/funnel-checklists'
import type { AchievementsScope, IAchievementsRepository } from '../ports/achievements.repository'
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
  // Administrativo
  | 'first_effective'
  | 'effective_10'
  | 'effective_50'
  | 'effective_100'
  | 'checklist_100'
  | 'first_payment_check'
  | 'assembly_followed'
  | 'contemplation_followed'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  unlockedAt: Date | null
  /** Pras metas com alvo: onde está e o alvo — em centavos (crédito
   * vendido) ou em quantidade (cotas efetivadas, itens marcados). */
  progress: { current: number; target: number; unit: 'cents' | 'count' } | null
}

const MILLION = 1_000_000_00

const EFFECTIVE_MILESTONES: { id: AchievementId; title: string; target: number }[] = [
  { id: 'effective_10', title: '10 cotas efetivadas', target: 10 },
  { id: 'effective_50', title: '50 cotas efetivadas', target: 50 },
  { id: 'effective_100', title: '100 cotas efetivadas', target: 100 },
]

const CHECKLIST_TARGET = 100

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

export interface GetMyAchievementsInput extends AchievementsScope {
  /** Papel na organização ativa — o Administrativo tem o Mural dele. */
  role?: Role
}

export class GetMyAchievementsUseCase implements UseCase<GetMyAchievementsInput, Achievement[]> {
  constructor(private readonly achievementsRepository: IAchievementsRepository) {}

  async execute({ role, ...scope }: GetMyAchievementsInput): Promise<Achievement[]> {
    return role === Role.BACKOFFICE ? this.backoffice(scope) : this.seller(scope)
  }

  private async seller(scope: AchievementsScope): Promise<Achievement[]> {
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
          current: Math.min(total, milestone.targetCents),
          target: milestone.targetCents,
          unit: 'cents' as const,
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

  private async backoffice(scope: AchievementsScope): Promise<Achievement[]> {
    const [effective, checks, paymentAt, assemblyChecks, contemplationChecks, movedAt] =
      await Promise.all([
        this.achievementsRepository.listEffectiveQuotaDates(scope),
        this.achievementsRepository.listChecklistCheckDates(scope),
        this.achievementsRepository.firstPaymentCheckAt(scope),
        this.achievementsRepository.listChecklistCheckDates(scope, [...ASSEMBLY_CHECKLIST_KEYS]),
        this.achievementsRepository.listChecklistCheckDates(scope, [
          ...CONTEMPLATION_CHECKLIST_KEYS,
        ]),
        this.achievementsRepository.firstPostSaleStageMoveAt(scope, CONTEMPLATION_STAGES),
      ])

    return [
      {
        id: 'first_effective',
        title: 'Primeira cota efetivada',
        description: 'Levou a primeira cota até Efetivado no funil ADM.',
        unlockedAt: effective[0] ?? null,
        progress: null,
      },
      ...EFFECTIVE_MILESTONES.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: `Efetivou ${milestone.target} cotas no funil ADM.`,
        unlockedAt: effective[milestone.target - 1] ?? null,
        progress: {
          current: Math.min(effective.length, milestone.target),
          target: milestone.target,
          unit: 'count' as const,
        },
      })),
      {
        id: 'checklist_100',
        title: 'Checklist em dia',
        description: `Marcou ${CHECKLIST_TARGET} itens de checklist no ADM e no Pós-venda.`,
        unlockedAt: checks[CHECKLIST_TARGET - 1] ?? null,
        progress: {
          current: Math.min(checks.length, CHECKLIST_TARGET),
          target: CHECKLIST_TARGET,
          unit: 'count',
        },
      },
      {
        id: 'first_payment_check',
        title: 'Primeira parcela conferida',
        description: 'Respondeu a primeira tarefa "Confirmar pagamento" do Pós-venda.',
        unlockedAt: paymentAt,
        progress: null,
      },
      {
        id: 'assembly_followed',
        title: 'Primeira assembleia acompanhada',
        description: 'Marcou "1ª parcela paga" ou "Participou da 1ª assembleia" numa cota.',
        unlockedAt: assemblyChecks[0] ?? null,
        progress: null,
      },
      {
        id: 'contemplation_followed',
        title: 'Primeira contemplação acompanhada',
        description: 'Levou uma cota até Contemplado no Pós-venda.',
        unlockedAt: earliest(contemplationChecks[0] ?? null, movedAt),
        progress: null,
      },
    ]
  }
}
