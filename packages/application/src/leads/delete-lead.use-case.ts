import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { type IStorageProvider, PRIVATE_STORAGE_BUCKETS } from '../ports/storage.provider'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface DeleteLeadInput {
  id: string
  userId: string
  membership: MembershipContext
}

export class DeleteLeadUseCase implements UseCase<DeleteLeadInput, boolean> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
    /** Pra apagar os documentos da ficha de adesão (bucket privado) junto
     * com o lead — as linhas somem por cascade, os arquivos não. */
    private readonly storage: IStorageProvider | null = null,
  ) {}

  async execute(input: DeleteLeadInput): Promise<boolean> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    // Lido antes de apagar só pra o log guardar o nome e o valor.
    const lead = await this.leadRepository.findById(input.id, scope)
    const deleted = await this.leadRepository.delete(input.id, scope)

    if (deleted && lead && this.storage) {
      await this.storage.deleteFolderFiles({
        bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
        folder: `${lead.organizationId}/${lead.id}`,
      })
    }

    if (deleted && lead) {
      await this.activityLog.record({
        organizationId: lead.organizationId,
        actorUserId: input.userId,
        action: 'lead.deleted',
        entityType: 'lead',
        entityId: lead.id,
        entityLabel: lead.name,
        metadata: { valueCents: lead.valueCents, segment: lead.segment },
      })
    }

    return deleted
  }
}
