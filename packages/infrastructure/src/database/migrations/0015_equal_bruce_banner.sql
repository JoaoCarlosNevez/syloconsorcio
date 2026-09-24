-- Nota: o drizzle-kit "generate" recalculou aqui também o diff de contract da
-- feature de funis (leads.funnel_id/stage_id NOT NULL, drop de leads.stage e
-- do enum lead_stage) porque o snapshot 0014 só capturou a fase "expand" —
-- o "contract" foi aplicado direto via `db:push` na sessão anterior, sem
-- passar por `generate`. Essas 4 linhas já estão aplicadas em produção/dev;
-- mantidas comentadas só pra não reintroduzi-las por engano num `migrate`.
-- ALTER TABLE "leads" ALTER COLUMN "funnel_id" SET NOT NULL;
-- ALTER TABLE "leads" ALTER COLUMN "stage_id" SET NOT NULL;
-- ALTER TABLE "leads" DROP COLUMN "stage";
-- DROP TYPE "public"."lead_stage";

-- Gatilho "passar o bastão" (ver funnels.ts) — única mudança real desta migração.
ALTER TABLE "funnels" ADD COLUMN "duplicate_to_funnel_id" uuid;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_duplicate_to_funnel_id_funnels_id_fk" FOREIGN KEY ("duplicate_to_funnel_id") REFERENCES "public"."funnels"("id") ON DELETE set null ON UPDATE no action;