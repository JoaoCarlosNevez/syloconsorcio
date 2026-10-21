DROP INDEX "funnels_one_backoffice_per_org_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "funnels_one_system_kind_per_org_idx" ON "funnels" USING btree ("organization_id","kind") WHERE "funnels"."kind" <> 'SALES';--> statement-breakpoint
-- O funil padrão de cada organização vira o Comercial fixo (etapas mantidas).
UPDATE "funnels" SET "kind" = 'COMMERCIAL', "name" = 'Comercial', "updated_at" = now()
WHERE "is_default" = true AND "kind" = 'SALES';
--> statement-breakpoint
-- Cria o funil Pós-venda (POST_SALE) em toda organização que ainda não tem.
WITH new_funnels AS (
  INSERT INTO "funnels" ("organization_id", "name", "is_default", "kind")
  SELECT o."id", 'Pós-venda', false, 'POST_SALE'
  FROM "organizations" o
  WHERE NOT EXISTS (
    SELECT 1 FROM "funnels" f WHERE f."organization_id" = o."id" AND f."kind" = 'POST_SALE'
  )
  RETURNING "id"
)
INSERT INTO "funnel_stages" ("funnel_id", "name", "color", "position")
SELECT nf."id", s."name", s."color", s."position"
FROM new_funnels nf
CROSS JOIN (VALUES
  ('Boas-vindas', '#8b5cf6', 0),
  ('Aguardando 1º boleto', '#f59e0b', 1),
  ('Em dia', '#10b981', 2),
  ('Atrasado', '#ef4444', 3),
  ('Contemplado', '#0ea5e9', 4)
) AS s("name", "color", "position");
