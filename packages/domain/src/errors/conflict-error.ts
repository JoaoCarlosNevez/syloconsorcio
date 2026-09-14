import { DomainError } from './domain-error'

// Levantado quando uma operação viola um estado único/existente
// (ex: e-mail já cadastrado, membership já existente).
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT')
    this.name = 'ConflictError'
  }
}
