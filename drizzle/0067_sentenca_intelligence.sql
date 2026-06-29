-- Sentença Intelligence (slice 1): magistrados (1º grau registry) + sentencas (shared, detail-scoped)
-- Scoped migration following repo convention (cf. 0058-0063). Apply via `npm run db:push`.

CREATE TABLE IF NOT EXISTS "magistrados" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"comarca_id" integer,
	"varas_conhecidas" jsonb DEFAULT '[]'::jsonb,
	"entrancia" varchar(30),
	"status" varchar(20) DEFAULT 'ATIVO' NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sentencas" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_origem_id" integer,
	"magistrado_id" integer,
	"comarca_id" integer,
	"vara" varchar(120),
	"numero_processo" varchar(30),
	"pje_documento_id" varchar(30),
	"sigiloso" integer DEFAULT 0 NOT NULL,
	"tipo_decisao" varchar(30),
	"data_sentenca" date,
	"drive_file_id" integer,
	"analise_ia" jsonb DEFAULT 'null'::jsonb,
	"analise_status" varchar(20) DEFAULT 'PENDENTE' NOT NULL,
	"analyzed_at" timestamp,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "magistrados" ADD CONSTRAINT "magistrados_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_demanda_origem_id_demandas_id_fk" FOREIGN KEY ("demanda_origem_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_magistrado_id_magistrados_id_fk" FOREIGN KEY ("magistrado_id") REFERENCES "public"."magistrados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentencas" ADD CONSTRAINT "sentencas_criado_por_id_defensores_ba_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magistrados_nome_norm_comarca_idx" ON "magistrados" USING btree ("nome_normalizado","comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magistrados_status_idx" ON "magistrados" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sentencas_processo_doc_unique" ON "sentencas" USING btree ("processo_id","pje_documento_id") WHERE "pje_documento_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sentencas_magistrado_idx" ON "sentencas" USING btree ("magistrado_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sentencas_comarca_idx" ON "sentencas" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sentencas_tipo_decisao_idx" ON "sentencas" USING btree ("tipo_decisao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sentencas_demanda_origem_idx" ON "sentencas" USING btree ("demanda_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sentencas_analise_status_idx" ON "sentencas" USING btree ("analise_status");
