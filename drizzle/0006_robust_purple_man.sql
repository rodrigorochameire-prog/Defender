CREATE TABLE IF NOT EXISTS "drive_document_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"titulo" text NOT NULL,
	"pagina_inicio" integer NOT NULL,
	"pagina_fim" integer NOT NULL,
	"resumo" text,
	"texto_extraido" text,
	"confianca" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_document_sections" ADD CONSTRAINT "drive_document_sections_drive_file_id_drive_files_id_fk" FOREIGN KEY ("drive_file_id") REFERENCES "public"."drive_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_doc_sections_drive_file_id_idx" ON "drive_document_sections" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_doc_sections_tipo_idx" ON "drive_document_sections" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_doc_sections_pagina_inicio_idx" ON "drive_document_sections" USING btree ("pagina_inicio");