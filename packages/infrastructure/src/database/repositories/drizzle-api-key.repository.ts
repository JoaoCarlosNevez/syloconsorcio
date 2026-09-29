// DrizzleApiKeyRepository — implementação concreta de IApiKeyRepository.
//
// Busca por hash usa o índice único de key_hash. A listagem faz LEFT JOIN em
// users pra mostrar quem criou (null se o usuário foi excluído).

import type { ApiKeyRecord, IApiKeyRepository, NewApiKeyInput } from '@sylocrm/application'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { Database } from '../client'
import { organizationApiKeys, users } from '../schema'

const API_KEY_COLUMNS = {
  id: organizationApiKeys.id,
  organizationId: organizationApiKeys.organizationId,
  name: organizationApiKeys.name,
  keyPrefix: organizationApiKeys.keyPrefix,
  lastUsedAt: organizationApiKeys.lastUsedAt,
  createdAt: organizationApiKeys.createdAt,
  creatorId: users.id,
  creatorName: users.name,
  creatorEmail: users.email,
} as const

type ApiKeyRow = {
  id: string
  organizationId: string
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  createdAt: Date
  creatorId: string | null
  creatorName: string | null
  creatorEmail: string | null
}

function toApiKeyRecord(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    createdBy:
      row.creatorId && row.creatorEmail
        ? { id: row.creatorId, name: row.creatorName, email: row.creatorEmail }
        : null,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  }
}

export class DrizzleApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly db: Database) {}

  private selectWithCreator() {
    return this.db
      .select(API_KEY_COLUMNS)
      .from(organizationApiKeys)
      .leftJoin(users, eq(organizationApiKeys.createdByUserId, users.id))
  }

  async create(input: NewApiKeyInput): Promise<ApiKeyRecord> {
    const inserted = await this.db
      .insert(organizationApiKeys)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        createdByUserId: input.createdByUserId,
      })
      .returning({ id: organizationApiKeys.id })

    const id = inserted[0]?.id
    if (!id) throw new Error('Failed to create API key: no row returned')
    const rows = await this.selectWithCreator().where(eq(organizationApiKeys.id, id)).limit(1)
    const row = rows[0]
    if (!row) throw new Error('Failed to create API key: row not found after insert')
    return toApiKeyRecord(row)
  }

  async listActiveByOrganization(organizationId: string): Promise<ApiKeyRecord[]> {
    const rows = await this.selectWithCreator()
      .where(
        and(
          eq(organizationApiKeys.organizationId, organizationId),
          isNull(organizationApiKeys.revokedAt),
        ),
      )
      .orderBy(desc(organizationApiKeys.createdAt))
    return rows.map(toApiKeyRecord)
  }

  async revoke(id: string, organizationId: string): Promise<boolean> {
    const rows = await this.db
      .update(organizationApiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(organizationApiKeys.id, id),
          eq(organizationApiKeys.organizationId, organizationId),
          isNull(organizationApiKeys.revokedAt),
        ),
      )
      .returning({ id: organizationApiKeys.id })
    return rows.length > 0
  }

  async findActiveByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const rows = await this.selectWithCreator()
      .where(and(eq(organizationApiKeys.keyHash, keyHash), isNull(organizationApiKeys.revokedAt)))
      .limit(1)
    const row = rows[0]
    return row ? toApiKeyRecord(row) : null
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.db
      .update(organizationApiKeys)
      .set({ lastUsedAt: usedAt })
      .where(eq(organizationApiKeys.id, id))
  }
}
