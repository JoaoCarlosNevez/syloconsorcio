// Base error class for all domain violations.
// Use this when a business rule or invariant is violated.
// Subclass for specific error categories (ValidationError, AuthorizationError, etc.).

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'DomainError'

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
