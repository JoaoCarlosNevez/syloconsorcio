CREATE TABLE "lead_adhesions" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"administrator" text,
	"seller_user_id" uuid,
	"asset_value_cents" bigint,
	"asset_code" text,
	"plan_table" text,
	"asset_type" text,
	"group_code" text,
	"down_payment_cents" bigint,
	"prepaid_installments" integer,
	"birthplace" text,
	"spouse_name" text,
	"phone2" text,
	"address" text,
	"zip_code" text,
	"preferred_administrator" text,
	"contact_hours" text,
	"notes" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_adhesions" ADD CONSTRAINT "lead_adhesions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_adhesions" ADD CONSTRAINT "lead_adhesions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_adhesions" ADD CONSTRAINT "lead_adhesions_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_adhesions" ADD CONSTRAINT "lead_adhesions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key. Ver
-- migrations-notes/enable_rls.sql.
ALTER TABLE "lead_adhesions" ENABLE ROW LEVEL SECURITY;
