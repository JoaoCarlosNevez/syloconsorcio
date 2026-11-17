// DrizzleGoogleAccountRepository — conta Google conectada de cada usuário.
// O refresh token é guardado criptografado (TokenCipher) e só sai em claro
// por findRefreshToken, pra chamada ao Google.

import type { GoogleAccountRecord, IGoogleAccountRepository } from '@sylocrm/application'
import { eq } from 'drizzle-orm'
import type { TokenCipher } from '../../google/token-cipher'
import type { Database } from '../client'
import { userGoogleAccounts } from '../schema'

export class DrizzleGoogleAccountRepository implements IGoogleAccountRepository {
  constructor(
    private readonly db: Database,
    private readonly cipher: TokenCipher,
  ) {}

  async find(userId: string): Promise<GoogleAccountRecord | null> {
    const rows = await this.db
      .select({
        userId: userGoogleAccounts.userId,
        googleEmail: userGoogleAccounts.googleEmail,
        connectedAt: userGoogleAccounts.connectedAt,
      })
      .from(userGoogleAccounts)
      .where(eq(userGoogleAccounts.userId, userId))
      .limit(1)
    return rows[0] ?? null
  }

  async findRefreshToken(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ sealed: userGoogleAccounts.refreshTokenEncrypted })
      .from(userGoogleAccounts)
      .where(eq(userGoogleAccounts.userId, userId))
      .limit(1)
    const sealed = rows[0]?.sealed
    return sealed ? this.cipher.decrypt(sealed) : null
  }

  async save(input: {
    userId: string
    googleEmail: string
    refreshToken: string
    scopes: string
  }): Promise<void> {
    const values = {
      googleEmail: input.googleEmail,
      refreshTokenEncrypted: this.cipher.encrypt(input.refreshToken),
      scopes: input.scopes,
    }
    const now = new Date()
    await this.db
      .insert(userGoogleAccounts)
      .values({ userId: input.userId, ...values, connectedAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: userGoogleAccounts.userId,
        set: { ...values, connectedAt: now, updatedAt: now },
      })
  }

  async remove(userId: string): Promise<void> {
    await this.db.delete(userGoogleAccounts).where(eq(userGoogleAccounts.userId, userId))
  }
}
