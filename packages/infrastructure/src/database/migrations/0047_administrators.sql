CREATE TABLE "administrators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emails" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "administrators" ADD CONSTRAINT "administrators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "administrators_org_name_idx" ON "administrators" USING btree ("organization_id",lower("name"));--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key.
ALTER TABLE "administrators" ENABLE ROW LEVEL SECURITY;
