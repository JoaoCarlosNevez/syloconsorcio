CREATE TABLE "user_google_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"google_email" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"scopes" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_google_accounts" ADD CONSTRAINT "user_google_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Default-deny pro PostgREST (anon key) — o backend usa a service key.
ALTER TABLE "user_google_accounts" ENABLE ROW LEVEL SECURITY;
