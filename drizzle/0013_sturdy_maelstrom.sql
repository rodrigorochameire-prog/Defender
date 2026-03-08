CREATE TYPE "public"."documento_juri_tipo" AS ENUM('quesitos', 'sentenca', 'ata');--> statement-breakpoint
CREATE TYPE "public"."quesitos_resultado" AS ENUM('sim', 'nao', 'prejudicado');--> statement-breakpoint
CREATE TYPE "public"."regime_inicial" AS ENUM('fechado', 'semiaberto', 'aberto');--> statement-breakpoint
CREATE TYPE "public"."resultado_recurso" AS ENUM('provido', 'parcialmente_provido', 'improvido', 'nao_conhecido');--> statement-breakpoint
CREATE TYPE "public"."status_apelacao" AS ENUM('interposta', 'admitida', 'em_julgamento', 'julgada', 'transitada');--> statement-breakpoint
CREATE TYPE "public"."tipo_penal_juri" AS ENUM('homicidio_simples', 'homicidio_qualificado', 'homicidio_privilegiado', 'homicidio_privilegiado_qualificado', 'homicidio_tentado', 'feminicidio');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"assistido_id" integer,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_text" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentos_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_juri_id" integer NOT NULL,
	"tipo" "documento_juri_tipo" NOT NULL,
	"file_name" text,
	"url" text NOT NULL,
	"dados_extraidos" jsonb,
	"processado_em" timestamp,
	"status_processamento" varchar(20) DEFAULT 'pendente',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dosimetria_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_juri_id" integer NOT NULL,
	"pena_base" text,
	"circunstancias_judiciais" text,
	"agravantes" text,
	"atenuantes" text,
	"causas_aumento" text,
	"causas_diminuicao" text,
	"pena_total_meses" integer,
	"regime_inicial" "regime_inicial",
	"detracao_inicio" date,
	"detracao_fim" date,
	"detracao_dias" integer,
	"data_fato" date,
	"fracao_progressao" varchar(10),
	"inciso_aplicado" varchar(30),
	"vedado_livramento" boolean DEFAULT false,
	"resultou_morte" boolean DEFAULT false,
	"reu_reincidente" boolean DEFAULT false,
	"extraido_por_ia" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handoff_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"comarca" text NOT NULL,
	"defensor_2grau_info" text,
	"defensor_ep_info" text,
	"nucleo_ep_endereco" text,
	"nucleo_ep_telefone" text,
	"nucleo_ep_horario" text,
	"mensagem_personalizada" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "handoff_config_comarca_unique" UNIQUE("comarca")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quesitos" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer,
	"sessao_juri_id" integer,
	"numero" integer NOT NULL,
	"texto" text NOT NULL,
	"tipo" varchar(30),
	"origem" varchar(20),
	"tese_id" integer,
	"argumentacao_sim" text,
	"argumentacao_nao" text,
	"depende_de" integer,
	"condicao_pai" varchar(5),
	"gerado_por_ia" boolean DEFAULT false,
	"resultado" "quesitos_resultado",
	"ordem_votacao" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recursos_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_juri_id" integer NOT NULL,
	"caso_id" integer,
	"processo_id" integer NOT NULL,
	"reu_nome" text,
	"status" "status_apelacao" DEFAULT 'interposta' NOT NULL,
	"data_interposicao" date,
	"data_admissao" date,
	"data_julgamento" date,
	"turma_tjba" text,
	"camara_tjba" text,
	"relator" text,
	"resultado_apelacao" "resultado_recurso",
	"houve_resp" boolean DEFAULT false,
	"resultado_resp" "resultado_recurso",
	"houve_re" boolean DEFAULT false,
	"resultado_re" "resultado_recurso",
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "speaker_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"file_id" integer,
	"speaker_key" varchar(50) NOT NULL,
	"label" varchar(200) NOT NULL,
	"role" varchar(50),
	"confidence" real,
	"is_manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "origem_cadastro" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "duplicata_sugerida" jsonb;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "registro_audiencia" jsonb;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "total_condenacoes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "total_absolvicoes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "total_desclassificacoes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "tempo_medio_sustentacao" integer;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "argumentos_preferidos" jsonb;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "teses_vulneraveis" jsonb;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "notas_estrategicas" text;--> statement-breakpoint
ALTER TABLE "personagens_juri" ADD COLUMN "ultima_sessao_data" timestamp;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "simulacao_resultado" jsonb;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "registro_completo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "juiz_presidente" text;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "promotor" text;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "duracao_minutos" integer;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "local_fato" text;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "tipo_penal" "tipo_penal_juri";--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "tese_principal" text;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "reu_primario" boolean;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "reu_idade" integer;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "vitima_genero" varchar(20);--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "vitima_idade" integer;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "usou_algemas" boolean;--> statement-breakpoint
ALTER TABLE "sessoes_juri" ADD COLUMN "incidentes_processuais" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_file_id_drive_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."drive_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_juri" ADD CONSTRAINT "documentos_juri_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dosimetria_juri" ADD CONSTRAINT "dosimetria_juri_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quesitos" ADD CONSTRAINT "quesitos_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quesitos" ADD CONSTRAINT "quesitos_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quesitos" ADD CONSTRAINT "quesitos_tese_id_teses_defensivas_id_fk" FOREIGN KEY ("tese_id") REFERENCES "public"."teses_defensivas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos_juri" ADD CONSTRAINT "recursos_juri_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos_juri" ADD CONSTRAINT "recursos_juri_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos_juri" ADD CONSTRAINT "recursos_juri_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "speaker_labels" ADD CONSTRAINT "speaker_labels_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "speaker_labels" ADD CONSTRAINT "speaker_labels_file_id_drive_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."drive_files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_embeddings_file_idx" ON "document_embeddings" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_embeddings_assistido_idx" ON "document_embeddings" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_juri_sessao_idx" ON "documentos_juri" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_juri_tipo_idx" ON "documentos_juri" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dosimetria_juri_sessao_idx" ON "dosimetria_juri" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "handoff_config_comarca_idx" ON "handoff_config" USING btree ("comarca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quesitos_caso_id_idx" ON "quesitos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quesitos_sessao_juri_id_idx" ON "quesitos" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quesitos_tipo_idx" ON "quesitos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quesitos_numero_idx" ON "quesitos" USING btree ("numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_juri_sessao_idx" ON "recursos_juri" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_juri_processo_idx" ON "recursos_juri" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_juri_status_idx" ON "recursos_juri" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "speaker_labels_assistido_idx" ON "speaker_labels" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "speaker_labels_file_idx" ON "speaker_labels" USING btree ("file_id");