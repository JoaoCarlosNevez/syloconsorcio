import { DomainError } from './domain-error'

// Levantado quando uma regra de autorização de negócio é violada
// (ex: tentar conceder um Role igual ou acima do próprio — ver role-hierarchy.ts).
// Diferente de uma Permission ausente (checada na camada HTTP), isto é um
// invariante do próprio caso de uso.
export class AuthorizationError extends DomainError {
  constructor(message = 'Ação não autorizada.') {
    super(message, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}
