// Ficha (checklist) de adesão do lead — ler e salvar.
//
// Mesma regra de visibilidade do lead (resolveLeadScope): quem não enxerga o
// lead não lê nem edita a ficha. O vendedor da ficha precisa ser membro ativo
// da organização do lead.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import {
  ADHESION_DOCUMENT_KINDS,
  type AdhesionDocumentKind,
  type ILeadAdhesionRepository,
  type LeadAdhesionDocumentRecord,
  type LeadAdhesionFields,
  type LeadAdhesionRecord,
  MAX_ADHESION_QUOTAS,
} from '../ports/lead-adhesion.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { type IStorageProvider, PRIVATE_STORAGE_BUCKETS } from '../ports/storage.provider'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

interface LeadAccessInput {
  leadId: string
  userId: string
  membership: MembershipContext
}

export interface GetLeadAdhesionOutput {
  /** null = ficha ainda não preenchida. */
  adhesion: LeadAdhesionRecord | null
}

export class GetLeadAdhesionUseCase
  implements UseCase<LeadAccessInput, GetLeadAdhesionOutput | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: LeadAccessInput): Promise<GetLeadAdhesionOutput | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    return { adhesion: await this.leadAdhesionRepository.findByLead(lead.id) }
  }
}

export interface SaveLeadAdhesionInput extends LeadAccessInput {
  fields: LeadAdhesionFields
}

export class SaveLeadAdhesionUseCase
  implements UseCase<SaveLeadAdhesionInput, LeadAdhesionRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: SaveLeadAdhesionInput): Promise<LeadAdhesionRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    if (input.fields.quotas.length > MAX_ADHESION_QUOTAS) {
      throw new ValidationError([
        { field: 'quotas', message: `No máximo ${MAX_ADHESION_QUOTAS} cotas por venda.` },
      ])
    }

    if (input.fields.sellerUserId) {
      const members = await this.membershipRepository.findActiveByOrganizationId(
        lead.organizationId,
      )
      const isActiveMember = members.some(
        (m) => m.userId === input.fields.sellerUserId && m.status === 'ACTIVE',
      )
      if (!isActiveMember) {
        throw new ValidationError([
          { field: 'sellerUserId', message: 'O vendedor precisa ser membro ativo da organização.' },
        ])
      }
    }

    const adhesion = await this.leadAdhesionRepository.upsert({
      ...input.fields,
      leadId: lead.id,
      organizationId: lead.organizationId,
      updatedByUserId: input.userId,
    })

    const { quotas, ...personal } = input.fields
    const filled =
      Object.values(personal).filter((value) => value !== null).length +
      quotas.reduce(
        (total, quota) => total + Object.values(quota).filter((value) => value !== null).length,
        0,
      )
    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.adhesion_updated',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { filledFields: filled, quotaCount: quotas.length },
    })

    return adhesion
  }
}

// ── Documentos da ficha ─────────────────────────────────────────────────────
//
// Print do e-mail, comprovante de residência e carta a punho. Ficam no bucket
// PRIVADO: a leitura é sempre por link assinado de poucos minutos, gerado só
// pra quem enxerga o lead. Um arquivo vigente por tipo.

/** Tamanho máximo de um documento. */
export const ADHESION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

/** Tipos aceitos → extensão do arquivo no Storage. */
export const ADHESION_DOCUMENT_TYPES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** Quanto tempo o link de leitura de um documento vale. */
export const ADHESION_DOCUMENT_LINK_SECONDS = 10 * 60

export interface UploadAdhesionDocumentInput extends LeadAccessInput {
  kind: string
  fileName: string
  contentType: string
  data: Buffer
}

export class UploadAdhesionDocumentUseCase
  implements UseCase<UploadAdhesionDocumentInput, LeadAdhesionDocumentRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
    private readonly storage: IStorageProvider,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: UploadAdhesionDocumentInput): Promise<LeadAdhesionDocumentRecord | null> {
    if (!(ADHESION_DOCUMENT_KINDS as readonly string[]).includes(input.kind)) {
      throw new ValidationError([{ field: 'kind', message: 'Tipo de documento inválido.' }])
    }
    const extension = ADHESION_DOCUMENT_TYPES[input.contentType]
    if (!extension) {
      throw new ValidationError([
        { field: 'file', message: 'Envie um PDF ou uma foto (JPG, PNG, WEBP ou HEIC).' },
      ])
    }
    if (input.data.length === 0 || input.data.length > ADHESION_DOCUMENT_MAX_BYTES) {
      throw new ValidationError([{ field: 'file', message: 'O arquivo precisa ter até 10 MB.' }])
    }

    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    const kind = input.kind as AdhesionDocumentKind
    const storagePath = `${lead.organizationId}/${lead.id}/${kind}-${Date.now()}.${extension}`
    await this.storage.uploadPrivateFile({
      bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
      path: storagePath,
      data: input.data,
      contentType: input.contentType,
    })

    let saved: Awaited<ReturnType<ILeadAdhesionRepository['replaceDocument']>>
    try {
      saved = await this.leadAdhesionRepository.replaceDocument({
        leadId: lead.id,
        organizationId: lead.organizationId,
        kind,
        fileName: input.fileName.slice(0, 200) || `${kind}.${extension}`,
        storagePath,
        contentType: input.contentType,
        sizeBytes: input.data.length,
        uploadedByUserId: input.userId,
      })
    } catch (error) {
      // Sem registro no banco o arquivo ficaria órfão no bucket.
      await this.storage.deleteFiles({
        bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
        paths: [storagePath],
      })
      throw error
    }

    if (saved.previous) {
      await this.storage.deleteFiles({
        bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
        paths: [saved.previous.storagePath],
      })
    }

    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.document_uploaded',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { kind },
    })

    return saved.document
  }
}

export interface AdhesionDocumentWithLink extends LeadAdhesionDocumentRecord {
  /** Link de leitura temporário (ADHESION_DOCUMENT_LINK_SECONDS). */
  url: string
}

export class ListAdhesionDocumentsUseCase
  implements UseCase<LeadAccessInput, AdhesionDocumentWithLink[] | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
    private readonly storage: IStorageProvider,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: LeadAccessInput): Promise<AdhesionDocumentWithLink[] | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    const documents = await this.leadAdhesionRepository.listDocuments(lead.id)
    return Promise.all(
      documents.map(async (document) => ({
        ...document,
        url: await this.storage.createSignedUrl({
          bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
          path: document.storagePath,
          expiresInSeconds: ADHESION_DOCUMENT_LINK_SECONDS,
        }),
      })),
    )
  }
}

export interface DeleteAdhesionDocumentInput extends LeadAccessInput {
  documentId: string
}

export class DeleteAdhesionDocumentUseCase
  implements UseCase<DeleteAdhesionDocumentInput, boolean>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
    private readonly storage: IStorageProvider,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** false quando o lead (ou o documento dele) não existe ou está fora do escopo. */
  async execute(input: DeleteAdhesionDocumentInput): Promise<boolean> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return false

    const removed = await this.leadAdhesionRepository.deleteDocument(lead.id, input.documentId)
    if (!removed) return false

    await this.storage.deleteFiles({
      bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
      paths: [removed.storagePath],
    })
    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.document_deleted',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { kind: removed.kind },
    })
    return true
  }
}
