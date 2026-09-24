// duplicateLeadRecord — cria uma cópia de um lead existente no primeiro
// estágio de outro funil. Usado tanto pelo gatilho automático (ver
// update-lead.use-case.ts — "passar o bastão" ao marcar Ganho) quanto pela
// transferência manual (ver duplicate-lead.use-case.ts).
//
// A cópia nasce sem wonAt/lostAt (funil novo, progresso do zero), com o mesmo
// responsável do lead original (pode ser reatribuído depois), e leva uma nota
// referenciando o lead de origem para rastreabilidade.
//
// Chama leadRepository.create() diretamente (não passa por CreateLeadUseCase)
// — de propósito: a checagem de telefone único por organização não se aplica
// aqui. Não é uma disputa entre 2 vendedores cadastrando o mesmo cliente, é o
// mesmo negócio sendo encaminhado (ex: vendas → admin dar seguimento ao processo).

import { ValidationError } from '@sylocrm/domain'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'

function buildDuplicateNote(source: LeadRecord, sourceFunnelName: string): string {
  const header = `Duplicado do lead "${source.name}" (funil "${sourceFunnelName}") em ${new Date().toLocaleDateString('pt-BR')}.`
  return source.notes ? `${header}\n\n${source.notes}` : header
}

export async function duplicateLeadRecord(
  leadRepository: ILeadRepository,
  funnelRepository: IFunnelRepository,
  source: LeadRecord,
  sourceFunnelName: string,
  targetFunnelId: string,
): Promise<LeadRecord> {
  const targetFunnel = await funnelRepository.findById(targetFunnelId, source.organizationId)
  if (!targetFunnel) {
    throw new ValidationError([
      { field: 'targetFunnelId', message: 'Funil de destino não encontrado.' },
    ])
  }
  const firstStage = targetFunnel.stages[0]
  if (!firstStage) {
    throw new ValidationError([
      { field: 'targetFunnelId', message: 'O funil de destino não tem nenhum estágio.' },
    ])
  }

  return leadRepository.create({
    organizationId: source.organizationId,
    name: source.name,
    phone: source.phone,
    email: source.email,
    segment: source.segment,
    valueCents: source.valueCents,
    quotaCount: source.quotaCount,
    source: source.source,
    funnelId: targetFunnelId,
    stageId: firstStage.id,
    assignedUserId: source.assignedUserId,
    tags: source.tags,
    notes: buildDuplicateNote(source, sourceFunnelName),
  })
}
