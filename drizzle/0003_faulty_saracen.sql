CREATE TABLE IF NOT EXISTS "user_microsoft_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"microsoft_user_id" varchar(100),
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_microsoft_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "drive_files" DROP CONSTRAINT "drive_files_drive_file_id_unique";--> statement-breakpoint
ALTER TABLE "drive_sync_folders" DROP CONSTRAINT "drive_sync_folders_drive_folder_id_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onedrive_root_folder_id" varchar(100);--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_folders" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_logs" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_microsoft_tokens" ADD CONSTRAINT "user_microsoft_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_microsoft_tokens_user_idx" ON "user_microsoft_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_files_provider_file_id_unique" ON "drive_files" USING btree ("drive_file_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_sync_folders_provider_folder_id_unique" ON "drive_sync_folders" USING btree ("drive_folder_id","provider");