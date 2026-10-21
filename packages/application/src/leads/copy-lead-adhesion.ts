// copyLeadAdhesion — leva a ficha de adesão e os documentos de um lead pra
// cópia dele em outro funil (ex: o Ganho que vai pro funil ADM). Os arquivos
// são COPIADOS no Storage (pasta do lead novo): apagar um dos leads não pode
// apagar os documentos do outro.

import type { ILeadAdhesionRepository } from '../ports/lead-adhesion.repository'
import type { LeadRecord } from '../ports/lead.repository'
import { type IStorageProvider, PRIVATE_STORAGE_BUCKETS } from '../ports/storage.provider'

export async function copyLeadAdhesion(
  leadAdhesionRepository: ILeadAdhesionRepository,
  storage: IStorageProvider,
  source: LeadRecord,
  target: LeadRecord,
  actorUserId: string,
): Promise<void> {
  const adhesion = await leadAdhesionRepository.findByLead(source.id)
  if (adhesion) {
    const {
      leadId: _leadId,
      organizationId: _organizationId,
      updatedByUserId: _updatedBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...fields
    } = adhesion
    await leadAdhesionRepository.upsert({
      ...fields,
      leadId: target.id,
      organizationId: target.organizationId,
      updatedByUserId: actorUserId,
    })
  }

  const documents = await leadAdhesionRepository.listDocuments(source.id)
  for (const document of documents) {
    const fileName = document.storagePath.split('/').pop() ?? `${document.kind}`
    const storagePath = `${target.organizationId}/${target.id}/${fileName}`
    await storage.copyFile({
      bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
      from: document.storagePath,
      to: storagePath,
    })
    await leadAdhesionRepository.replaceDocument({
      leadId: target.id,
      organizationId: target.organizationId,
      kind: document.kind,
      fileName: document.fileName,
      storagePath,
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
      uploadedByUserId: document.uploadedByUserId,
    })
  }
}
