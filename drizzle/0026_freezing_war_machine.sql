ALTER TYPE "public"."papel_processo" ADD VALUE 'REQUERIDO';--> statement-breakpoint
ALTER TYPE "public"."papel_processo" ADD VALUE 'EXECUTADO';--> statement-breakpoint
ALTER TYPE "public"."papel_processo" ADD VALUE 'REEDUCANDO';--> statement-breakpoint
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
ALTER TABLE "casos" DROP CONSTRAINT "casos_processo_referencia_id_processos_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "assistidos_caso_id_idx";--> statement-breakpoint
ALTER TABLE "assistidos_processos" ADD COLUMN "ativo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_jobs_status_idx" ON "analysis_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_jobs_processo_idx" ON "analysis_jobs" USING btree ("processo_id");--> statement-breakpoint
ALTER TABLE "casos" DROP COLUMN IF EXISTS "processo_referencia_id";--> statement-breakpoint
ALTER TABLE "assistidos" DROP COLUMN IF EXISTS "caso_id";