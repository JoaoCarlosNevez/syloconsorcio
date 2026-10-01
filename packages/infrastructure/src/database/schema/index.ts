// Database schema barrel — all Drizzle table definitions.
// Import from here to keep infrastructure boundaries clean.

export { users } from './users'
export type { DbUser, NewDbUser } from './users'

export { organizations, organizationTypeEnum } from './organizations'
export type { DbOrganization, NewDbOrganization } from './organizations'

export { organizationMemberships, membershipStatusEnum, roleEnum } from './memberships'
export type { DbMembership, NewDbMembership } from './memberships'

export { leads } from './leads'
export type { DbLead, NewDbLead } from './leads'

export { funnels } from './funnels'
export type { DbFunnel, NewDbFunnel } from './funnels'

export { funnelStages } from './funnel-stages'
export type { DbFunnelStage, NewDbFunnelStage } from './funnel-stages'

export { leadAssignmentHistory } from './lead-assignment-history'
export type { DbLeadAssignmentHistory, NewDbLeadAssignmentHistory } from './lead-assignment-history'

export { leadComments } from './lead-comments'
export type { DbLeadComment, NewDbLeadComment } from './lead-comments'

export { leadProposals } from './lead-proposals'
export type { DbLeadProposal, NewDbLeadProposal } from './lead-proposals'

export { tasks } from './tasks'
export type { DbTask, NewDbTask } from './tasks'

export { activityLog } from './activity-log'
export type { DbActivityLog, NewDbActivityLog } from './activity-log'

export { notifications } from './notifications'
export type { DbNotification, NewDbNotification } from './notifications'

export { organizationApiKeys } from './organization-api-keys'
export type { DbOrganizationApiKey, NewDbOrganizationApiKey } from './organization-api-keys'

export { leadOffers, leadQueueMembers, leadQueueSettings } from './lead-queue'
export type { DbLeadOffer } from './lead-queue'
