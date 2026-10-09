// Tests: UpdateTeamMemberRoleUseCase — quem muda o papel de quem, e a
// organização nunca fica sem Dono.

import { AuthorizationError, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import { UpdateTeamMemberRoleUseCase } from './update-team-member-role.use-case'

const ORG = 'org-01'

function member(userId: string, role: Role): TeamMember {
  return {
    userId,
    name: userId,
    email: `${userId}@sylo.com`,
    avatarUrl: null,
    role,
    status: 'ACTIVE',
    salesGoalCents: null,
    tier: 'bronze',
  }
}

function setup(members: TeamMember[] = [member('dono', Role.ADMIN)]) {
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn().mockResolvedValue(members),
    updateRole: vi.fn().mockResolvedValue(undefined),
  } as unknown as IMembershipRepository
  const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
  return {
    useCase: new UpdateTeamMemberRoleUseCase(membershipRepository, activityLog),
    membershipRepository,
    activityLog,
  }
}

const base = { organizationId: ORG, actorIsPlatformAdmin: false }

describe('UpdateTeamMemberRoleUseCase', () => {
  it('lets an owner promote a supervisor to owner and logs it', async () => {
    const { useCase, membershipRepository, activityLog } = setup()

    await useCase.execute({
      ...base,
      actorUserId: 'dono',
      targetUserId: 'ennyo',
      targetRole: Role.MANAGER,
      role: Role.ADMIN,
    })

    expect(membershipRepository.updateRole).toHaveBeenCalledWith('ennyo', ORG, Role.ADMIN)
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'team.role_updated',
        metadata: { from: Role.MANAGER, to: Role.ADMIN },
      }),
    )
  })

  it('lets an owner turn a seller into a supervisor', async () => {
    const { useCase, membershipRepository } = setup()

    await useCase.execute({
      ...base,
      actorUserId: 'dono',
      targetUserId: 'bia',
      targetRole: Role.SELLER,
      role: Role.MANAGER,
    })

    expect(membershipRepository.updateRole).toHaveBeenCalledWith('bia', ORG, Role.MANAGER)
  })

  it('does not let anyone change their own role', async () => {
    const { useCase, membershipRepository } = setup()

    await expect(
      useCase.execute({
        ...base,
        actorIsPlatformAdmin: true,
        actorUserId: 'dono',
        targetUserId: 'dono',
        targetRole: Role.ADMIN,
        role: Role.SELLER,
      }),
    ).rejects.toThrow(AuthorizationError)
    expect(membershipRepository.updateRole).not.toHaveBeenCalled()
  })

  it('does not let an owner change another owner', async () => {
    const { useCase } = setup([member('dono', Role.ADMIN), member('socio', Role.ADMIN)])

    await expect(
      useCase.execute({
        ...base,
        actorUserId: 'dono',
        targetUserId: 'socio',
        targetRole: Role.ADMIN,
        role: Role.SELLER,
      }),
    ).rejects.toThrow(AuthorizationError)
  })

  it('lets the super admin demote an owner when another owner remains', async () => {
    const { useCase, membershipRepository } = setup([
      member('dono', Role.ADMIN),
      member('socio', Role.ADMIN),
    ])

    await useCase.execute({
      ...base,
      actorIsPlatformAdmin: true,
      actorUserId: 'super',
      targetUserId: 'socio',
      targetRole: Role.ADMIN,
      role: Role.MANAGER,
    })

    expect(membershipRepository.updateRole).toHaveBeenCalledWith('socio', ORG, Role.MANAGER)
  })

  it('never leaves the organization without an owner', async () => {
    const { useCase, membershipRepository } = setup([member('dono', Role.ADMIN)])

    await expect(
      useCase.execute({
        ...base,
        actorIsPlatformAdmin: true,
        actorUserId: 'super',
        targetUserId: 'dono',
        targetRole: Role.ADMIN,
        role: Role.MANAGER,
      }),
    ).rejects.toThrow(ValidationError)
    expect(membershipRepository.updateRole).not.toHaveBeenCalled()
  })

  it('does nothing when the role does not change', async () => {
    const { useCase, membershipRepository } = setup()

    await useCase.execute({
      ...base,
      actorUserId: 'dono',
      targetUserId: 'bia',
      targetRole: Role.SELLER,
      role: Role.SELLER,
    })

    expect(membershipRepository.updateRole).not.toHaveBeenCalled()
  })
})
