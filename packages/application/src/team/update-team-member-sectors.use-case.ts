// UpdateTeamMemberSectorsUseCase — define os setores (Vendas, ADM, Pós-venda)
// de um membro da organização (Configurações → Equipe). A permissão
// (team.role_update, só o Dono) é checada na rota; aqui só a regra do dado:
// sem setores repetidos.

import type { MemberSector } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateTeamMemberSectorsInput {
  actorUserId: string
  targetUserId: string
  organizationId: string
  sectors: MemberSector[]
}

export class UpdateTeamMemberSectorsUseCase
  implements UseCase<UpdateTeamMemberSectorsInput, MemberSector[]>
{
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateTeamMemberSectorsInput): Promise<MemberSector[]> {
    const sectors = [...new Set(input.sectors)]
    await this.membershipRepository.updateSectors(input.targetUserId, input.organizationId, sectors)
    await this.activityLog.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'team.sectors_updated',
      entityType: 'team',
      entityId: input.targetUserId,
      entityLabel: null,
      metadata: { sectors: sectors.join(',') },
    })
    return sectors
  }
}
