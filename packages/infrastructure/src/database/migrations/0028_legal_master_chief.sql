CREATE TABLE "lead_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"offered_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lead_queue_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_queue_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "lead_queue_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"timeout_minutes" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_offers" ADD CONSTRAINT "lead_offers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_offers" ADD CONSTRAINT "lead_offers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_offers" ADD CONSTRAINT "lead_offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_queue_members" ADD CONSTRAINT "lead_queue_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_queue_members" ADD CONSTRAINT "lead_queue_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_queue_settings" ADD CONSTRAINT "lead_queue_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_offers_one_pending_per_lead_idx" ON "lead_offers" USING btree ("lead_id") WHERE "lead_offers"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "lead_offers_pending_expires_idx" ON "lead_offers" USING btree ("expires_at") WHERE "lead_offers"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "lead_offers_lead_idx" ON "lead_offers" USING btree ("lead_id");--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key. Ver
-- migrations-notes/enable_rls.sql.
ALTER TABLE "lead_queue_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead_queue_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead_offers" ENABLE ROW LEVEL SECURITY;
