// GetMyMonthlyStatsUseCase — números do mês do próprio usuário, pros cards
// abaixo de Tarefas no início:
//
// - Agendamentos: tarefas de Reunião dele com prazo no mês (qualquer status).
// - Visitas realizadas: dessas, as concluídas.
// - Valor ganho: soma dos leads dele marcados como Ganho no mês — mesmo
//   recorte da Meta Pessoal (funil padrão, valor do crédito), pra os números
//   do início baterem entre si.
// - Tíquete médio: valor ganho ÷ quantidade de leads ganhos; null sem ganhos.
//
// "Mês" é o mês civil corrente no fuso de Brasília.

import type { ILeadRepository } from '../ports/lead.repository'
import type { ITaskRepository } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'

/** Tipo de tarefa que conta como agendamento/visita. */
const MEETING_TASK_TYPE = 'Reunião'

export interface GetMyMonthlyStatsInput {
  organizationId: string
  userId: string
  /** Injetável pra testes; padrão = agora. */
  now?: Date
}

export interface MyMonthlyStats {
  periodStart: Date
  periodEnd: Date
  meetingsScheduled: number
  meetingsCompleted: number
  wonTotalCents: number
  wonCount: number
  /** Centavos; null quando não houve ganho no mês. */
  averageTicketCents: number | null
}

export class GetMyMonthlyStatsUseCase implements UseCase<GetMyMonthlyStatsInput, MyMonthlyStats> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(input: GetMyMonthlyStatsInput): Promise<MyMonthlyStats> {
    const { start, end } = currentMonthInBrasilia(input.now ?? new Date())
    const meetings = {
      organizationId: input.organizationId,
      assignedUserId: input.userId,
      type: MEETING_TASK_TYPE,
      dueFrom: start,
      dueTo: end,
    }
    const won = {
      organizationId: input.organizationId,
      assignedUserId: input.userId,
      wonFrom: start,
      wonTo: end,
    }

    const [meetingsScheduled, meetingsCompleted, wonTotalCents, wonCount] = await Promise.all([
      this.taskRepository.count(meetings),
      this.taskRepository.count({ ...meetings, status: 'concluida' }),
      this.leadRepository.sumWonValueCentsInDefaultFunnel(won),
      this.leadRepository.countWonInDefaultFunnel(won),
    ])

    return {
      periodStart: start,
      periodEnd: end,
      meetingsScheduled,
      meetingsCompleted,
      wonTotalCents,
      wonCount,
      averageTicketCents: wonCount > 0 ? Math.round(wonTotalCents / wonCount) : null,
    }
  }
}
