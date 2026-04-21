CREATE TYPE "public"."cautelar_status" AS ENUM('ativa', 'cumprida', 'descumprida', 'revogada', 'extinta');--> statement-breakpoint
CREATE TYPE "public"."cautelar_tipo" AS ENUM('monitoramento-eletronico', 'comparecimento-periodico', 'recolhimento-noturno', 'proibicao-contato', 'proibicao-frequentar', 'afastamento-lar', 'fianca', 'suspensao-porte-arma', 'suspensao-habilitacao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."marco_tipo" AS ENUM('fato', 'apf', 'audiencia-custodia', 'denuncia', 'recebimento-denuncia', 'resposta-acusacao', 'aij-designada', 'aij-realizada', 'memoriais', 'sentenca', 'recurso-interposto', 'acordao-recurso', 'transito-julgado', 'execucao-inicio', 'outro');--> statement-breakpoint
CREATE TYPE "public"."prisao_situacao" AS ENUM('ativa', 'relaxada', 'revogada', 'extinta', 'cumprida', 'convertida-em-preventiva');--> statement-breakpoint
CREATE TYPE "public"."prisao_tipo" AS ENUM('flagrante', 'temporaria', 'preventiva', 'decorrente-sentenca', 'outro');--> statement-breakpoint
CREATE TYPE "public"."classe_recursal" AS ENUM('APELACAO', 'AGRAVO_EXECUCAO', 'RESE', 'HC', 'EMBARGOS', 'REVISAO_CRIMINAL', 'CORREICAO_PARCIAL');--> statement-breakpoint
CREATE TYPE "public"."resultado_julgamento" AS ENUM('PROVIDO', 'IMPROVIDO', 'PARCIAL', 'NAO_CONHECIDO', 'DILIGENCIA', 'PREJUDICADO');--> statement-breakpoint
CREATE TYPE "public"."lugar_tipo_participacao" AS ENUM('local-do-fato', 'endereco-assistido', 'residencia-agressor', 'trabalho-agressor', 'local-atendimento', 'radar-noticia');--> statement-breakpoint
ALTER TYPE "public"."area" ADD VALUE 'CRIMINAL_2_GRAU';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_2_GRAU_SALVADOR';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demandas_acompanhantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"origem_encaminhamento_id" integer,
	"notificar_alteracoes" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_anexos" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer,
	"resposta_id" integer,
	"tipo" varchar(20) NOT NULL,
	"drive_file_id" varchar(80),
	"storage_url" text,
	"nome" varchar(200),
	"size_bytes" integer,
	"duracao_seg" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_destinatarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"estado_pessoal" varchar(20) DEFAULT 'pendente' NOT NULL,
	"lido_em" timestamp,
	"ciente_em" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_respostas" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer NOT NULL,
	"autor_id" integer NOT NULL,
	"mensagem" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"remetente_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"titulo" varchar(200),
	"mensagem" text NOT NULL,
	"demanda_id" integer,
	"processo_id" integer,
	"assistido_id" integer,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"urgencia" varchar(10) DEFAULT 'normal' NOT NULL,
	"notificar_ombuds" boolean DEFAULT true NOT NULL,
	"notificar_whatsapp" boolean DEFAULT false NOT NULL,
	"notificar_email" boolean DEFAULT false NOT NULL,
	"concluido_em" timestamp,
	"concluido_por_id" integer,
	"motivo_recusa" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cautelares" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"pessoa_id" integer,
	"tipo" "cautelar_tipo" NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"detalhes" text,
	"status" "cautelar_status" DEFAULT 'ativa' NOT NULL,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marcos_processuais" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"tipo" "marco_tipo" NOT NULL,
	"data" date NOT NULL,
	"documento_referencia" text,
	"observacoes" text,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prisoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"pessoa_id" integer,
	"tipo" "prisao_tipo" NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"motivo" text,
	"unidade" varchar(200),
	"situacao" "prisao_situacao" DEFAULT 'ativa' NOT NULL,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_heartbeat" (
	"name" text PRIMARY KEY NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participacoes_processo" (
	"id" serial PRIMARY KEY NOT NULL,
	"pessoa_id" integer NOT NULL,
	"processo_id" integer NOT NULL,
	"papel" varchar(30) NOT NULL,
	"lado" varchar(20),
	"subpapel" varchar(40),
	"testemunha_id" integer,
	"resumo_nesta_causa" text,
	"observacoes_nesta_causa" text,
	"audio_drive_file_id" varchar(100),
	"data_primeira_aparicao" date,
	"fonte" varchar(40) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"nomes_alternativos" jsonb DEFAULT '[]'::jsonb,
	"cpf" varchar(14),
	"rg" text,
	"data_nascimento" date,
	"telefone" text,
	"endereco" text,
	"foto_drive_file_id" varchar(100),
	"observacoes" text,
	"categoria_primaria" varchar(30),
	"fonte_criacao" varchar(40) NOT NULL,
	"criado_por" integer,
	"confidence" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"merged_into" integer,
	"merge_reason" text,
	"merged_at" timestamp,
	"merged_by" integer,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoas_distincts_confirmed" (
	"pessoa_a_id" integer NOT NULL,
	"pessoa_b_id" integer NOT NULL,
	"confirmado_por" integer,
	"confirmado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_distincts_confirmed_pessoa_a_id_pessoa_b_id_pk" PRIMARY KEY("pessoa_a_id","pessoa_b_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"logradouro" text,
	"numero" varchar(30),
	"complemento" varchar(120),
	"bairro" varchar(120),
	"cidade" varchar(120) DEFAULT 'Camaçari',
	"uf" varchar(2) DEFAULT 'BA',
	"cep" varchar(9),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"endereco_completo" text,
	"endereco_normalizado" text NOT NULL,
	"observacoes" text,
	"fonte_criacao" varchar(40),
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"merged_into" integer,
	"geocoded_at" timestamp with time zone,
	"geocoding_source" varchar(30),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares_access_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lugar_id" integer,
	"user_id" integer,
	"action" varchar(40) NOT NULL,
	"context" jsonb,
	"ts" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares_distincts_confirmed" (
	"id" serial PRIMARY KEY NOT NULL,
	"lugar_a_id" integer NOT NULL,
	"lugar_b_id" integer NOT NULL,
	"confirmed_by" integer,
	"confirmed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participacoes_lugar" (
	"id" serial PRIMARY KEY NOT NULL,
	"lugar_id" integer NOT NULL,
	"processo_id" integer,
	"pessoa_id" integer,
	"tipo" "lugar_tipo_participacao" NOT NULL,
	"data_relacionada" date,
	"source_table" varchar(40),
	"source_id" integer,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atendimentos_triagem" (
	"id" serial PRIMARY KEY NOT NULL,
	"tcc_ref" varchar(20) NOT NULL,
	"area" varchar(20) NOT NULL,
	"defensor_alvo_id" integer,
	"assistido_nome" text NOT NULL,
	"assistido_telefone" varchar(30),
	"assistido_cpf" varchar(14),
	"compareceu" varchar(20) DEFAULT 'proprio' NOT NULL,
	"familiar_nome" text,
	"familiar_telefone" varchar(30),
	"familiar_grau" varchar(30),
	"processo_cnj" varchar(25),
	"situacao" varchar(50),
	"vara" varchar(30),
	"urgencia" boolean DEFAULT false NOT NULL,
	"urgencia_motivo" varchar(50),
	"documento_entregue" varchar(50) DEFAULT 'Nenhum',
	"demanda_livre" text,
	"status" varchar(30) DEFAULT 'pendente_avaliacao' NOT NULL,
	"promovido_para_demanda_id" integer,
	"delegado_para" varchar(30),
	"motivo_devolucao" text,
	"motivo_override" text,
	"protocolo_solar" varchar(50),
	"metadata" jsonb,
	"criado_por_apps_script" varchar(100),
	"aba_planilha" varchar(20),
	"linha_planilha" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decidido_em" timestamp,
	"decidido_por_id" integer,
	CONSTRAINT "atendimentos_triagem_tcc_ref_unique" UNIQUE("tcc_ref")
);
--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "anotacoes_rapidas" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "ouvido_em" timestamp;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "redesignado_para" date;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "sintese_juizo" text;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "audio_drive_file_id" varchar(100);--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "providencia_resumo" varchar(100);--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "pje_documento_id" varchar(30);--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "classe_recursal" "classe_recursal";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "camara" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "relator" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_distribuicao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_conclusao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_pauta" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_julgamento" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "resultado_julgamento" "resultado_julgamento";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "acordao_recorrido_numero" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_origem_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("origem_encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_anexos" ADD CONSTRAINT "encaminhamento_anexos_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_anexos" ADD CONSTRAINT "encaminhamento_anexos_resposta_id_encaminhamento_respostas_id_fk" FOREIGN KEY ("resposta_id") REFERENCES "public"."encaminhamento_respostas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_destinatarios" ADD CONSTRAINT "encaminhamento_destinatarios_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_destinatarios" ADD CONSTRAINT "encaminhamento_destinatarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_respostas" ADD CONSTRAINT "encaminhamento_respostas_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_respostas" ADD CONSTRAINT "encaminhamento_respostas_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_remetente_id_users_id_fk" FOREIGN KEY ("remetente_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_concluido_por_id_users_id_fk" FOREIGN KEY ("concluido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cautelares" ADD CONSTRAINT "cautelares_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cautelares" ADD CONSTRAINT "cautelares_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marcos_processuais" ADD CONSTRAINT "marcos_processuais_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisoes" ADD CONSTRAINT "prisoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisoes" ADD CONSTRAINT "prisoes_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_testemunha_id_testemunhas_id_fk" FOREIGN KEY ("testemunha_id") REFERENCES "public"."testemunhas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_by_users_id_fk" FOREIGN KEY ("merged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_pessoa_a_id_pessoas_id_fk" FOREIGN KEY ("pessoa_a_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_pessoa_b_id_pessoas_id_fk" FOREIGN KEY ("pessoa_b_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_confirmado_por_users_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_defensor_alvo_id_users_id_fk" FOREIGN KEY ("defensor_alvo_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_promovido_para_demanda_id_demandas_id_fk" FOREIGN KEY ("promovido_para_demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_decidido_por_id_users_id_fk" FOREIGN KEY ("decidido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dem_acomp_unique" ON "demandas_acompanhantes" USING btree ("demanda_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dem_acomp_user_idx" ON "demandas_acompanhantes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enc_dest_unique" ON "encaminhamento_destinatarios" USING btree ("encaminhamento_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_dest_user_idx" ON "encaminhamento_destinatarios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_resp_enc_idx" ON "encaminhamento_respostas" USING btree ("encaminhamento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_workspace_idx" ON "encaminhamentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_remetente_idx" ON "encaminhamentos" USING btree ("remetente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_demanda_idx" ON "encaminhamentos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_status_idx" ON "encaminhamentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_created_idx" ON "encaminhamentos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_pessoa_idx" ON "participacoes_processo" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_processo_idx" ON "participacoes_processo" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_papel_idx" ON "participacoes_processo" USING btree ("papel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_testemunha_idx" ON "participacoes_processo" USING btree ("testemunha_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_nome_norm_idx" ON "pessoas" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_nome_trgm_idx" ON "pessoas" USING gin ("nome_normalizado" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_merged_idx" ON "pessoas" USING btree ("merged_into");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_categoria_idx" ON "pessoas" USING btree ("categoria_primaria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_workspace_idx" ON "pessoas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_status_idx" ON "atendimentos_triagem" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_defensor_alvo_idx" ON "atendimentos_triagem" USING btree ("defensor_alvo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_area_idx" ON "atendimentos_triagem" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_urgencia_idx" ON "atendimentos_triagem" USING btree ("urgencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_created_at_idx" ON "atendimentos_triagem" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_processo_cnj_idx" ON "atendimentos_triagem" USING btree ("processo_cnj");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_workspace_id_idx" ON "calendar_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_workspace_id_idx" ON "assistidos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_workspace_id_idx" ON "demandas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_workspace_id_idx" ON "processos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_workspace_id_idx" ON "users" USING btree ("workspace_id");