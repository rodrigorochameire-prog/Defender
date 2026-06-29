-- Drive multi-tenant: tabela drive_groups + colunas user_id em drive_files/sync_folders + drive_group_id em users (idempotente).
CREATE TABLE IF NOT EXISTS "drive_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"label" text NOT NULL,
	"atribuicao_folders" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_groups_owner_idx" ON "drive_groups" USING btree ("owner_user_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "drive_files" ADD COLUMN "user_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_user_idx" ON "drive_files" USING btree ("user_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "drive_sync_folders" ADD COLUMN "user_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_folders_user_idx" ON "drive_sync_folders" USING btree ("user_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "drive_group_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
