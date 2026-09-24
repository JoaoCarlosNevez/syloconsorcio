// Script de dados (one-off, idempotente) — cria um funil "Padrão" por
// organização e migra `leads.stage` (enum legado) para `funnelId`/`stageId`.
//
// Roda manualmente com `pnpm --filter @sylocrm/infrastructure db:backfill-funnels`,
// como parte da fase 1.2 ("migrate") do plano de funis customizáveis — precisa
// ser executado (e a query de sanidade no final precisa dar 0) antes de rodar
// a fase 1.3 ("contract", que remove a coluna legada `leads.stage`).
//
// Idempotente: organizações que já têm algum funil são puladas, então é seguro
// re-rodar se o processo falhar no meio (cada organização é uma transação
// própria — uma falha numa organização não desfaz as anteriores).

import 'dotenv/config'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { createDatabase } from '../client'
import { funnelStages, funnels, leads, organizations } from '../schema'

// Mesma ordem/cores de apps/web/src/data/kanban-mock.ts (COLUMN_META), exceto
// 'venda' — VENDA vira `wonAt`, não um estágio (ver plano de funis).
const LEGACY_STAGES = [
  { code: 'LEAD', name: 'Lead', color: '#94a3b8' },
  { code: 'ATENDIMENTO', name: 'Em Atendimento', color: '#f59e0b' },
  { code: 'SIMULACAO', name: 'Simulação', color: '#8b5cf6' },
  { code: 'PROPOSTA', name: 'Proposta', color: '#f43f5e' },
  { code: 'FECHADO', name: 'Fechado', color: '#0ea5e9' },
] as const

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required to run this script.')
  const db = createDatabase({ url: databaseUrl, ssl: 'require' })

  const orgs = await db.select({ id: organizations.id }).from(organizations)
  console.log(`${orgs.length} organização(ões) encontradas.`)

  for (const org of orgs) {
    const existing = await db
      .select({ id: funnels.id })
      .from(funnels)
      .where(eq(funnels.organizationId, org.id))
      .limit(1)
    if (existing.length > 0) {
      console.log(`Org ${org.id}: já tem funil, pulando.`)
      continue
    }

    await db.transaction(async (tx) => {
      const [funnel] = await tx
        .insert(funnels)
        .values({ organizationId: org.id, name: 'Padrão', isDefault: true })
        .returning({ id: funnels.id })
      if (!funnel) throw new Error(`Falha ao criar funil Padrão para org ${org.id}`)

      const stageIdByCode = new Map<string, string>()
      for (const [index, stage] of LEGACY_STAGES.entries()) {
        const [row] = await tx
          .insert(funnelStages)
          .values({ funnelId: funnel.id, name: stage.name, color: stage.color, position: index })
          .returning({ id: funnelStages.id })
        if (!row) throw new Error(`Falha ao criar estágio ${stage.code} para org ${org.id}`)
        stageIdByCode.set(stage.code, row.id)
      }
      const fechadoId = stageIdByCode.get('FECHADO') as string

      for (const [code, stageId] of stageIdByCode) {
        await tx
          .update(leads)
          .set({ funnelId: funnel.id, stageId })
          .where(and(eq(leads.organizationId, org.id), eq(leads.stage, code as 'LEAD')))
      }

      // VENDA migra para stageId=Fechado + wonAt preenchido (melhor esforço:
      // stageChangedAt é o momento mais próximo que temos do "ganho" real).
      await tx
        .update(leads)
        .set({ funnelId: funnel.id, stageId: fechadoId, wonAt: sql`${leads.stageChangedAt}` })
        .where(and(eq(leads.organizationId, org.id), eq(leads.stage, 'VENDA')))
    })

    console.log(`Org ${org.id}: funil Padrão criado e leads migrados.`)
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(isNull(leads.funnelId))
  console.log(`Leads sem funnelId após backfill: ${row?.count ?? 'erro ao contar'}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('FALHA no backfill:', error)
    process.exit(1)
  })
