// SupabaseAuthAdapter — implementação concreta de IAuthProvider.
//
// Isola o Supabase Auth SDK na camada Infrastructure.
// O restante da aplicação não importa @supabase/supabase-js.
//
// ADR-06: Supabase Auth isolado via port IAuthProvider.
// ADR-06: Validação de Bearer token via Admin SDK.

import { createClient } from '@supabase/supabase-js'
import type { AuthIdentity, CreateAuthUserInput, IAuthProvider } from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'

export interface SupabaseAuthConfig {
  supabaseUrl: string
  supabaseServiceKey: string
}

/**
 * Adapter que traduz Supabase Auth para o contrato interno IAuthProvider.
 *
 * Usa a service key (Admin SDK) para validar tokens e gerenciar sessões.
 * A service key NUNCA deve ser exposta ao frontend.
 */
export class SupabaseAuthAdapter implements IAuthProvider {
  private readonly client: ReturnType<typeof createClient>

  constructor(config: SupabaseAuthConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }

  /**
   * Verifica um Bearer token JWT emitido pelo Supabase Auth.
   * Retorna AuthIdentity se válido, null se inválido/expirado.
   *
   * Internamente usa getUser() que valida a assinatura do JWT
   * e verifica a revogação de sessão no Supabase Auth.
   */
  async verifyToken(token: string): Promise<AuthIdentity | null> {
    const { data, error } = await this.client.auth.getUser(token)

    if (error ?? !data.user) {
      return null
    }

    const email = data.user.email
    if (!email) {
      // Email is required for system identity — user without email is not supported
      return null
    }

    return {
      id: data.user.id,
      email,
    }
  }

  /**
   * Invalida a sessão do usuário no Supabase Auth.
   * Chamado no fluxo de logout via POST /auth/logout.
   *
   * Recebe o token para identificar o usuário, depois invalida
   * todas as sessões globalmente via admin.signOut().
   */
  async signOut(token: string): Promise<void> {
    // Resolve userId from token first, then invalidate all sessions
    const identity = await this.verifyToken(token)
    if (identity) {
      await this.client.auth.admin.signOut(identity.id)
    }
  }

  /**
   * Cria uma nova identidade (dono de Representação ou convite de equipe).
   * O e-mail já entra confirmado — quem cria a conta em nome de outra pessoa
   * já validou o contato por fora do fluxo de auto-cadastro.
   */
  async createUser(input: CreateAuthUserInput): Promise<AuthIdentity> {
    const { data, error } = await this.client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    })

    if (error || !data.user) {
      if (error?.status === 422 || error?.message.includes('already been registered')) {
        throw new ConflictError(`E-mail já cadastrado: ${input.email}`)
      }
      throw new Error(error?.message ?? 'Falha ao criar usuário no Supabase Auth.')
    }

    const email = data.user.email
    if (!email) {
      throw new Error('Usuário criado sem e-mail — estado inesperado do Supabase Auth.')
    }

    return { id: data.user.id, email }
  }

  /**
   * Apaga a identidade no Supabase Auth (exclusão de conta pelo Super Admin).
   * Idempotente o bastante para o caller não precisar checar existência antes.
   */
  async deleteUser(id: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(id)
    if (error) {
      throw new Error(`Falha ao apagar usuário no Supabase Auth: ${error.message}`)
    }
  }
}
