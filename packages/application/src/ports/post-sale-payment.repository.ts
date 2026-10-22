// IPostSalePaymentRepository — confirmação mensal do boleto no Pós-venda
// (ver leads/post-sale-payments.use-cases.ts).
// Implementação concreta: packages/infrastructure/src/database/repositories/

/** Card em aberto no funil Pós-venda com dia de vencimento na ficha. */
export interface PostSalePaymentLead {
  leadId: string
  organizationId: string
  name: string
  assignedUserId: string | null
  /** Quando o card entrou no Pós-venda (a cópia nasce lá). */
  createdAt: Date
  dueDay: number
}

export interface NewAutoTaskInput {
  autoKey: string
  organizationId: string
  leadId: string
  assignedUserId: string
  title: string
  notes: string
  dueAt: Date
}

export interface OpenAutoTask {
  id: string
  autoKey: string
  title: string
  dueAt: Date
}

export interface IPostSalePaymentRepository {
  /** Todos os cards em aberto do Pós-venda (todas as organizações) com dia de
   * vencimento preenchido. */
  listOpenLeadsWithDueDay(): Promise<PostSalePaymentLead[]>

  /** Cria a tarefa se ainda não existir uma com o mesmo autoKey; true se criou. */
  createAutoTask(input: NewAutoTaskInput): Promise<boolean>

  /** Apaga as tarefas automáticas abertas (prefixo do autoKey) de cards que
   * não estão mais em aberto no Pós-venda (ganhos, perdidos ou movidos).
   * Devolve quantas apagou. */
  deleteOrphanAutoTasks(autoKeyPrefix: string): Promise<number>

  /** Tarefas automáticas abertas do lead com este prefixo. */
  findOpenAutoTasks(leadId: string, autoKeyPrefix: string): Promise<OpenAutoTask[]>

  completeTasks(taskIds: string[], completedAt: Date): Promise<void>
}
