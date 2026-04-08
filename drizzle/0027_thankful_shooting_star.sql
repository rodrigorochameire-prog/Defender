CREATE TABLE IF NOT EXISTS "pje_download_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"numero_processo" text NOT NULL,
	"atribuicao" varchar(30) NOT NULL,
	"assistido_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"pdf_path" text,
	"pdf_bytes" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pje_download_jobs" ADD CONSTRAINT "pje_download_jobs_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pje_download_jobs" ADD CONSTRAINT "pje_download_jobs_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_status_idx" ON "pje_download_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_processo_idx" ON "pje_download_jobs" USING btree ("processo_id");
