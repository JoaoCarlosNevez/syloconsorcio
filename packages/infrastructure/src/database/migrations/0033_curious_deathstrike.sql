CREATE TABLE "lead_adhesion_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_adhesions" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "lead_adhesion_documents" ADD CONSTRAINT "lead_adhesion_documents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_adhesion_documents" ADD CONSTRAINT "lead_adhesion_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_adhesion_documents" ADD CONSTRAINT "lead_adhesion_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_adhesion_documents_lead_kind_idx" ON "lead_adhesion_documents" USING btree ("lead_id","kind");--> statement-breakpoint
CREATE INDEX "lead_adhesion_documents_lead_idx" ON "lead_adhesion_documents" USING btree ("lead_id");--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key.
ALTER TABLE "lead_adhesion_documents" ENABLE ROW LEVEL SECURITY;
