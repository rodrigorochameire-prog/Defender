ALTER TABLE "assistidos" ADD COLUMN "analysis_status" varchar(20);--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "analysis_data" jsonb;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "analysis_version" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "processo_id" integer;--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "assistido_id" integer;--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "data_fato" date;--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "fonte" varchar(50);--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "fonte_id" integer;--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "severidade" varchar(10);--> statement-breakpoint
ALTER TABLE "case_facts" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "case_personas" ADD COLUMN "processo_id" integer;--> statement-breakpoint
ALTER TABLE "case_personas" ADD COLUMN "fonte" varchar(50);--> statement-breakpoint
ALTER TABLE "case_personas" ADD COLUMN "fonte_id" integer;--> statement-breakpoint
ALTER TABLE "case_personas" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "analysis_status" varchar(20);--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "analysis_data" jsonb;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "analysis_version" integer DEFAULT 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_facts" ADD CONSTRAINT "case_facts_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_facts" ADD CONSTRAINT "case_facts_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_personas" ADD CONSTRAINT "case_personas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_analysis_status_idx" ON "assistidos" USING btree ("analysis_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_processo_id_idx" ON "case_facts" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_assistido_id_idx" ON "case_facts" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_data_fato_idx" ON "case_facts" USING btree ("data_fato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_processo_id_idx" ON "case_personas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_analysis_status_idx" ON "processos" USING btree ("analysis_status");