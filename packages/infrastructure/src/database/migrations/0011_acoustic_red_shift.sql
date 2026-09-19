ALTER TABLE "leads" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "lead_tags" text[] DEFAULT '{"Quente","Frio"}' NOT NULL;