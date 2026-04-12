CREATE TABLE IF NOT EXISTS "analysis_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"skill" varchar(50) NOT NULL,
	"prompt" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_google_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_google_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "drive_folder_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_spreadsheet_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_spreadsheet_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_sync_enabled" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_jobs_status_idx" ON "analysis_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_jobs_processo_idx" ON "analysis_jobs" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_google_tokens_user_idx" ON "user_google_tokens" USING btree ("user_id");