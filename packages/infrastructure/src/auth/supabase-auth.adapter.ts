// SupabaseAuthAdapter — implementação concreta de IAuthProvider.
//
// Isola o Supabase Auth SDK na camada Infrastructure.
// O restante da aplicação não importa @supabase/supabase-js.
//
// ADR-06: Supabase Auth isolado via port IAuthProvider.
// ADR-06: Validação de Bearer token (assinatura local via JWKS).

import { createClient } from '@supabase/supabase-js'
import type { AuthIdentity, CreateAuthUserInput, IAuthProvider } from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'

/** Validade máxima do access token do Supabase (padrão do projeto: 1h). */
const JWT_MAX_LIFETIME_MS = 60 * 60 * 1000

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
   * Usa getClaims(): com as chaves assimétricas do projeto (ES256) a
   * assinatura é conferida aqui mesmo, com a chave pública (JWKS em cache),
   * sem ir ao Supabase a cada requisição — a API fica longe do Auth e essa
   * ida e volta pesava em todo clique. Token com algoritmo simétrico cai no
   * getUser() dentro do próprio SDK.
   *
   * Sessão encerrada pelo logout continua com assinatura válida até vencer;
   * por isso o signOut anota a sessão como revogada (ver revokedSessions).
   */
  async verifyToken(token: string): Promise<AuthIdentity | null> {
    const { data, error } = await this.client.auth.getClaims(token)
    if (error || !data) return null

    const { sub, email, session_id: sessionId } = data.claims
    // Email is required for system identity — user without email is not supported
    if (!sub || !email) return null
    if (typeof sessionId === 'string' && this.isRevoked(sessionId)) return null
    return { id: sub, email }
  }

  /**
   * Invalida a sessão do usuário no Supabase Auth.
   * Chamado no fluxo de logout via POST /auth/logout.
   *
   * Invalida todas as sessões do usuário no Supabase (admin.signOut com o
   * próprio token) e marca a sessão como revogada aqui —
   * a verificação local do JWT não enxerga o logout sozinha.
   */
  async signOut(token: string): Promise<void> {
    // admin.signOut recebe o próprio JWT (não o id do usuário).
    const { error } = await this.client.auth.admin.signOut(token, 'global')
    if (error && error.status !== 401 && error.status !== 404) {
      throw new Error(`Falha ao encerrar a sessão no Supabase Auth: ${error.message}`)
    }
    const claims = await this.client.auth.getClaims(token)
    const sessionId = claims.data?.claims.session_id
    if (typeof sessionId === 'string') {
      // admin.signOut já impede novos tokens dessa sessão; os emitidos antes
      // vencem em no máximo JWT_MAX_LIFETIME_MS.
      this.revokedSessions.set(sessionId, Date.now() + JWT_MAX_LIFETIME_MS)
    }
  }

  /** session_id → até quando recusar (ms) as sessões encerradas por logout. */
  private readonly revokedSessions = new Map<string, number>()

  private isRevoked(sessionId: string): boolean {
    const until = this.revokedSessions.get(sessionId)
    if (until === undefined) return false
    if (until < Date.now()) {
      this.revokedSessions.delete(sessionId)
      return false
    }
    return true
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
