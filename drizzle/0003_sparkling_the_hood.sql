CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"chunk_index" integer DEFAULT 0,
	"content_text" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "anotacoes" ADD COLUMN "conteudo_hash" varchar(16);--> statement-breakpoint
ALTER TABLE "anotacoes" ADD COLUMN "solar_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD COLUMN "solar_fase_id" varchar(50);--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "sigad_id" varchar(20);--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "sigad_exportado_em" timestamp;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "solar_exportado_em" timestamp;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "import_batch_id" text;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "ordem_original" integer;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "conteudo_completo" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "anotacoes_dedup_hash_idx" ON "anotacoes" USING btree ("assistido_id","conteudo_hash") WHERE conteudo_hash IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_import_batch_id_idx" ON "demandas" USING btree ("import_batch_id");