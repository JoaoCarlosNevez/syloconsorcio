// IApiKeyRepository — port das chaves de API por organização (webhook de
// criação de leads, Configurações > Integrações).
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// O repository só vê o hash da chave — gerar a chave e calcular o hash é
// responsabilidade de quem chama (apps/api/src/lib/api-keys.ts).

export interface ApiKeyRecord {
  id: string
  organizationId: string
  name: string
  /** Começo da chave, pra identificação visual (ex: "sylo_a1B2c3D4"). */
  keyPrefix: string
  createdBy: { id: string; name: string | null; email: string } | null
  lastUsedAt: Date | null
  createdAt: Date
}

export interface NewApiKeyInput {
  organizationId: string
  name: string
  keyPrefix: string
  keyHash: string
  createdByUserId: string
}

export interface IApiKeyRepository {
  create(input: NewApiKeyInput): Promise<ApiKeyRecord>

  /** Só as chaves ativas (não revogadas), mais recentes primeiro. */
  listActiveByOrganization(organizationId: string): Promise<ApiKeyRecord[]>

  /** Retorna false se a chave não existir, já estiver revogada ou for de
   * outra organização. */
  revoke(id: string, organizationId: string): Promise<boolean>

  /** Null se nenhuma chave ativa tiver esse hash. */
  findActiveByHash(keyHash: string): Promise<ApiKeyRecord | null>

  markUsed(id: string, usedAt: Date): Promise<void>
}
