-- Funil ADM: "Enviado" passa a vir antes de "Checado" (troca as posições,
-- mesmos ids — os cards ficam onde estão). Idempotente: só mexe nos funis
-- ADM em que Checado ainda está antes de Enviado.
UPDATE "funnel_stages" s
SET "position" = CASE s."name" WHEN 'Checado' THEN e."position" ELSE c."position" END,
    "updated_at" = now()
FROM "funnels" f
JOIN "funnel_stages" c ON c."funnel_id" = f."id" AND c."name" = 'Checado'
JOIN "funnel_stages" e ON e."funnel_id" = f."id" AND e."name" = 'Enviado'
WHERE f."kind" = 'BACKOFFICE'
  AND s."funnel_id" = f."id"
  AND s."name" IN ('Checado', 'Enviado')
  AND c."position" < e."position";
