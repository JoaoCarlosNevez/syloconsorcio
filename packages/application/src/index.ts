// Application layer — use cases and orchestration.
//
// Allowed dependencies: @sylocrm/domain only.
// Must NOT depend on: Infrastructure, Supabase, Drizzle, React, HTTP frameworks.
// Verified by architecture tests in packages/testing/src/arch/application.test.ts.
//
// Use cases are added here as product features are implemented.
// Each use case receives repository interfaces (ports) from Domain via dependency injection.

export type { UseCase } from './ports/use-case'
export type { IAuthProvider, AuthIdentity, CreateAuthUserInput } from './ports/auth.provider'
export type { AuthenticatedContext, MembershipContext } from './auth/auth-context'
export { generateTemporaryPassword } from './auth/generate-temporary-password'
export type {
  IMembershipRepository,
  UserMembership,
  TeamMember,
  PlatformTeamMember,
  NewMembershipInput,
} from './ports/membership.repository'
export type {
  IOrganizationRepository,
  OrganizationRecord,
  OrganizationBranding,
  NewOrganizationInput,
  UpdateOrganizationInput,
} from './ports/organization.repository'
export type {
  IUserRepository,
  UserRecord,
  UpsertUserInput,
  UpdateProfileInput,
} from './ports/user.repository'
export type { IStorageProvider, UploadFileInput } from './ports/storage.provider'
export { STORAGE_BUCKETS } from './ports/storage.provider'
export type {
  IFunnelRepository,
  FunnelRecord,
  FunnelStageRecord,
  NewFunnelInput,
  NewFunnelStageInput,
  UpdateFunnelInput,
  StageUpsertInput,
} from './ports/funnel.repository'
export type {
  ILeadRepository,
  LeadRecord,
  NewLeadInput,
  UpdateLeadInput,
  LeadScopeFilter,
  WonValueFilter,
  LeadListFilter,
  LeadListPage,
  AssignmentChange,
  AssignmentHistoryRecord,
  LeadCommentRecord,
  NewLeadCommentInput,
} from './ports/lead.repository'
export type {
  ILeadProposalRepository,
  LeadProposalRecord,
  NewLeadProposalInput,
} from './ports/lead-proposal.repository'
export type {
  ITaskRepository,
  TaskRecord,
  NewTaskInput,
  UpdateTaskInput,
  TaskScopeFilter,
  TaskListFilter,
  TaskListPage,
  TaskStatus,
  TaskStatusFilter,
} from './ports/task.repository'

export { resolveLeadScope } from './leads/lead-scope'
export type { LeadScope } from './leads/lead-scope'
export { applyLeadVisibility } from './leads/lead-visibility'
export { ListLeadsUseCase } from './leads/list-leads.use-case'
export type { ListLeadsInput } from './leads/list-leads.use-case'
export { GetLeadUseCase } from './leads/get-lead.use-case'
export type { GetLeadInput } from './leads/get-lead.use-case'
export { CreateLeadUseCase } from './leads/create-lead.use-case'
export type { CreateLeadInput } from './leads/create-lead.use-case'
export { UpdateLeadUseCase } from './leads/update-lead.use-case'
export type { UpdateLeadUseCaseInput } from './leads/update-lead.use-case'
export { DeleteLeadUseCase } from './leads/delete-lead.use-case'
export type { DeleteLeadInput } from './leads/delete-lead.use-case'
export { GetLeadHistoryUseCase } from './leads/get-lead-history.use-case'
export type { GetLeadHistoryInput, LeadHistory } from './leads/get-lead-history.use-case'
export { CreateLeadCommentUseCase } from './leads/create-lead-comment.use-case'
export type { CreateLeadCommentInput } from './leads/create-lead-comment.use-case'
export { DuplicateLeadUseCase } from './leads/duplicate-lead.use-case'
export type { DuplicateLeadUseCaseInput } from './leads/duplicate-lead.use-case'
export { ListLeadProposalsUseCase } from './leads/list-lead-proposals.use-case'
export type { ListLeadProposalsInput } from './leads/list-lead-proposals.use-case'
export { CreateLeadProposalUseCase } from './leads/create-lead-proposal.use-case'
export type { CreateLeadProposalInput } from './leads/create-lead-proposal.use-case'

export { ListTasksUseCase } from './tasks/list-tasks.use-case'
export type { ListTasksInput } from './tasks/list-tasks.use-case'
export { CreateTaskUseCase } from './tasks/create-task.use-case'
export type { CreateTaskInput } from './tasks/create-task.use-case'
export { UpdateTaskUseCase } from './tasks/update-task.use-case'
export type { UpdateTaskUseCaseInput } from './tasks/update-task.use-case'
export { DeleteTaskUseCase } from './tasks/delete-task.use-case'
export type { DeleteTaskInput } from './tasks/delete-task.use-case'

export { ListFunnelsUseCase } from './funnels/list-funnels.use-case'
export type { ListFunnelsInput } from './funnels/list-funnels.use-case'
export { CreateFunnelUseCase } from './funnels/create-funnel.use-case'
export type { CreateFunnelInput } from './funnels/create-funnel.use-case'
export { UpdateFunnelUseCase } from './funnels/update-funnel.use-case'
export type { UpdateFunnelUseCaseInput } from './funnels/update-funnel.use-case'
export { DeleteFunnelUseCase } from './funnels/delete-funnel.use-case'
export type { DeleteFunnelInput } from './funnels/delete-funnel.use-case'

export { CreateRepresentationUseCase } from './organizations/create-representation.use-case'
export type {
  CreateRepresentationInput,
  CreateRepresentationOutput,
} from './organizations/create-representation.use-case'

export { CreatePlatformUserUseCase } from './organizations/create-platform-user.use-case'
export type {
  CreatePlatformUserInput,
  CreatePlatformUserOutput,
} from './organizations/create-platform-user.use-case'

export { DeletePlatformUserUseCase } from './organizations/delete-platform-user.use-case'
export type { DeletePlatformUserInput } from './organizations/delete-platform-user.use-case'

export { InviteTeamMemberUseCase } from './team/invite-team-member.use-case'
export type {
  InviteTeamMemberInput,
  InviteTeamMemberOutput,
} from './team/invite-team-member.use-case'

export { RemoveTeamMemberUseCase } from './team/remove-team-member.use-case'
export type { RemoveTeamMemberInput } from './team/remove-team-member.use-case'

export { ReactivateTeamMemberUseCase } from './team/reactivate-team-member.use-case'
export type { ReactivateTeamMemberInput } from './team/reactivate-team-member.use-case'

export { GetSalesGoalsSummaryUseCase } from './team/get-sales-goals-summary.use-case'
export type {
  GetSalesGoalsSummaryInput,
  PersonalGoalProgress,
  SalesGoalProgress,
  SalesGoalsSummary,
} from './team/get-sales-goals-summary.use-case'

export { UpdateMyPersonalGoalUseCase } from './team/update-my-personal-goal.use-case'
export type { UpdateMyPersonalGoalInput } from './team/update-my-personal-goal.use-case'

export { UpdateTeamMemberSalesGoalUseCase } from './team/update-team-member-sales-goal.use-case'
export type { UpdateTeamMemberSalesGoalInput } from './team/update-team-member-sales-goal.use-case'

export { NO_OP_ACTIVITY_LOG } from './ports/activity-log.repository'
export type {
  ActivityAction,
  ActivityActor,
  ActivityEntityType,
  ActivityListFilter,
  ActivityListPage,
  ActivityMetadata,
  ActivityRecord,
  IActivityLogRepository,
  NewActivityEntry,
} from './ports/activity-log.repository'
