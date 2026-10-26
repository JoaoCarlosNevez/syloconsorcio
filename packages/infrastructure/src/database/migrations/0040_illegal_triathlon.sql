CREATE TABLE "lead_adhesion_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"administrator" text,
	"asset_value_cents" bigint,
	"asset_code" text,
	"plan_table" text,
	"asset_type" text,
	"group_code" text,
	"quota_number" text,
	"down_payment_cents" bigint,
	"prepaid_installments" integer,
	"payment_method" text,
	"installment_due_day" integer
);
--> statement-breakpoint
ALTER TABLE "lead_adhesion_quotas" ADD CONSTRAINT "lead_adhesion_quotas_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_adhesion_quotas_lead_position_idx" ON "lead_adhesion_quotas" USING btree ("lead_id","position");--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key.
ALTER TABLE "lead_adhesion_quotas" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Os dados de plano das fichas existentes viram a "Cota 1".
INSERT INTO "lead_adhesion_quotas" (
  "lead_id", "position", "administrator", "asset_value_cents", "asset_code", "plan_table",
  "asset_type", "group_code", "quota_number", "down_payment_cents", "prepaid_installments",
  "payment_method", "installment_due_day"
)
SELECT
  "lead_id", 1, "administrator", "asset_value_cents", "asset_code", "plan_table",
  "asset_type", "group_code", "quota_number", "down_payment_cents", "prepaid_installments",
  "payment_method", "installment_due_day"
FROM "lead_adhesions"
ON CONFLICT DO NOTHING;
