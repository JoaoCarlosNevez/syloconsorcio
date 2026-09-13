// Database schema barrel — all Drizzle table definitions.
// Import from here to keep infrastructure boundaries clean.

export { users } from './users'
export type { DbUser, NewDbUser } from './users'

export { organizations, organizationTypeEnum } from './organizations'
export type { DbOrganization, NewDbOrganization } from './organizations'

export { organizationMemberships, membershipStatusEnum, roleEnum } from './memberships'
export type { DbMembership, NewDbMembership } from './memberships'

export { leads, leadStageEnum } from './leads'
export type { DbLead, NewDbLead } from './leads'

export { leadAssignmentHistory } from './lead-assignment-history'
export type { DbLeadAssignmentHistory, NewDbLeadAssignmentHistory } from './lead-assignment-history'
