CREATE TYPE "public"."oficio_analise_status" AS ENUM('pendente', 'processando', 'concluido', 'erro');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_file_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"pagina" integer NOT NULL,
	"cor" varchar(20) DEFAULT 'yellow' NOT NULL,
	"texto" text,
	"texto_selecionado" text,
	"posicao" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oficio_analises" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" text NOT NULL,
	"drive_file_name" text NOT NULL,
	"drive_folder_id" text,
	"tipo_oficio" varchar(100),
	"destinatario_tipo" varchar(100),
	"assunto" text,
	"estrutura" jsonb,
	"variaveis_identificadas" jsonb,
	"qualidade_score" integer,
	"conteudo_extraido" text,
	"modelo_gerado_id" integer,
	"status" "oficio_analise_status" DEFAULT 'pendente' NOT NULL,
	"erro" text,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentos_gerados" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "drive_file_contents" ADD COLUMN "ocr_applied" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "plaud_recordings" ADD COLUMN "processo_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_file_annotations" ADD CONSTRAINT "drive_file_annotations_drive_file_id_drive_files_id_fk" FOREIGN KEY ("drive_file_id") REFERENCES "public"."drive_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_file_annotations" ADD CONSTRAINT "drive_file_annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oficio_analises" ADD CONSTRAINT "oficio_analises_modelo_gerado_id_documento_modelos_id_fk" FOREIGN KEY ("modelo_gerado_id") REFERENCES "public"."documento_modelos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oficio_analises" ADD CONSTRAINT "oficio_analises_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_annotations_file" ON "drive_file_annotations" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_annotations_page" ON "drive_file_annotations" USING btree ("drive_file_id","pagina");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oficio_analises_drive_file_id_idx" ON "oficio_analises" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oficio_analises_tipo_oficio_idx" ON "oficio_analises" USING btree ("tipo_oficio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oficio_analises_status_idx" ON "oficio_analises" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oficio_analises_workspace_id_idx" ON "oficio_analises" USING btree ("workspace_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
