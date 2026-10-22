// Confirmação mensal do boleto no Pós-venda.
//
// - GeneratePostSalePaymentTasksUseCase (roda de hora em hora no processo da
//   API): pra cada card em aberto no Pós-venda com "dia do vencimento do
//   boleto" na ficha, cria — no dia seguinte ao vencimento — a tarefa
//   "Confirmar pagamento da parcela de <mês>" pro responsável. Uma por mês
//   (autoKey único); o card precisa ter entrado no Pós-venda antes do dia.
//   Também apaga as tarefas abertas de cards que saíram do Pós-venda em
//   aberto — contemplado e ganho, perdido ou movido: a cobrança acaba ali.
// - AnswerInstallmentPaymentUseCase: o responsável responde no card.
//   Pagou → conclui a tarefa, marca a próxima parcela no checklist (1ª, 2ª,
//   3ª) e tira de "Atrasado" (volta pra "Em dia"). Não pagou → conclui a
//   tarefa e move pra "Atrasado". As duas respostas vão pro histórico.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadChecklistRepository } from '../ports/lead-checklist.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IPostSalePaymentRepository } from '../ports/post-sale-payment.repository'
import type { UseCase } from '../ports/use-case'
import type { ToggleLeadChecklistItemUseCase } from './lead-checklist.use-cases'
import { resolveLeadScope } from './lead-scope'
import type { UpdateLeadUseCase } from './update-lead.use-case'

export const PAYMENT_TASK_PREFIX = 'post_sale_payment:'
const BRASILIA_OFFSET_HOURS = 3
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]
const INSTALLMENT_ITEMS = [
  'first_installment_paid',
  'second_installment_paid',
  'third_installment_paid',
] as const

/** Ano/mês/dia de hoje em Brasília. */
function brasiliaToday(now: Date): { year: number; month: number; day: number } {
  const shifted = new Date(now.getTime() - BRASILIA_OFFSET_HOURS * 60 * 60 * 1000)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

/** 00:00 de Brasília do dia, em UTC. */
function brasiliaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, BRASILIA_OFFSET_HOURS))
}

/** Dia da tarefa (vencimento + 1) no mês — vencimento 31 em mês curto vira
 * o último dia. */
export function paymentTaskDay(year: number, month: number, dueDay: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return brasiliaMidnight(year, month, Math.min(dueDay, lastDay) + 1)
}

export function paymentTaskKey(leadId: string, year: number, month: number): string {
  return `${PAYMENT_TASK_PREFIX}${leadId}:${year}-${String(month + 1).padStart(2, '0')}`
}

export class GeneratePostSalePaymentTasksUseCase
  implements UseCase<{ now: Date }, { created: number; removed: number }>
{
  constructor(private readonly paymentRepository: IPostSalePaymentRepository) {}

  async execute(input: { now: Date }): Promise<{ created: number; removed: number }> {
    const removed = await this.paymentRepository.deleteOrphanAutoTasks(PAYMENT_TASK_PREFIX)
    const today = brasiliaToday(input.now)
    const todayStart = brasiliaMidnight(today.year, today.month, today.day)
    let created = 0

    for (const lead of await this.paymentRepository.listOpenLeadsWithDueDay()) {
      if (!lead.assignedUserId) continue
      const taskDay = paymentTaskDay(today.year, today.month, lead.dueDay)
      // Ainda não chegou o dia seguinte ao vencimento deste mês.
      if (taskDay > todayStart) continue
      // Entrou no Pós-venda depois do vencimento deste mês: começa no próximo.
      if (lead.createdAt >= taskDay) continue

      const wasCreated = await this.paymentRepository.createAutoTask({
        autoKey: paymentTaskKey(lead.leadId, today.year, today.month),
        organizationId: lead.organizationId,
        leadId: lead.leadId,
        assignedUserId: lead.assignedUserId,
        title: `Confirmar pagamento da parcela de ${MONTHS[today.month]} — ${lead.name}`,
        notes: `Vencimento todo dia ${lead.dueDay}. Abra o cliente (aba Checklist) e informe se pagou ou não.`,
        // 09:00 de Brasília do dia seguinte ao vencimento.
        dueAt: new Date(taskDay.getTime() + 9 * 60 * 60 * 1000),
      })
      if (wasCreated) created++
    }
    return { created, removed }
  }
}

export interface AnswerInstallmentPaymentInput {
  leadId: string
  userId: string
  membership: MembershipContext
  paid: boolean
  now?: Date
}

export class AnswerInstallmentPaymentUseCase
  implements UseCase<AnswerInstallmentPaymentInput, { completedTasks: number } | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly paymentRepository: IPostSalePaymentRepository,
    private readonly checklistRepository: ILeadChecklistRepository,
    private readonly toggleChecklistItem: ToggleLeadChecklistItemUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: AnswerInstallmentPaymentInput): Promise<{ completedTasks: number } | null> {
    const now = input.now ?? new Date()
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    const funnel = await this.funnelRepository.findById(lead.funnelId, lead.organizationId)
    if (funnel?.kind !== 'POST_SALE' || lead.wonAt || lead.lostAt) {
      throw new ValidationError([
        { field: 'leadId', message: 'O pagamento das parcelas é informado no Pós-venda.' },
      ])
    }

    const tasks = await this.paymentRepository.findOpenAutoTasks(lead.id, PAYMENT_TASK_PREFIX)
    if (tasks.length > 0) {
      await this.paymentRepository.completeTasks(
        tasks.map((task) => task.id),
        now,
      )
    }
    const today = brasiliaToday(now)
    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: input.paid ? 'lead.installment_paid' : 'lead.installment_late',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { month: `${MONTHS[today.month]}/${today.year}` },
    })

    const stageId = (name: string) => funnel.stages.find((stage) => stage.name === name)
    const current = funnel.stages.find((stage) => stage.id === lead.stageId)
    if (input.paid) {
      // Marca a próxima parcela ainda desmarcada (a 1ª leva o card pra Em dia).
      const checked = new Set(
        (await this.checklistRepository.listChecked(lead.id)).map((item) => item.itemKey),
      )
      const next = INSTALLMENT_ITEMS.find((key) => !checked.has(key))
      if (next) {
        await this.toggleChecklistItem.execute({
          leadId: lead.id,
          userId: input.userId,
          membership: input.membership,
          itemKey: next,
          checked: true,
        })
      }
      // Estava atrasado e pagou: volta pra Em dia.
      const emDia = stageId('Em dia')
      if (current?.name === 'Atrasado' && emDia) {
        await this.updateLead.execute({
          id: lead.id,
          userId: input.userId,
          membership: input.membership,
          changes: { stageId: emDia.id },
        })
      }
    } else {
      const atrasado = stageId('Atrasado')
      if (atrasado && current && current.position < atrasado.position) {
        await this.updateLead.execute({
          id: lead.id,
          userId: input.userId,
          membership: input.membership,
          changes: { stageId: atrasado.id },
        })
      }
    }
    return { completedTasks: tasks.length }
  }
}
