import { DomainError } from './domain-error'

export type ValidationIssue = {
  field: string
  message: string
}

// Raised when input data violates domain validation rules.
// Contains a list of issues so all errors are surfaced at once,
// not one at a time.
export class ValidationError extends DomainError {
  constructor(public readonly issues: ValidationIssue[]) {
    super(
      `Validation failed: ${issues.map((i) => `${i.field} — ${i.message}`).join(', ')}`,
      'VALIDATION_ERROR',
    )
    this.name = 'ValidationError'
  }
}
