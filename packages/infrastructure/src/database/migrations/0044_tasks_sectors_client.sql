ALTER TABLE "tasks" ALTER COLUMN "assigned_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "sectors" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_sector" text;--> statement-breakpoint
CREATE INDEX "leads_client_id_idx" ON "leads" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_check" CHECK ("tasks"."assigned_user_id" IS NOT NULL OR "tasks"."assigned_sector" IS NOT NULL);--> statement-breakpoint
-- Setores iniciais pelo papel (defaultSectorsForRole) — o gestor ajusta depois.
UPDATE "organization_memberships" SET "sectors" = '{vendas}' WHERE "role" = 'SELLER' AND "sectors" = '{}';--> statement-breakpoint
UPDATE "organization_memberships" SET "sectors" = '{adm,pos_venda}' WHERE "role" = 'BACKOFFICE' AND "sectors" = '{}';--> statement-breakpoint
-- Cópias já criadas pelo Ganho (nota "Duplicado do lead ...") apontam pro lead
-- original do cliente: mesma organização, mesmo telefone, criado antes e que
-- não é cópia. Só quando há exatamente um candidato.
UPDATE "leads" AS c SET "client_id" = o.id
FROM "leads" AS o
WHERE c."notes" LIKE 'Duplicado do lead %'
  AND c."client_id" IS NULL
  AND o."organization_id" = c."organization_id"
  AND o."phone" = c."phone"
  AND o."created_at" < c."created_at"
  AND (o."notes" IS NULL OR o."notes" NOT LIKE 'Duplicado do lead %')
  AND (
    SELECT count(*) FROM "leads" AS x
    WHERE x."organization_id" = c."organization_id"
      AND x."phone" = c."phone"
      AND x."created_at" < c."created_at"
      AND (x."notes" IS NULL OR x."notes" NOT LIKE 'Duplicado do lead %')
  ) = 1;
