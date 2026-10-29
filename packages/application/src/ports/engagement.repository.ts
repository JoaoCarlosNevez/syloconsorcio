// IEngagementRepository — números do "Engajamento operacional" do Perfil: o
// que o próprio usuário fez num intervalo, na organização ativa.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface EngagementRange {
  organizationId: string
  userId: string
  from: Date
  to: Date
}

/** O que o Administrativo (BACKOFFICE) fez no intervalo — base das metas,
 * do XP e do engajamento dele, que não vende. */
export interface BackofficeWorkCounts {
  /** Cotas diferentes que ele marcou como Ganho (Efetivado) no funil ADM. */
  quotasEffective: number
  /** Itens de checklist (ADM e Pós-venda) marcados por ele e ainda marcados. */
  checklistItems: number
  /** Documentos diferentes (lead + tipo) que ele anexou. */
  documents: number
  /** Respostas do "Confirmar pagamento" (lead + mês): pagou / não pagou. */
  paymentsPaid: number
  paymentsLate: number
  /** Tarefas diferentes que ele concluiu. */
  tasksCompleted: number
}

export interface IEngagementRepository {
  /** Leads diferentes em que o usuário agiu (ações de trabalho no log). */
  countLeadsWorked(range: EngagementRange): Promise<number>

  /** Propostas que o usuário gerou no intervalo; quantas foram enviadas por
   * link e, dessas, quantas o cliente abriu. */
  proposalStats(
    range: EngagementRange,
  ): Promise<{ created: number; shared: number; opened: number }>

  /** Trabalho do Administrativo no intervalo (ver BackofficeWorkCounts). */
  backofficeWork(range: EngagementRange): Promise<BackofficeWorkCounts>
}
