ALTER TABLE "funnels" ADD COLUMN "kind" text DEFAULT 'SALES' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "funnels_one_backoffice_per_org_idx" ON "funnels" USING btree ("organization_id") WHERE "funnels"."kind" = 'BACKOFFICE';--> statement-breakpoint
-- Funil ADM fixo: o Ganho de um funil de vendas sempre vai pro ADM, então o
-- gatilho manual "passar o bastão" deixa de ser usado.
UPDATE "funnels" SET "duplicate_to_funnel_id" = NULL WHERE "duplicate_to_funnel_id" IS NOT NULL;
--> statement-breakpoint
-- Funis de venda já chamados "ADM" (criados à mão) continuam como estão, com
-- os leads, só renomeados — o fixo nasce ao lado.
UPDATE "funnels" SET "name" = "name" || ' (antigo)', "updated_at" = now()
WHERE "kind" = 'SALES' AND lower(trim("name")) = 'adm';
--> statement-breakpoint
-- Cria o funil ADM (BACKOFFICE) em toda organização que ainda não tem.
WITH new_funnels AS (
  INSERT INTO "funnels" ("organization_id", "name", "is_default", "kind")
  SELECT o."id", 'ADM', false, 'BACKOFFICE'
  FROM "organizations" o
  WHERE NOT EXISTS (
    SELECT 1 FROM "funnels" f WHERE f."organization_id" = o."id" AND f."kind" = 'BACKOFFICE'
  )
  RETURNING "id"
)
INSERT INTO "funnel_stages" ("funnel_id", "name", "color", "position")
SELECT nf."id", s."name", s."color", s."position"
FROM new_funnels nf
CROSS JOIN (VALUES
  ('Conferência de documentos', '#f59e0b', 0),
  ('Digitado na administradora', '#0ea5e9', 1),
  ('Pendência', '#ef4444', 2),
  ('Efetivado', '#10b981', 3)
) AS s("name", "color", "position");
