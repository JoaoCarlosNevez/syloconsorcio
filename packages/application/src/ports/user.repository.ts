// IUserRepository — port para o perfil de usuário no domínio (public.users).
//
// ADR-06 (decisão 2): id == auth.users.id do Supabase. Este port nunca cria
// a identidade de autenticação — apenas o registro correspondente no domínio.
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface UserRecord {
  id: string
  email: string
  name: string | null
  /** Handle do Instagram, sem o "@" (ex: "sara.sylo"). */
  instagramHandle: string | null
  /** Cidade/região livre (ex: "São Paulo, SP"). */
  location: string | null
  isPlatformAdmin: boolean
  createdAt: Date
}

export interface UpsertUserInput {
  id: string
  email: string
  name?: string | null
}

export interface UpdateProfileInput {
  name?: string
  instagramHandle?: string | null
  location?: string | null
}

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>

  /** Cria o registro se não existir, ou atualiza o e-mail/nome se já existir. */
  upsert(input: UpsertUserInput): Promise<UserRecord>

  /** Autoatualização de perfil pelo próprio usuário — nunca toca em email/isPlatformAdmin. */
  updateProfile(id: string, input: UpdateProfileInput): Promise<UserRecord>
}
