// DrizzleFunnelRepository — implementação concreta de IFunnelRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).
// As guardas de negócio (não remover estágio/funil com leads, etc) ficam nos
// use cases — este repositório só aplica o diff/upsert pedido. A FK
// leads.stage_id/funnel_id (ON DELETE RESTRICT, padrão do Drizzle) fica como
// rede de segurança contra corrida entre a checagem do use case e o DELETE.

import type {
  FunnelRecord,
  FunnelStageRecord,
  IFunnelRepository,
  NewFunnelInput,
  UpdateFunnelInput,
} from '@sylocrm/application'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { funnelStages, funnels, leads } from '../schema'

const FUNNEL_COLUMNS = {
  id: funnels.id,
  organizationId: funnels.organizationId,
  name: funnels.name,
  isDefault: funnels.isDefault,
  duplicateToFunnelId: funnels.duplicateToFunnelId,
  createdAt: funnels.createdAt,
  updatedAt: funnels.updatedAt,
} as const

const STAGE_COLUMNS = {
  id: funnelStages.id,
  funnelId: funnelStages.funnelId,
  name: funnelStages.name,
  color: funnelStages.color,
  position: funnelStages.position,
} as const

export class DrizzleFunnelRepository implements IFunnelRepository {
  constructor(private readonly db: Database) {}

  async listByOrganization(organizationId: string): Promise<FunnelRecord[]> {
    const [funnelRows, stageRows] = await Promise.all([
      this.db
        .select(FUNNEL_COLUMNS)
        .from(funnels)
        .where(eq(funnels.organizationId, organizationId)),
      this.db
        .select({ ...STAGE_COLUMNS, leadCount: sql<number>`count(${leads.id})::int` })
        .from(funnelStages)
        .innerJoin(funnels, eq(funnelStages.funnelId, funnels.id))
        .leftJoin(leads, eq(leads.stageId, funnelStages.id))
        .where(eq(funnels.organizationId, organizationId))
        .groupBy(
          funnelStages.id,
          funnelStages.funnelId,
          funnelStages.name,
          funnelStages.color,
          funnelStages.position,
        )
        .orderBy(asc(funnelStages.position)),
    ])

    return funnelRows.map((funnel) => ({
      ...funnel,
      stages: stageRows.filter((stage) => stage.funnelId === funnel.id),
    }))
  }

  async findById(id: string, organizationId: string): Promise<FunnelRecord | null> {
    const rows = await this.db
      .select(FUNNEL_COLUMNS)
      .from(funnels)
      .where(eq(funnels.id, id))
      .limit(1)

    const funnel = rows[0]
    if (!funnel || funnel.organizationId !== organizationId) return null

    const stages = await this.db
      .select(STAGE_COLUMNS)
      .from(funnelStages)
      .where(eq(funnelStages.funnelId, id))
      .orderBy(asc(funnelStages.position))

    return { ...funnel, stages }
  }

  async create(input: NewFunnelInput): Promise<FunnelRecord> {
    return this.db.transaction(async (tx) => {
      const [funnelRow] = await tx
        .insert(funnels)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          isDefault: input.isDefault ?? false,
        })
        .returning(FUNNEL_COLUMNS)
      if (!funnelRow) throw new Error('Failed to create funnel: no row returned')

      const stages: FunnelStageRecord[] = []
      for (const [index, stage] of input.stages.entries()) {
        const [stageRow] = await tx
          .insert(funnelStages)
          .values({
            funnelId: funnelRow.id,
            name: stage.name,
            color: stage.color ?? '#64748b',
            position: index,
          })
          .returning(STAGE_COLUMNS)
        if (!stageRow) throw new Error('Failed to create funnel stage: no row returned')
        stages.push(stageRow)
      }

      return { ...funnelRow, stages }
    })
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateFunnelInput,
  ): Promise<FunnelRecord | null> {
    return this.db.transaction(async (tx) => {
      const [funnelRow] = await tx
        .select({ id: funnels.id })
        .from(funnels)
        .where(eq(funnels.id, id))
        .limit(1)
      const [orgRow] = await tx
        .select({ organizationId: funnels.organizationId })
        .from(funnels)
        .where(eq(funnels.id, id))
        .limit(1)
      if (!funnelRow || !orgRow || orgRow.organizationId !== organizationId) return null

      if (input.isDefault === true) {
        // Garante exatamente 1 default por org — desmarca qualquer outro antes.
        await tx
          .update(funnels)
          .set({ isDefault: false })
          .where(sql`${funnels.organizationId} = ${organizationId} AND ${funnels.id} != ${id}`)
      }
      if (
        input.name !== undefined ||
        input.isDefault !== undefined ||
        input.duplicateToFunnelId !== undefined
      ) {
        await tx
          .update(funnels)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
            ...(input.duplicateToFunnelId !== undefined
              ? { duplicateToFunnelId: input.duplicateToFunnelId }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(funnels.id, id))
      }

      if (input.stages) {
        const existingRows = await tx
          .select({ id: funnelStages.id })
          .from(funnelStages)
          .where(eq(funnelStages.funnelId, id))
        const existingIds = new Set(existingRows.map((r) => r.id))
        const keepIds = new Set(input.stages.filter((s) => s.id).map((s) => s.id as string))

        const toDelete = [...existingIds].filter((existingId) => !keepIds.has(existingId))
        if (toDelete.length > 0) {
          await tx.delete(funnelStages).where(inArray(funnelStages.id, toDelete))
        }

        for (const [index, stage] of input.stages.entries()) {
          if (stage.id) {
            await tx
              .update(funnelStages)
              .set({
                name: stage.name,
                color: stage.color ?? '#64748b',
                position: index,
                updatedAt: new Date(),
              })
              .where(eq(funnelStages.id, stage.id))
          } else {
            await tx.insert(funnelStages).values({
              funnelId: id,
              name: stage.name,
              color: stage.color ?? '#64748b',
              position: index,
            })
          }
        }
      }

      const [updatedFunnel] = await tx
        .select(FUNNEL_COLUMNS)
        .from(funnels)
        .where(eq(funnels.id, id))
      const stages = await tx
        .select(STAGE_COLUMNS)
        .from(funnelStages)
        .where(eq(funnelStages.funnelId, id))
        .orderBy(asc(funnelStages.position))
      if (!updatedFunnel) return null
      return { ...updatedFunnel, stages }
    })
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const rows = await this.db
      .delete(funnels)
      .where(sql`${funnels.id} = ${id} AND ${funnels.organizationId} = ${organizationId}`)
      .returning({ id: funnels.id })

    return rows.length > 0
  }

  async countLeadsByStage(stageId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.stageId, stageId))
    return row?.count ?? 0
  }

  async countLeadsByFunnel(funnelId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.funnelId, funnelId))
    return row?.count ?? 0
  }
}
