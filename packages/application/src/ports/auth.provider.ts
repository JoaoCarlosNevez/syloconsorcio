// IAuthProvider — port de autenticação da camada Application.
//
// Define o contrato que a Infrastructure deve implementar para autenticação.
// A Application usa esta interface sem saber que o provider é Supabase Auth.
//
// Implementação concreta: packages/infrastructure/src/auth/supabase-auth.adapter.ts
// (criado na Etapa 07)
//
// Regra: nenhum método deste contrato deve referenciar tipos do SDK do Supabase.

/**
 * Identidade autenticada conforme o provedor de auth.
 *
 * Por decisão arquitetural (ver ADR-12), o ID do Supabase Auth é reutilizado
 * como ID do usuário no domínio (users.id = auth.users.id).
 * Portanto, identityId e userId são o mesmo valor.
 */
export interface AuthIdentity {
  /** Supabase auth.users.id — igual ao users.id do domínio */
  id: string
  email: string
}

/**
 * Contrato de autenticação injetado via DI nos middlewares Fastify.
 *
 * A Infrastructure implementa este port usando o Supabase Admin SDK.
 * O restante da aplicação não conhece o Supabase.
 */
export interface CreateAuthUserInput {
  email: string
  password: string
}

export interface IAuthProvider {
  /**
   * Verifica um Bearer token e retorna a identidade autenticada.
   * Retorna null se o token for inválido, expirado ou ausente.
   */
  verifyToken(token: string): Promise<AuthIdentity | null>

  /**
   * Invalida a sessão associada ao token no provedor de auth.
   * Chamado no fluxo de logout.
   */
  signOut(token: string): Promise<void>

  /**
   * Cria uma nova identidade autenticada (usado ao criar o dono de uma nova
   * Representação, ou ao convidar um membro de equipe). Lança ConflictError
   * (ver @sylocrm/domain) se o e-mail já estiver cadastrado.
   */
  createUser(input: CreateAuthUserInput): Promise<AuthIdentity>

  /**
   * Apaga a identidade autenticada — a pessoa nunca mais consegue logar.
   * Não apaga o registro correspondente em `users` (ver IUserRepository):
   * esse registro pode ser referenciado por histórico auditável (ex: leads).
   */
  deleteUser(id: string): Promise<void>
}
