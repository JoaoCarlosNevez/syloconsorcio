// IUserRepository — port para o perfil de usuário no domínio (public.users).
//
// ADR-12 (decisão 2): id == auth.users.id do Supabase. Este port nunca cria
// a identidade de autenticação — apenas o registro correspondente no domínio.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface UserRecord {
  id: string
  email: string
  name: string | null
  isPlatformAdmin: boolean
}

export interface UpsertUserInput {
  id: string
  email: string
  name?: string | null
}

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>

  /** Cria o registro se não existir, ou atualiza o e-mail/nome se já existir. */
  upsert(input: UpsertUserInput): Promise<UserRecord>
}
