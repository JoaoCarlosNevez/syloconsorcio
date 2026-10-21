CREATE TABLE "lead_checklist_items" (
	"lead_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"checked_by_user_id" uuid,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_checklist_items_lead_id_item_key_pk" PRIMARY KEY("lead_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "lead_checklist_items" ADD CONSTRAINT "lead_checklist_items_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_checklist_items" ADD CONSTRAINT "lead_checklist_items_checked_by_user_id_users_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key.
ALTER TABLE "lead_checklist_items" ENABLE ROW LEVEL SECURITY;
