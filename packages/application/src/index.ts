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
  NewMembershipInput,
} from './ports/membership.repository'
export type {
  IOrganizationRepository,
  OrganizationRecord,
  NewOrganizationInput,
} from './ports/organization.repository'
export type { IUserRepository, UserRecord, UpsertUserInput } from './ports/user.repository'
export type {
  ILeadRepository,
  LeadRecord,
  NewLeadInput,
  UpdateLeadInput,
  LeadScopeFilter,
  LeadListFilter,
  LeadListPage,
  AssignmentChange,
} from './ports/lead.repository'

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

export { CreateRepresentationUseCase } from './organizations/create-representation.use-case'
export type {
  CreateRepresentationInput,
  CreateRepresentationOutput,
} from './organizations/create-representation.use-case'

export { InviteTeamMemberUseCase } from './team/invite-team-member.use-case'
export type {
  InviteTeamMemberInput,
  InviteTeamMemberOutput,
} from './team/invite-team-member.use-case'
