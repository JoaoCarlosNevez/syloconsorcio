ALTER TABLE "lead_proposals" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD COLUMN "shared_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD COLUMN "last_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_share_token_unique" UNIQUE("share_token");