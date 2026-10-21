// Tests: UpdateTeamMemberSupervisorUseCase — só Vendedor tem supervisor, e o
// supervisor precisa ser um Supervisor ativo da organização.

import { Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import { UpdateTeamMemberSupervisorUseCase } from './update-team-member-supervisor.use-case'

const ORG = 'org-01'

function member(userId: string, role: Role, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
    supervisorUserId: null,
    ...overrides,
  }
}

function setup() {
  const membershipRepository = {
    findActiveByOrganizationId: vi
      .fn()
      .mockResolvedValue([
        member('dono', Role.ADMIN),
        member('carlos', Role.MANAGER),
        member('ana', Role.SELLER),
        member('saiu', Role.MANAGER, { status: 'SUSPENDED' }),
      ]),
    updateSupervisor: vi.fn().mockResolvedValue(undefined),
  } as unknown as IMembershipRepository
  const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
  return {
    useCase: new UpdateTeamMemberSupervisorUseCase(membershipRepository, activityLog),
    membershipRepository,
    activityLog,
  }
}

const base = { actorUserId: 'dono', organizationId: ORG }

describe('UpdateTeamMemberSupervisorUseCase', () => {
  it('links a seller to a supervisor and logs it', async () => {
    const { useCase, membershipRepository, activityLog } = setup()

    expect(
      await useCase.execute({ ...base, targetUserId: 'ana', supervisorUserId: 'carlos' }),
    ).toBe(true)

    expect(membershipRepository.updateSupervisor).toHaveBeenCalledWith('ana', ORG, 'carlos')
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'team.supervisor_updated',
        metadata: { from: null, to: 'carlos' },
      }),
    )
  })

  it('unlinks with null', async () => {
    const { useCase, membershipRepository } = setup()

    await useCase.execute({ ...base, targetUserId: 'ana', supervisorUserId: null })

    // Já estava sem supervisor — nada muda.
    expect(membershipRepository.updateSupervisor).not.toHaveBeenCalled()
  })

  it('only sellers have a supervisor', async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute({ ...base, targetUserId: 'carlos', supervisorUserId: 'carlos' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('the supervisor must be an active supervisor', async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute({ ...base, targetUserId: 'ana', supervisorUserId: 'dono' }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      useCase.execute({ ...base, targetUserId: 'ana', supervisorUserId: 'saiu' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('returns false for someone who is not in the organization', async () => {
    const { useCase } = setup()

    expect(
      await useCase.execute({ ...base, targetUserId: 'ninguem', supervisorUserId: 'carlos' }),
    ).toBe(false)
  })
})
