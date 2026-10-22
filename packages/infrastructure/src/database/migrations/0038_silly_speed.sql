ALTER TABLE "lead_adhesions" ADD COLUMN "installment_due_day" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "auto_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_auto_key_idx" ON "tasks" USING btree ("auto_key");