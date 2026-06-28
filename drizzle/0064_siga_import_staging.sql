-- SIGA import staging (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."siga_import_decisao" AS ENUM('nova', 'ja_importada', 'atualizada');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "siga_import_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"tipo" text NOT NULL,
	"n_siga" text,
	"numero_solicitacao" text,
	"payload" jsonb NOT NULL,
	"decisao" "siga_import_decisao" DEFAULT 'nova' NOT NULL,
	"matched_ausencia_id" integer,
	"importavel" boolean DEFAULT false NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "siga_import_staging" ADD CONSTRAINT "siga_import_staging_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siga_import_staging_defensor_session_idx" ON "siga_import_staging" USING btree ("defensor_id","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siga_import_staging_defensor_nsiga_idx" ON "siga_import_staging" USING btree ("defensor_id","n_siga");
