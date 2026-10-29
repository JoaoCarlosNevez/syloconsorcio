-- Funil ADM: "Digitado na administradora" vira "Enviado" e ganha a etapa
-- "Checado" logo antes dela. Mesmo id de etapa (os cards ficam onde estão).
-- Idempotente: só mexe nos funis ADM que ainda não têm "Checado".
UPDATE "funnel_stages" s
SET "position" = s."position" + 1, "updated_at" = now()
FROM "funnels" f
WHERE f."id" = s."funnel_id" AND f."kind" = 'BACKOFFICE' AND s."position" >= 1
  AND NOT EXISTS (
    SELECT 1 FROM "funnel_stages" c WHERE c."funnel_id" = f."id" AND c."name" = 'Checado'
  );
--> statement-breakpoint
INSERT INTO "funnel_stages" ("funnel_id", "name", "color", "position")
SELECT f."id", 'Checado', '#8b5cf6', 1
FROM "funnels" f
WHERE f."kind" = 'BACKOFFICE'
  AND NOT EXISTS (
    SELECT 1 FROM "funnel_stages" c WHERE c."funnel_id" = f."id" AND c."name" = 'Checado'
  );
--> statement-breakpoint
UPDATE "funnel_stages" s
SET "name" = 'Enviado', "updated_at" = now()
FROM "funnels" f
WHERE f."id" = s."funnel_id" AND f."kind" = 'BACKOFFICE' AND s."name" = 'Digitado na administradora';
