CREATE TYPE "public"."area_direito" AS ENUM('CRIMINAL', 'CIVEL', 'TRABALHISTA', 'EXECUCAO_PENAL', 'JURI');--> statement-breakpoint
CREATE TYPE "public"."status_mpu" AS ENUM('ATIVA', 'EXPIRADA', 'REVOGADA', 'RENOVADA', 'MODULADA', 'AGUARDANDO_DECISAO');--> statement-breakpoint
CREATE TYPE "public"."tipo_decisao" AS ENUM('ACORDAO', 'DECISAO_MONOCRATICA', 'SUMULA', 'SUMULA_VINCULANTE', 'REPERCUSSAO_GERAL', 'RECURSO_REPETITIVO', 'INFORMATIVO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_intimacao" AS ENUM('CIENCIA', 'PETICIONAR', 'AUDIENCIA', 'CUMPRIMENTO');--> statement-breakpoint
CREATE TYPE "public"."tribunal" AS ENUM('STF', 'STJ', 'TJBA', 'TRF1', 'TRF3', 'OUTRO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calculos_prazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer,
	"tipo_prazo_id" integer,
	"tipo_prazo_codigo" varchar(50),
	"data_expedicao" date,
	"data_leitura" date,
	"data_termo_inicial" date,
	"data_termo_final" date NOT NULL,
	"prazo_base_dias" integer NOT NULL,
	"prazo_com_dobro_dias" integer NOT NULL,
	"dias_uteis_suspensos" integer DEFAULT 0,
	"area_direito" varchar(20),
	"contado_em_dias_uteis" boolean DEFAULT false,
	"aplicou_dobro" boolean DEFAULT true,
	"tempo_leitura_aplicado" integer DEFAULT 10,
	"observacoes" text,
	"calculo_manual" boolean DEFAULT false,
	"workspace_id" integer,
	"calculado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feriados_forenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" date NOT NULL,
	"nome" varchar(150) NOT NULL,
	"tipo" varchar(30) DEFAULT 'FERIADO' NOT NULL,
	"abrangencia" varchar(30) DEFAULT 'NACIONAL',
	"estado" varchar(2),
	"comarca" varchar(100),
	"tribunal" varchar(20),
	"suspende_prazo" boolean DEFAULT true,
	"apenas_expediente" boolean DEFAULT false,
	"data_fim" date,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historico_mpu" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_vvd_id" integer NOT NULL,
	"tipo_evento" varchar(30) NOT NULL,
	"data_evento" date NOT NULL,
	"descricao" text,
	"medidas_vigentes" text,
	"nova_data_vencimento" date,
	"nova_distancia" integer,
	"pje_documento_id" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intimacoes_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_vvd_id" integer NOT NULL,
	"tipo_intimacao" "tipo_intimacao" DEFAULT 'CIENCIA' NOT NULL,
	"ato" text NOT NULL,
	"data_expedicao" date,
	"data_intimacao" date,
	"prazo" date,
	"prazo_dias" integer,
	"pje_documento_id" varchar(20),
	"pje_tipo_documento" varchar(50),
	"status" varchar(30) DEFAULT 'pendente',
	"providencias" text,
	"demanda_id" integer,
	"defensor_id" integer,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_buscas" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"tipo_query" varchar(20) DEFAULT 'pergunta',
	"resposta" text,
	"julgados_ids" jsonb,
	"tempo_resposta" integer,
	"total_resultados" integer,
	"feedback" varchar(20),
	"workspace_id" integer,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_drive_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"folder_id" varchar(100) NOT NULL,
	"folder_name" varchar(255),
	"folder_path" text,
	"tribunal" "tribunal",
	"tema_id" integer,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"total_arquivos" integer DEFAULT 0,
	"arquivos_sincronizados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_julgados" (
	"id" serial PRIMARY KEY NOT NULL,
	"tribunal" "tribunal" NOT NULL,
	"tipo_decisao" "tipo_decisao" NOT NULL,
	"numero_processo" varchar(100),
	"numero_recurso" varchar(100),
	"relator" varchar(200),
	"orgao_julgador" varchar(200),
	"data_julgamento" date,
	"data_publicacao" date,
	"ementa" text,
	"ementa_resumo" text,
	"decisao" text,
	"votacao" varchar(100),
	"texto_integral" text,
	"tema_id" integer,
	"tese_id" integer,
	"tags" jsonb,
	"palavras_chave" jsonb,
	"drive_file_id" varchar(100),
	"drive_file_url" text,
	"arquivo_nome" varchar(255),
	"arquivo_tamanho" integer,
	"processado_por_ia" boolean DEFAULT false,
	"ia_resumo" text,
	"ia_pontos_chave" jsonb,
	"ia_argumentos" jsonb,
	"embedding" jsonb,
	"citacao_formatada" text,
	"status" varchar(20) DEFAULT 'pendente',
	"is_favorito" boolean DEFAULT false,
	"fonte" varchar(100),
	"observacoes" text,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_temas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(200) NOT NULL,
	"descricao" text,
	"cor" varchar(20) DEFAULT '#6366f1',
	"icone" varchar(50),
	"parent_id" integer,
	"total_julgados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_teses" (
	"id" serial PRIMARY KEY NOT NULL,
	"tema_id" integer,
	"titulo" varchar(300) NOT NULL,
	"descricao" text,
	"texto_tese" text,
	"posicao" varchar(20) DEFAULT 'favoravel',
	"forca" varchar(20) DEFAULT 'medio',
	"tags" jsonb,
	"total_julgados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partes_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"data_nascimento" date,
	"tipo_parte" varchar(20) NOT NULL,
	"telefone" varchar(20),
	"telefone_secundario" varchar(20),
	"email" varchar(100),
	"endereco" text,
	"bairro" varchar(100),
	"cidade" varchar(100),
	"parentesco" varchar(50),
	"observacoes" text,
	"workspace_id" integer,
	"defensor_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processos_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"autor_id" integer NOT NULL,
	"vitima_id" integer,
	"numero_autos" text NOT NULL,
	"tipo_processo" varchar(20) DEFAULT 'MPU' NOT NULL,
	"comarca" varchar(100),
	"vara" varchar(100) DEFAULT 'Vara de Violência Doméstica',
	"crime" varchar(200),
	"assunto" text,
	"data_distribuicao" date,
	"data_ultima_movimentacao" date,
	"fase" varchar(50) DEFAULT 'tramitando',
	"situacao" varchar(50) DEFAULT 'ativo',
	"mpu_ativa" boolean DEFAULT false,
	"data_decisao_mpu" date,
	"tipos_mpu" text,
	"data_vencimento_mpu" date,
	"distancia_minima" integer,
	"defensor_id" integer,
	"observacoes" text,
	"pje_documento_id" varchar(20),
	"pje_ultima_atualizacao" timestamp,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipo_prazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nome" varchar(150) NOT NULL,
	"descricao" text,
	"prazo_legal_dias" integer NOT NULL,
	"area_direito" "area_direito" DEFAULT 'CRIMINAL' NOT NULL,
	"contar_em_dias_uteis" boolean DEFAULT false,
	"aplicar_dobro_defensoria" boolean DEFAULT true,
	"tempo_leitura_dias" integer DEFAULT 10,
	"termo_inicial" varchar(50) DEFAULT 'INTIMACAO',
	"categoria" varchar(50),
	"fase" varchar(50),
	"is_active" boolean DEFAULT true,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tipo_prazos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "data_expedicao" date;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "tipo_prazo_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_tipo_prazo_id_tipo_prazos_id_fk" FOREIGN KEY ("tipo_prazo_id") REFERENCES "public"."tipo_prazos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_calculado_por_id_users_id_fk" FOREIGN KEY ("calculado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feriados_forenses" ADD CONSTRAINT "feriados_forenses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historico_mpu" ADD CONSTRAINT "historico_mpu_processo_vvd_id_processos_vvd_id_fk" FOREIGN KEY ("processo_vvd_id") REFERENCES "public"."processos_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_processo_vvd_id_processos_vvd_id_fk" FOREIGN KEY ("processo_vvd_id") REFERENCES "public"."processos_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_buscas" ADD CONSTRAINT "jurisprudencia_buscas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_buscas" ADD CONSTRAINT "jurisprudencia_buscas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_tese_id_jurisprudencia_teses_id_fk" FOREIGN KEY ("tese_id") REFERENCES "public"."jurisprudencia_teses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_temas" ADD CONSTRAINT "jurisprudencia_temas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_temas" ADD CONSTRAINT "jurisprudencia_temas_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partes_vvd" ADD CONSTRAINT "partes_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partes_vvd" ADD CONSTRAINT "partes_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_autor_id_partes_vvd_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."partes_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_vitima_id_partes_vvd_id_fk" FOREIGN KEY ("vitima_id") REFERENCES "public"."partes_vvd"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipo_prazos" ADD CONSTRAINT "tipo_prazos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_demanda_id_idx" ON "calculos_prazos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_tipo_prazo_id_idx" ON "calculos_prazos" USING btree ("tipo_prazo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_data_termo_final_idx" ON "calculos_prazos" USING btree ("data_termo_final");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_workspace_id_idx" ON "calculos_prazos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_data_idx" ON "feriados_forenses" USING btree ("data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_tipo_idx" ON "feriados_forenses" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_abrangencia_idx" ON "feriados_forenses" USING btree ("abrangencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_estado_idx" ON "feriados_forenses" USING btree ("estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_tribunal_idx" ON "feriados_forenses" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_workspace_id_idx" ON "feriados_forenses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_processo_vvd_id_idx" ON "historico_mpu" USING btree ("processo_vvd_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_tipo_evento_idx" ON "historico_mpu" USING btree ("tipo_evento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_data_evento_idx" ON "historico_mpu" USING btree ("data_evento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_processo_vvd_id_idx" ON "intimacoes_vvd" USING btree ("processo_vvd_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_tipo_intimacao_idx" ON "intimacoes_vvd" USING btree ("tipo_intimacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_status_idx" ON "intimacoes_vvd" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_prazo_idx" ON "intimacoes_vvd" USING btree ("prazo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_defensor_id_idx" ON "intimacoes_vvd" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_workspace_id_idx" ON "intimacoes_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_user_id_idx" ON "jurisprudencia_buscas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_workspace_id_idx" ON "jurisprudencia_buscas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_created_at_idx" ON "jurisprudencia_buscas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_folder_id_idx" ON "jurisprudencia_drive_folders" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_tribunal_idx" ON "jurisprudencia_drive_folders" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_workspace_id_idx" ON "jurisprudencia_drive_folders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tribunal_idx" ON "jurisprudencia_julgados" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tipo_decisao_idx" ON "jurisprudencia_julgados" USING btree ("tipo_decisao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_numero_processo_idx" ON "jurisprudencia_julgados" USING btree ("numero_processo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_data_julgamento_idx" ON "jurisprudencia_julgados" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tema_id_idx" ON "jurisprudencia_julgados" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tese_id_idx" ON "jurisprudencia_julgados" USING btree ("tese_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_status_idx" ON "jurisprudencia_julgados" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_is_favorito_idx" ON "jurisprudencia_julgados" USING btree ("is_favorito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_workspace_id_idx" ON "jurisprudencia_julgados" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_nome_idx" ON "jurisprudencia_temas" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_parent_id_idx" ON "jurisprudencia_temas" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_workspace_id_idx" ON "jurisprudencia_temas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_tema_id_idx" ON "jurisprudencia_teses" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_titulo_idx" ON "jurisprudencia_teses" USING btree ("titulo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_posicao_idx" ON "jurisprudencia_teses" USING btree ("posicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_workspace_id_idx" ON "jurisprudencia_teses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_nome_idx" ON "partes_vvd" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_cpf_idx" ON "partes_vvd" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_tipo_parte_idx" ON "partes_vvd" USING btree ("tipo_parte");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_workspace_id_idx" ON "partes_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_deleted_at_idx" ON "partes_vvd" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_autor_id_idx" ON "processos_vvd" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_vitima_id_idx" ON "processos_vvd" USING btree ("vitima_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_numero_autos_idx" ON "processos_vvd" USING btree ("numero_autos");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_mpu_ativa_idx" ON "processos_vvd" USING btree ("mpu_ativa");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_data_vencimento_mpu_idx" ON "processos_vvd" USING btree ("data_vencimento_mpu");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_defensor_id_idx" ON "processos_vvd" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_workspace_id_idx" ON "processos_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_deleted_at_idx" ON "processos_vvd" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_codigo_idx" ON "tipo_prazos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_area_direito_idx" ON "tipo_prazos" USING btree ("area_direito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_categoria_idx" ON "tipo_prazos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_workspace_id_idx" ON "tipo_prazos" USING btree ("workspace_id");