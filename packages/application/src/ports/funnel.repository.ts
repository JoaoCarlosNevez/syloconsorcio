// IFunnelRepository — port para persistência de funis e seus estágios.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Guardas de negócio (não remover estágio com leads, não excluir o único
// funil/o funil padrão/um funil com leads) ficam nos use cases, não aqui —
// mesmo padrão de ILeadRepository/UpdateLeadUseCase. O repositório só aplica
// o diff/upsert pedido.

export interface FunnelStageRecord {
  id: string
  funnelId: string
  name: string
  color: string
  position: number
  /** Quantidade de leads atualmente neste estágio — só populado por listByOrganization. */
  leadCount?: number
}

export interface FunnelRecord {
  id: string
  organizationId: string
  name: string
  isDefault: boolean
  /** Gatilho "passar o bastão" — ver UpdateFunnelInput. Null = desativado. */
  duplicateToFunnelId: string | null
  /** Sempre ordenados por position asc. */
  stages: FunnelStageRecord[]
  createdAt: Date
  updatedAt: Date
}

export interface NewFunnelStageInput {
  name: string
  color?: string
}

export interface NewFunnelInput {
  organizationId: string
  name: string
  stages: NewFunnelStageInput[]
  isDefault?: boolean
}

export interface StageUpsertInput {
  /** Presente = atualiza estágio existente (id estável, referenciado por leads);
   * ausente = cria um estágio novo. */
  id?: string
  name: string
  color?: string
}

export interface UpdateFunnelInput {
  name?: string
  isDefault?: boolean
  /** Lista completa e ordenada — o repositório persiste position = índice. */
  stages?: StageUpsertInput[]
  /** Presente e não-undefined = altera o gatilho ("passar o bastão"); null desativa.
   * Validado no use case: precisa existir na mesma org e não pode ser o próprio funil. */
  duplicateToFunnelId?: string | null
}

export interface IFunnelRepository {
  /** Inclui leadCount por estágio (usado pra UI desabilitar "remover estágio" preventivamente). */
  listByOrganization(organizationId: string): Promise<FunnelRecord[]>

  /** Retorna null se não existir ou não pertencer à organização. */
  findById(id: string, organizationId: string): Promise<FunnelRecord | null>

  create(input: NewFunnelInput): Promise<FunnelRecord>

  /** Retorna null se o funil não existir ou não pertencer à organização. */
  update(id: string, organizationId: string, input: UpdateFunnelInput): Promise<FunnelRecord | null>

  /** Retorna false se o funil não existir ou não pertencer à organização. */
  delete(id: string, organizationId: string): Promise<boolean>

  countLeadsByStage(stageId: string): Promise<number>

  countLeadsByFunnel(funnelId: string): Promise<number>
}
