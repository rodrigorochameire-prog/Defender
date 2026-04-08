CREATE TYPE "public"."feedback_status" AS ENUM('novo', 'visto', 'enviado_jira', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."feedback_tipo" AS ENUM('bug', 'sugestao', 'duvida');--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "scan_intimacoes_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_processo" varchar(30) NOT NULL,
	"assistido_nome" varchar(200) NOT NULL,
	"atribuicao" varchar(50) NOT NULL,
	"id_documento" varchar(30),
	"drive_base_path" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ato_sugerido" varchar(100),
	"ato_confianca" varchar(10),
	"providencias" text,
	"audiencia_data" varchar(10),
	"audiencia_hora" varchar(5),
	"audiencia_tipo" varchar(50),
	"pdf_path" text,
	"conteudo_resumo" text,
	"error" text,
	"batch_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "defensores_ba" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" varchar(200),
	"unidade" varchar(100),
	"atribuicao" text,
	"especialidade" varchar(50) NOT NULL,
	"area" varchar(20) NOT NULL,
	"instancia" varchar(20) NOT NULL,
	"localizacao" varchar(20) NOT NULL,
	"comarca" varchar(100),
	"ativo" boolean DEFAULT true NOT NULL,
	"fonte_organograma" varchar(50) DEFAULT 'DPE-BA-2026',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tipo" "feedback_tipo" NOT NULL,
	"mensagem" text NOT NULL,
	"pagina" text,
	"contexto" jsonb,
	"status" "feedback_status" DEFAULT 'novo' NOT NULL,
	"jira_ticket_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_microsoft_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"microsoft_user_id" varchar(100),
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_microsoft_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acordaos" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurso_id" integer NOT NULL,
	"numero_acordao" varchar(30),
	"data_julgamento" date,
	"data_publicacao" date,
	"ementa" text,
	"relator" text,
	"resultado" varchar(30),
	"votacao" varchar(50),
	"votos" jsonb DEFAULT '[]'::jsonb,
	"drive_file_id" integer,
	"analise_ia" jsonb DEFAULT 'null'::jsonb,
	"analise_status" varchar(20) DEFAULT 'PENDENTE',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desembargadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"camara" varchar(50),
	"area" varchar(20),
	"status" varchar(20) DEFAULT 'ATIVO',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recursos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"numero_recurso" varchar(30),
	"processo_origem_id" integer,
	"assistido_id" integer,
	"defensor_origem_id" integer,
	"defensor_destino_id" integer,
	"camara" varchar(50),
	"relator_id" integer,
	"revisor_id" integer,
	"data_interposicao" date,
	"data_distribuicao" date,
	"data_pauta" date,
	"data_julgamento" date,
	"data_transito" date,
	"status" varchar(20) DEFAULT 'INTERPOSTO' NOT NULL,
	"resultado" varchar(30) DEFAULT 'PENDENTE' NOT NULL,
	"teses_invocadas" jsonb DEFAULT '[]'::jsonb,
	"tipos_penais" jsonb DEFAULT '[]'::jsonb,
	"resumo" text,
	"observacoes" text,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_files" DROP CONSTRAINT "drive_files_drive_file_id_unique";--> statement-breakpoint
ALTER TABLE "drive_sync_folders" DROP CONSTRAINT "drive_sync_folders_drive_folder_id_unique";--> statement-breakpoint
ALTER TABLE "demandas" ALTER COLUMN "status" SET DEFAULT '5_TRIAGEM';--> statement-breakpoint
ALTER TABLE "noticias_fontes" ALTER COLUMN "cor" SET DEFAULT '#737373';--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "interlocutor" varchar(30) DEFAULT 'assistido';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onedrive_root_folder_id" varchar(100);--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_folders" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_logs" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
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
DO $$ BEGIN
 ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_microsoft_tokens" ADD CONSTRAINT "user_microsoft_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acordaos" ADD CONSTRAINT "acordaos_recurso_id_recursos_id_fk" FOREIGN KEY ("recurso_id") REFERENCES "public"."recursos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_processo_origem_id_processos_id_fk" FOREIGN KEY ("processo_origem_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_defensor_origem_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_origem_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_defensor_destino_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_destino_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_relator_id_desembargadores_id_fk" FOREIGN KEY ("relator_id") REFERENCES "public"."desembargadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_revisor_id_desembargadores_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."desembargadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_criado_por_id_defensores_ba_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_status_idx" ON "pje_download_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_processo_idx" ON "pje_download_jobs" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_jobs_status_idx" ON "scan_intimacoes_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_jobs_batch_idx" ON "scan_intimacoes_jobs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_especialidade_idx" ON "defensores_ba" USING btree ("especialidade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_area_idx" ON "defensores_ba" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_instancia_idx" ON "defensores_ba" USING btree ("instancia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_localizacao_idx" ON "defensores_ba" USING btree ("localizacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_comarca_idx" ON "defensores_ba" USING btree ("comarca");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "defensores_ba_email_idx" ON "defensores_ba" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_user_id_idx" ON "feedbacks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_status_idx" ON "feedbacks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_created_at_idx" ON "feedbacks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_microsoft_tokens_user_idx" ON "user_microsoft_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_recurso_idx" ON "acordaos" USING btree ("recurso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_data_julgamento_idx" ON "acordaos" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_resultado_idx" ON "acordaos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_relator_idx" ON "acordaos" USING btree ("relator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_analise_status_idx" ON "acordaos" USING btree ("analise_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_camara_idx" ON "desembargadores" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_area_idx" ON "desembargadores" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_tipo_idx" ON "recursos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_status_idx" ON "recursos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_resultado_idx" ON "recursos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_processo_origem_idx" ON "recursos" USING btree ("processo_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_assistido_idx" ON "recursos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_origem_idx" ON "recursos" USING btree ("defensor_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_destino_idx" ON "recursos" USING btree ("defensor_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_relator_idx" ON "recursos" USING btree ("relator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_camara_idx" ON "recursos" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_data_julgamento_idx" ON "recursos" USING btree ("data_julgamento");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_files_provider_file_id_unique" ON "drive_files" USING btree ("drive_file_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_sync_folders_provider_folder_id_unique" ON "drive_sync_folders" USING btree ("drive_folder_id","provider");--> statement-breakpoint
ALTER TABLE "public"."demandas" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status_demanda";--> statement-breakpoint
CREATE TYPE "public"."status_demanda" AS ENUM('2_ATENDER', '4_MONITORAR', '5_TRIAGEM', '7_PROTOCOLADO', '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO');--> statement-breakpoint
ALTER TABLE "public"."demandas" ALTER COLUMN "status" SET DATA TYPE "public"."status_demanda" USING "status"::"public"."status_demanda";