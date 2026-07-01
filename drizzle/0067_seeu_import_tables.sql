CREATE TABLE IF NOT EXISTS "seeu_import_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"atribuicao" "atribuicao",
	"tab" text,
	"seq" integer,
	"processo_numero" varchar(40),
	"assistido_nome" text,
	"ato" text,
	"tipo_documento" varchar(80),
	"data_expedicao" timestamp,
	"data_intimacao" timestamp,
	"prazo" date,
	"conteudo" text,
	"pje_documento_id" varchar(30),
	"content_hash" varchar(64) NOT NULL,
	"decisao" "staging_decisao" DEFAULT 'nova' NOT NULL,
	"matched_demanda_id" integer,
	"matched_ledger_id" integer,
	"selected" boolean DEFAULT false NOT NULL,
	"revisao" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seeu_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_numero" varchar(40),
	"seq" integer,
	"content_hash" varchar(64) NOT NULL,
	"atribuicao" "atribuicao",
	"ato" text,
	"decisao" "ledger_decisao" NOT NULL,
	"demanda_id" integer,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"job_id" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seeu_import_staging_job_id_idx" ON "seeu_import_staging" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seeu_import_staging_content_hash_idx" ON "seeu_import_staging" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seeu_import_staging_proc_seq_idx" ON "seeu_import_staging" USING btree ("processo_numero","seq");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "seeu_ledger_proc_seq_uidx" ON "seeu_ledger" USING btree ("processo_numero","seq") WHERE seq IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "seeu_ledger_content_hash_uidx" ON "seeu_ledger" USING btree ("content_hash") WHERE seq IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seeu_ledger_processo_numero_idx" ON "seeu_ledger" USING btree ("processo_numero");
