// CreateLeadUseCase — cria um lead na organização ativa do Membership.
//
// Leads sempre nascem na organização em que o usuário está operando
// (currentMembership.organizationId) — nunca numa organização informada pelo cliente.

import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { UseCase } from '../ports/use-case'

export interface CreateLeadInput {
  organizationId: string
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
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(input: CreateLeadInput): Promise<LeadRecord> {
    return this.leadRepository.create(input)
  }
}
