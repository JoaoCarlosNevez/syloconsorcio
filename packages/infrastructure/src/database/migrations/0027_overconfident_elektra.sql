ALTER TABLE "lead_proposals" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Propostas antigas: o autor vem do log 'lead.proposal_created' do mesmo
-- lead, gravado logo depois do insert (o mais próximo em até 1 minuto).
UPDATE "lead_proposals" AS lp
SET "created_by_user_id" = (
  SELECT al."actor_user_id"
  FROM "activity_log" AS al
  WHERE al."action" = 'lead.proposal_created'
    AND al."entity_id" = lp."lead_id"
    AND al."created_at" BETWEEN lp."created_at" - interval '1 minute'
      AND lp."created_at" + interval '1 minute'
  ORDER BY abs(extract(epoch FROM al."created_at" - lp."created_at"))
  LIMIT 1
)
WHERE lp."created_by_user_id" IS NULL;
