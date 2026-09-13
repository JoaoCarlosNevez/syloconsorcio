// Domain package — pure business rules, entities, value objects, policies.
//
// STRICT ISOLATION: this package has zero external dependencies.
// It must never import: React, Supabase, Drizzle, PostgreSQL, HTTP, Express.
// Verified by architecture tests in packages/testing/src/arch/domain.test.ts.

export { DomainError } from './errors/domain-error'
export { ValidationError } from './errors/validation-error'
export type { ValidationIssue } from './errors/validation-error'

export * from './auth'
export * from './leads'
