CREATE TYPE "public"."canal_entrada_vvd" AS ENUM('audiencia_custodia', 'plantao', 'vara_vvd', 'delegacia', 'espontanea', 'outro');--> statement-breakpoint
CREATE TYPE "public"."circunstancia_radar" AS ENUM('flagrante', 'mandado', 'denuncia', 'operacao', 'investigacao', 'julgamento');--> statement-breakpoint
CREATE TYPE "public"."radar_enrichment_status" AS ENUM('pending', 'extracted', 'matched', 'analyzed', 'failed', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."radar_fonte_confiabilidade" AS ENUM('local', 'regional', 'estadual');--> statement-breakpoint
CREATE TYPE "public"."radar_fonte_tipo" AS ENUM('portal', 'rss', 'instagram', 'twitter', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."radar_match_status" AS ENUM('auto_confirmado', 'possivel', 'descartado', 'confirmado_manual');--> statement-breakpoint
CREATE TYPE "public"."tipo_crime_radar" AS ENUM('homicidio', 'tentativa_homicidio', 'feminicidio', 'trafico', 'roubo', 'furto', 'violencia_domestica', 'sexual', 'lesao_corporal', 'porte_arma', 'estelionato', 'execucao_penal', 'outros');--> statement-breakpoint
CREATE TYPE "public"."tipo_relato_vvd" AS ENUM('versao_do_fato', 'negativa_total', 'negativa_parcial', 'confissao', 'sem_contato');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leis_versoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"lei_id" varchar(50) NOT NULL,
	"artigo_id" varchar(100) NOT NULL,
	"texto_anterior" text,
	"texto_novo" text NOT NULL,
	"lei_alteradora" varchar(200),
	"data_vigencia" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referencias_biblioteca" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"referencia_id" varchar(100) NOT NULL,
	"caso_id" integer,
	"processo_id" integer,
	"observacao" text,
	"citacao_formatada" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analises_cowork" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"processo_id" integer,
	"audiencia_id" integer,
	"tipo" varchar(50) NOT NULL,
	"schema_version" varchar(10) DEFAULT '1.0' NOT NULL,
	"resumo_fato" text,
	"tese_defesa" text,
	"estrategia_atual" text,
	"crime_principal" varchar(200),
	"pontos_criticos" jsonb DEFAULT '[]'::jsonb,
	"payload" jsonb NOT NULL,
	"fonte_arquivo" text,
	"importado_em" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comarcas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"regional" varchar(50),
	"regiao_metro" varchar(50),
	"uf" varchar(2) DEFAULT 'BA' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"features" jsonb DEFAULT '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comarcas_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_connection_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer,
	"event" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"shortcut" varchar(50),
	"category" varchar(50) DEFAULT 'geral' NOT NULL,
	"content" text NOT NULL,
	"variables" text[],
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "defensor_parceiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"parceiro_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defensor_parceiros_unique" UNIQUE("defensor_id","parceiro_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "radar_fontes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"tipo" "radar_fonte_tipo" DEFAULT 'portal' NOT NULL,
	"confiabilidade" "radar_fonte_confiabilidade" DEFAULT 'regional' NOT NULL,
	"url" text NOT NULL,
	"seletor_titulo" text,
	"seletor_corpo" text,
	"seletor_data" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultima_coleta" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "radar_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"noticia_id" integer NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"caso_id" integer,
	"nome_encontrado" text NOT NULL,
	"score_confianca" integer DEFAULT 0 NOT NULL,
	"status" "radar_match_status" DEFAULT 'possivel' NOT NULL,
	"dados_extraidos" jsonb,
	"notes" text,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "radar_noticias" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"fonte" varchar(100) NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text,
	"data_publicacao" timestamp,
	"data_fato" timestamp,
	"imagem_url" text,
	"tipo_crime" "tipo_crime_radar",
	"bairro" text,
	"logradouro" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"delegacia" text,
	"circunstancia" "circunstancia_radar",
	"artigos_penais" jsonb,
	"arma_meio" text,
	"resumo_ia" text,
	"envolvidos" jsonb,
	"comarca_id" integer DEFAULT 1 NOT NULL,
	"content_hash" text,
	"relevancia_score" integer DEFAULT 0 NOT NULL,
	"municipio" text DEFAULT 'camacari' NOT NULL,
	"enrichment_status" "radar_enrichment_status" DEFAULT 'pending' NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"analysis_sonnet" jsonb,
	"raw_html" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "radar_noticias_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legislacao_destaques" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lei_id" varchar(50) NOT NULL,
	"artigo_id" varchar(100) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"conteudo" text,
	"cor" varchar(20) DEFAULT 'yellow',
	"texto_selecionado" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_favoritos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"noticia_id" integer NOT NULL,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_fontes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"url_base" varchar(500) NOT NULL,
	"url_feed" varchar(500) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"seletor_css" text,
	"cor" varchar(20) DEFAULT '#71717a',
	"ativo" boolean DEFAULT true NOT NULL,
	"ultimo_scrape_em" timestamp,
	"ultimo_erro" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_juridicas" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text,
	"resumo" text,
	"fonte" varchar(50) NOT NULL,
	"fonte_id" integer,
	"url_original" varchar(1000) NOT NULL,
	"autor" varchar(200),
	"imagem_url" varchar(1000),
	"categoria" varchar(30) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"aprovado_por" integer,
	"aprovado_em" timestamp,
	"publicado_em" timestamp,
	"scrapeado_em" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"analise_ia" jsonb DEFAULT 'null'::jsonb,
	CONSTRAINT "noticias_juridicas_url_original_unique" UNIQUE("url_original")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_pasta_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"pasta_id" integer NOT NULL,
	"noticia_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_pastas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nome" varchar(100) NOT NULL,
	"cor" varchar(20) DEFAULT '#6366f1',
	"icone" varchar(50) DEFAULT 'Folder',
	"tipo" varchar(10) DEFAULT 'livre' NOT NULL,
	"area" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_processos" (
	"id" serial PRIMARY KEY NOT NULL,
	"noticia_id" integer NOT NULL,
	"processo_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"observacao" text,
	"auto_vinculada" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "noticias_temas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nome" varchar(100) NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "workspaces" CASCADE;--> statement-breakpoint
ALTER TABLE "afastamentos" DROP CONSTRAINT "afastamentos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "assistidos" DROP CONSTRAINT "assistidos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "atendimentos" DROP CONSTRAINT "atendimentos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "audiencias" DROP CONSTRAINT "audiencias_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "calculos_prazos" DROP CONSTRAINT "calculos_prazos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "case_personas" DROP CONSTRAINT "case_personas_jurado_id_jurados_id_fk";
--> statement-breakpoint
ALTER TABLE "casos" DROP CONSTRAINT "casos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "delegacoes_historico" DROP CONSTRAINT "delegacoes_historico_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "demandas" DROP CONSTRAINT "demandas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "diligencia_templates" DROP CONSTRAINT "diligencia_templates_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "diligencias" DROP CONSTRAINT "diligencias_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "distribution_history" DROP CONSTRAINT "distribution_history_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "documento_modelos" DROP CONSTRAINT "documento_modelos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "documentos" DROP CONSTRAINT "documentos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "documentos_gerados" DROP CONSTRAINT "documentos_gerados_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "evolution_config" DROP CONSTRAINT "evolution_config_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "extraction_patterns" DROP CONSTRAINT "extraction_patterns_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "fact_evidence" DROP CONSTRAINT "fact_evidence_documento_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "feriados_forenses" DROP CONSTRAINT "feriados_forenses_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "intimacoes_vvd" DROP CONSTRAINT "intimacoes_vvd_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "juri_script_items" DROP CONSTRAINT "juri_script_items_sessao_juri_id_sessoes_juri_id_fk";
--> statement-breakpoint
ALTER TABLE "jurisprudencia_buscas" DROP CONSTRAINT "jurisprudencia_buscas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "jurisprudencia_drive_folders" DROP CONSTRAINT "jurisprudencia_drive_folders_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "jurisprudencia_julgados" DROP CONSTRAINT "jurisprudencia_julgados_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "jurisprudencia_temas" DROP CONSTRAINT "jurisprudencia_temas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "jurisprudencia_teses" DROP CONSTRAINT "jurisprudencia_teses_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "oficio_analises" DROP CONSTRAINT "oficio_analises_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "palacio_diagramas" DROP CONSTRAINT "palacio_diagramas_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "partes_vvd" DROP CONSTRAINT "partes_vvd_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "plaud_config" DROP CONSTRAINT "plaud_config_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "plaud_recordings" DROP CONSTRAINT "plaud_recordings_atendimento_id_atendimentos_id_fk";
--> statement-breakpoint
ALTER TABLE "processos" DROP CONSTRAINT "processos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP CONSTRAINT "processos_vvd_autor_id_partes_vvd_id_fk";
--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP CONSTRAINT "processos_vvd_vitima_id_partes_vvd_id_fk";
--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP CONSTRAINT "processos_vvd_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "quesitos" DROP CONSTRAINT "quesitos_sessao_juri_id_sessoes_juri_id_fk";
--> statement-breakpoint
ALTER TABLE "sessoes_juri" DROP CONSTRAINT "sessoes_juri_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "simulacao_assets" DROP CONSTRAINT "simulacao_assets_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "simulacoes_3d" DROP CONSTRAINT "simulacoes_3d_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "tipo_prazos" DROP CONSTRAINT "tipo_prazos_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_workspace_id_workspaces_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "afastamentos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "assistidos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "atendimentos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "audiencias_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "calculos_prazos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "calendar_events_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "casos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "delegacoes_historico_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "demandas_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "diligencia_templates_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "diligencias_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "distribution_history_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "documento_modelos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "documentos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "documentos_gerados_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "evolution_config_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "extraction_patterns_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "feriados_forenses_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "intimacoes_vvd_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "jurisprudencia_buscas_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "jurisprudencia_drive_folders_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "jurisprudencia_julgados_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "jurisprudencia_temas_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "jurisprudencia_teses_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "mural_notas_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "oficio_analises_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "palacio_diagramas_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "pareceres_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "partes_vvd_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "plaud_config_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "processos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "processos_vvd_autor_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "processos_vvd_vitima_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "processos_vvd_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sessoes_juri_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "simulacao_assets_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "simulacoes_3d_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tipo_prazos_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_workspace_id_idx";--> statement-breakpoint
ALTER TABLE "cross_analyses" ALTER COLUMN "tese_consolidada" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "escalas_atribuicao" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "evolution_config" ADD COLUMN "last_disconnect_reason" text;--> statement-breakpoint
ALTER TABLE "evolution_config" ADD COLUMN "last_sync_contacts_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "intimacoes_vvd" ADD COLUMN "audiencia_id" integer;--> statement-breakpoint
ALTER TABLE "partes_vvd" ADD COLUMN "assistido_id" integer;--> statement-breakpoint
ALTER TABLE "partes_vvd" ADD COLUMN "sexo" varchar(10);--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "local_do_fato_endereco" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "local_do_fato_lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "local_do_fato_lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "requerido_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "requerente_id" integer;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "processo_id" integer;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "canal_entrada" "canal_entrada_vvd";--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "tipo_relato" "tipo_relato_vvd";--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "tem_acao_familia" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "tipo_acao_familia" varchar(30);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "suspeita_ma_fe" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "data_fato" date;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "medidas_deferidas" jsonb;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "raio_restricao_metros" integer;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_residencia_endereco" text;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_residencia_lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_residencia_lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_trabalho_endereco" text;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_trabalho_lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "agressor_trabalho_lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "comarca_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_chat_messages" ADD COLUMN "reply_to_id" varchar(200);--> statement-breakpoint
ALTER TABLE "whatsapp_chat_messages" ADD COLUMN "imported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_chat_messages" ADD COLUMN "imported_at" timestamp;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "contact_relation" varchar(20);--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "contact_relation_detail" text;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "last_message_content" text;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "last_message_direction" varchar(10);--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "last_message_type" varchar(20);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referencias_biblioteca" ADD CONSTRAINT "referencias_biblioteca_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referencias_biblioteca" ADD CONSTRAINT "referencias_biblioteca_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referencias_biblioteca" ADD CONSTRAINT "referencias_biblioteca_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_cowork" ADD CONSTRAINT "analises_cowork_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_cowork" ADD CONSTRAINT "analises_cowork_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_connection_log" ADD CONSTRAINT "whatsapp_connection_log_config_id_evolution_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."evolution_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "defensor_parceiros" ADD CONSTRAINT "defensor_parceiros_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "defensor_parceiros" ADD CONSTRAINT "defensor_parceiros_parceiro_id_users_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_matches" ADD CONSTRAINT "radar_matches_noticia_id_radar_noticias_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."radar_noticias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_matches" ADD CONSTRAINT "radar_matches_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_matches" ADD CONSTRAINT "radar_matches_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_matches" ADD CONSTRAINT "radar_matches_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_matches" ADD CONSTRAINT "radar_matches_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radar_noticias" ADD CONSTRAINT "radar_noticias_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legislacao_destaques" ADD CONSTRAINT "legislacao_destaques_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_favoritos" ADD CONSTRAINT "noticias_favoritos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_favoritos" ADD CONSTRAINT "noticias_favoritos_noticia_id_noticias_juridicas_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."noticias_juridicas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_juridicas" ADD CONSTRAINT "noticias_juridicas_fonte_id_noticias_fontes_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."noticias_fontes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_juridicas" ADD CONSTRAINT "noticias_juridicas_aprovado_por_users_id_fk" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_pasta_itens" ADD CONSTRAINT "noticias_pasta_itens_pasta_id_noticias_pastas_id_fk" FOREIGN KEY ("pasta_id") REFERENCES "public"."noticias_pastas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_pasta_itens" ADD CONSTRAINT "noticias_pasta_itens_noticia_id_noticias_juridicas_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."noticias_juridicas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_pastas" ADD CONSTRAINT "noticias_pastas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_processos" ADD CONSTRAINT "noticias_processos_noticia_id_noticias_juridicas_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."noticias_juridicas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_processos" ADD CONSTRAINT "noticias_processos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "noticias_temas" ADD CONSTRAINT "noticias_temas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leis_versoes_lei_artigo_idx" ON "leis_versoes" USING btree ("lei_id","artigo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leis_versoes_lei_idx" ON "leis_versoes" USING btree ("lei_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ref_bib_caso_idx" ON "referencias_biblioteca" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ref_bib_ref_idx" ON "referencias_biblioteca" USING btree ("tipo","referencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ref_bib_processo_idx" ON "referencias_biblioteca" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_cowork_assistido_id_idx" ON "analises_cowork" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_cowork_processo_id_idx" ON "analises_cowork" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_cowork_tipo_idx" ON "analises_cowork" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_cowork_importado_em_idx" ON "analises_cowork" USING btree ("importado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comarcas_regiao_metro_idx" ON "comarcas" USING btree ("regiao_metro");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comarcas_ativo_idx" ON "comarcas" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_connection_log_config_date" ON "whatsapp_connection_log" USING btree ("config_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_shortcut_idx" ON "whatsapp_templates" USING btree ("shortcut");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_idx" ON "whatsapp_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensor_parceiros_defensor_idx" ON "defensor_parceiros" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensor_parceiros_parceiro_idx" ON "defensor_parceiros" USING btree ("parceiro_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_noticia_id_idx" ON "radar_matches" USING btree ("noticia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_assistido_id_idx" ON "radar_matches" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_processo_id_idx" ON "radar_matches" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_caso_id_idx" ON "radar_matches" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_status_idx" ON "radar_matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_score_idx" ON "radar_matches" USING btree ("score_confianca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_matches_noticia_status_idx" ON "radar_matches" USING btree ("noticia_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_tipo_crime_idx" ON "radar_noticias" USING btree ("tipo_crime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_data_fato_idx" ON "radar_noticias" USING btree ("data_fato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_bairro_idx" ON "radar_noticias" USING btree ("bairro");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_enrichment_status_idx" ON "radar_noticias" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_fonte_idx" ON "radar_noticias" USING btree ("fonte");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_created_at_idx" ON "radar_noticias" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_content_hash_idx" ON "radar_noticias" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_status_datapub_idx" ON "radar_noticias" USING btree ("enrichment_status","data_publicacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_status_relevancia_datapub_idx" ON "radar_noticias" USING btree ("enrichment_status","relevancia_score","data_publicacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_comarca_id_idx" ON "radar_noticias" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_municipio_idx" ON "radar_noticias" USING btree ("municipio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_noticias_municipio_status_idx" ON "radar_noticias" USING btree ("municipio","enrichment_status","data_publicacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leg_dest_user_idx" ON "legislacao_destaques" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leg_dest_user_artigo_idx" ON "legislacao_destaques" USING btree ("user_id","artigo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leg_dest_user_lei_idx" ON "legislacao_destaques" USING btree ("user_id","lei_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "not_fav_unique_idx" ON "noticias_favoritos" USING btree ("user_id","noticia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_fav_user_idx" ON "noticias_favoritos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_jur_status_idx" ON "noticias_juridicas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_jur_categoria_idx" ON "noticias_juridicas" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_jur_fonte_idx" ON "noticias_juridicas" USING btree ("fonte");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_jur_publicado_idx" ON "noticias_juridicas" USING btree ("publicado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_jur_url_idx" ON "noticias_juridicas" USING btree ("url_original");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "not_pasta_item_unique_idx" ON "noticias_pasta_itens" USING btree ("pasta_id","noticia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_pasta_item_pasta_idx" ON "noticias_pasta_itens" USING btree ("pasta_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_pasta_user_idx" ON "noticias_pastas" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "not_proc_unique_idx" ON "noticias_processos" USING btree ("noticia_id","processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_proc_noticia_idx" ON "noticias_processos" USING btree ("noticia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_proc_processo_idx" ON "noticias_processos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "not_temas_user_idx" ON "noticias_temas" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistidos" ADD CONSTRAINT "assistidos_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escalas_atribuicao" ADD CONSTRAINT "escalas_atribuicao_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_audiencia_id_audiencias_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."audiencias"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partes_vvd" ADD CONSTRAINT "partes_vvd_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_requerido_id_partes_vvd_id_fk" FOREIGN KEY ("requerido_id") REFERENCES "public"."partes_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_requerente_id_partes_vvd_id_fk" FOREIGN KEY ("requerente_id") REFERENCES "public"."partes_vvd"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_comarca_id_idx" ON "assistidos" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escalas_comarca_id_idx" ON "escalas_atribuicao" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_audiencia_id_idx" ON "intimacoes_vvd" USING btree ("audiencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_assistido_id_idx" ON "partes_vvd" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_sexo_idx" ON "partes_vvd" USING btree ("sexo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_comarca_id_idx" ON "processos" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_local_fato_geo_idx" ON "processos" USING btree ("local_do_fato_lat","local_do_fato_lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_requerido_id_idx" ON "processos_vvd" USING btree ("requerido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_requerente_id_idx" ON "processos_vvd" USING btree ("requerente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_processo_id_idx" ON "processos_vvd" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_canal_entrada_idx" ON "processos_vvd" USING btree ("canal_entrada");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_tipo_relato_idx" ON "processos_vvd" USING btree ("tipo_relato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_tem_acao_familia_idx" ON "processos_vvd" USING btree ("tem_acao_familia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_data_fato_idx" ON "processos_vvd" USING btree ("data_fato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_agressor_residencia_geo_idx" ON "processos_vvd" USING btree ("agressor_residencia_lat","agressor_residencia_lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profissionais_comarca_id_idx" ON "profissionais" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_comarca_id_idx" ON "users" USING btree ("comarca_id");--> statement-breakpoint
ALTER TABLE "afastamentos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "assistidos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "atendimentos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "audiencias" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "calculos_prazos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "casos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "delegacoes_historico" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "demandas" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "diligencia_templates" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "diligencias" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "distribution_history" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "documento_modelos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "documentos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "documentos_gerados" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "evolution_config" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "extraction_patterns" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "feriados_forenses" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "intimacoes_vvd" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "jurisprudencia_buscas" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "jurisprudencia_drive_folders" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "jurisprudencia_julgados" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "jurisprudencia_temas" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "jurisprudencia_teses" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "mural_notas" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "oficio_analises" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "palacio_diagramas" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "pareceres" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "partes_vvd" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "plaud_config" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "processos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP COLUMN IF EXISTS "autor_id";--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP COLUMN IF EXISTS "vitima_id";--> statement-breakpoint
ALTER TABLE "processos_vvd" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "sessoes_juri" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "simulacao_assets" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "simulacoes_3d" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "tipo_prazos" DROP COLUMN IF EXISTS "workspace_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "workspace_id";