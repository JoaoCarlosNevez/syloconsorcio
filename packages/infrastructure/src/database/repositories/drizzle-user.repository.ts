// DrizzleUserRepository — implementação concreta de IUserRepository.
//
// ADR-02: Drizzle é o único ORM. Queries passam sempre por este client.

import type {
  IUserRepository,
  UpdateProfileInput,
  UpsertUserInput,
  UserRecord,
} from '@sylocrm/application'
import { eq } from 'drizzle-orm'
import type { Database } from '../client'
import { users } from '../schema'

const USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  instagramHandle: users.instagramHandle,
  location: users.location,
  avatarUrl: users.avatarUrl,
  isPlatformAdmin: users.isPlatformAdmin,
  notificationPreferences: users.notificationPreferences,
  createdAt: users.createdAt,
} as const

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await this.db.select(USER_COLUMNS).from(users).where(eq(users.id, id)).limit(1)
    return rows[0] ?? null
  }

  async upsert(input: UpsertUserInput): Promise<UserRecord> {
    const rows = await this.db
      .insert(users)
      .values({ id: input.id, email: input.email, name: input.name ?? null })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: input.email, name: input.name ?? null, updatedAt: new Date() },
      })
      .returning(USER_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to upsert user: no row returned')
    return row
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserRecord> {
    const rows = await this.db
      .update(users)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.instagramHandle !== undefined ? { instagramHandle: input.instagramHandle } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.notificationPreferences !== undefined
          ? { notificationPreferences: input.notificationPreferences }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(USER_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to update profile: no row returned')
    return row
  }
}
