// CreateLeadUseCase — cria um lead na organização ativa do Membership.
//
// Leads sempre nascem na organização em que o usuário está operando
// (currentMembership.organizationId) — nunca numa organização informada pelo cliente.
// Nascem sempre no primeiro estágio (position 0) do funil informado.
//
// Telefone é único por organização — 2 vendedores não podem cadastrar o mesmo
// lead; prioridade é de quem cadastrou primeiro. Essa checagem NÃO se aplica à
// duplicação "passar o bastão" (ver duplicate-lead-record.ts), que chama
// leadRepository.create() diretamente: ali não é uma disputa entre vendedores,
// é o mesmo negócio sendo encaminhado de propósito pra outro setor/funil.

import { ValidationError } from '@sylocrm/domain'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { UseCase } from '../ports/use-case'

export interface CreateLeadInput {
  organizationId: string
  funnelId: string
  assignedUserId?: string | null
  name: string
  phone: string
  email?: string | null
  segment: string
  valueCents: number
  quotaCount?: number
  source: string
  notes?: string | null
}

export class CreateLeadUseCase implements UseCase<CreateLeadInput, LeadRecord> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly funnelRepository: IFunnelRepository,
  ) {}

  async execute(input: CreateLeadInput): Promise<LeadRecord> {
    const funnel = await this.funnelRepository.findById(input.funnelId, input.organizationId)
    if (!funnel) {
      throw new ValidationError([{ field: 'funnelId', message: 'Funil não encontrado.' }])
    }
    const firstStage = funnel.stages[0]
    if (!firstStage) {
      throw new ValidationError([{ field: 'funnelId', message: 'O funil não tem nenhum estágio.' }])
    }

    const existing = await this.leadRepository.findByPhone(input.organizationId, input.phone)
    if (existing) {
      throw new ValidationError([
        { field: 'phone', message: 'Já existe um lead cadastrado com este telefone.' },
      ])
    }

    return this.leadRepository.create({ ...input, stageId: firstStage.id })
  }
}
