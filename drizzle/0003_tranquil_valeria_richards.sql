CREATE TYPE "public"."diagrama_tipo" AS ENUM('MAPA_MENTAL', 'TIMELINE', 'RELACIONAL', 'HIERARQUIA', 'MATRIX', 'FLUXOGRAMA', 'LIVRE');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('orgao', 'classe', 'parte', 'numero');--> statement-breakpoint
CREATE TYPE "public"."simulacao_status" AS ENUM('RASCUNHO', 'PRONTO', 'APRESENTADO', 'ARQUIVADO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"extracted_numero_processo" text,
	"extracted_orgao_julgador" text,
	"extracted_assistido_nome" text,
	"extracted_classe_demanda" text,
	"atribuicao_identificada" "atribuicao",
	"atribuicao_confianca" integer,
	"assistido_id" integer,
	"processo_id" integer,
	"destination_folder_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"was_manually_correted" boolean DEFAULT false,
	"corrected_by" integer,
	"workspace_id" integer,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" "pattern_type" NOT NULL,
	"original_value" text NOT NULL,
	"corrected_value" text,
	"correct_atribuicao" "atribuicao",
	"regex_used" text,
	"confidence_before" integer,
	"documento_exemplo" text,
	"times_used" integer DEFAULT 1 NOT NULL,
	"workspace_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_conexoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagrama_id" integer NOT NULL,
	"elemento_origem_id" integer NOT NULL,
	"elemento_destino_id" integer NOT NULL,
	"tipo_conexao" varchar(30),
	"label" text,
	"forca" integer,
	"direcional" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_diagramas" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" "diagrama_tipo" DEFAULT 'MAPA_MENTAL' NOT NULL,
	"excalidraw_data" jsonb,
	"thumbnail" text,
	"versao" integer DEFAULT 1,
	"ultimo_exportado" timestamp,
	"formato_exportacao" varchar(20),
	"ordem" integer DEFAULT 0,
	"tags" jsonb,
	"status" varchar(20) DEFAULT 'ativo',
	"criado_por_id" integer,
	"atualizado_por_id" integer,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_elementos" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagrama_id" integer NOT NULL,
	"excalidraw_element_id" text NOT NULL,
	"tipo_vinculo" varchar(30),
	"persona_id" integer,
	"fato_id" integer,
	"documento_id" integer,
	"testemunha_id" integer,
	"tese_id" integer,
	"label" text,
	"notas" text,
	"cor" varchar(20),
	"icone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"categoria" varchar(30) NOT NULL,
	"subcategoria" varchar(50),
	"arquivo_url" text NOT NULL,
	"thumbnail_url" text,
	"formato" varchar(20),
	"descricao" text,
	"tags" jsonb,
	"tamanho_bytes" integer,
	"fonte" varchar(50),
	"licenca" varchar(50),
	"atribuicao" text,
	"configuracao_padrao" jsonb,
	"publico" boolean DEFAULT false,
	"workspace_id" integer,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_exportacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"versao_id" integer NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"formato" varchar(10),
	"resolucao" varchar(20),
	"status" varchar(20) DEFAULT 'pendente',
	"progresso" integer DEFAULT 0,
	"erro" text,
	"tamanho_bytes" integer,
	"duracao_segundos" real,
	"fps" integer,
	"render_engine" varchar(20),
	"tempo_renderizacao" integer,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_keyframes" (
	"id" serial PRIMARY KEY NOT NULL,
	"versao_id" integer NOT NULL,
	"personagem_id" integer,
	"objeto_id" integer,
	"camera_id" text,
	"tempo" real NOT NULL,
	"frame" integer,
	"posicao" jsonb,
	"rotacao" jsonb,
	"escala" jsonb,
	"animacao" varchar(50),
	"animacao_velocidade" real DEFAULT 1,
	"opacidade" real DEFAULT 1,
	"visivel" boolean DEFAULT true,
	"easing" varchar(30) DEFAULT 'linear',
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_objetos" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" varchar(30),
	"modelo_url" text,
	"modelo_nome" varchar(100),
	"posicao" jsonb,
	"rotacao" jsonb,
	"escala" jsonb,
	"cor" varchar(20),
	"visivel" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"descricao" text,
	"ordem" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_personagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"papel" varchar(30),
	"persona_id" integer,
	"avatar_url" text,
	"avatar_tipo" varchar(30),
	"cor" varchar(20),
	"altura" real DEFAULT 1.7,
	"posicao_inicial" jsonb,
	"rotacao_inicial" jsonb,
	"animacao_padrao" varchar(50) DEFAULT 'idle',
	"ordem" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_versoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"cor" varchar(20),
	"animacao_data" jsonb,
	"duracao" real,
	"narrativa" text,
	"camera_id" text,
	"ordem" integer DEFAULT 0,
	"ativa" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacoes_3d" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"cena_data" jsonb,
	"thumbnail" text,
	"status" "simulacao_status" DEFAULT 'RASCUNHO',
	"config_export" jsonb,
	"criado_por_id" integer,
	"atualizado_por_id" integer,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "atribuicao_primaria" "atribuicao" DEFAULT 'SUBSTITUICAO';--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "drive_folder_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_patterns" ADD CONSTRAINT "extraction_patterns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_patterns" ADD CONSTRAINT "extraction_patterns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_diagrama_id_palacio_diagramas_id_fk" FOREIGN KEY ("diagrama_id") REFERENCES "public"."palacio_diagramas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_elemento_origem_id_palacio_elementos_id_fk" FOREIGN KEY ("elemento_origem_id") REFERENCES "public"."palacio_elementos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_elemento_destino_id_palacio_elementos_id_fk" FOREIGN KEY ("elemento_destino_id") REFERENCES "public"."palacio_elementos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_atualizado_por_id_users_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_diagrama_id_palacio_diagramas_id_fk" FOREIGN KEY ("diagrama_id") REFERENCES "public"."palacio_diagramas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_fato_id_case_facts_id_fk" FOREIGN KEY ("fato_id") REFERENCES "public"."case_facts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_testemunha_id_testemunhas_id_fk" FOREIGN KEY ("testemunha_id") REFERENCES "public"."testemunhas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_tese_id_teses_defensivas_id_fk" FOREIGN KEY ("tese_id") REFERENCES "public"."teses_defensivas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_assets" ADD CONSTRAINT "simulacao_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_assets" ADD CONSTRAINT "simulacao_assets_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_exportacoes" ADD CONSTRAINT "simulacao_exportacoes_versao_id_simulacao_versoes_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."simulacao_versoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_exportacoes" ADD CONSTRAINT "simulacao_exportacoes_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_versao_id_simulacao_versoes_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."simulacao_versoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_personagem_id_simulacao_personagens_id_fk" FOREIGN KEY ("personagem_id") REFERENCES "public"."simulacao_personagens"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_objeto_id_simulacao_objetos_id_fk" FOREIGN KEY ("objeto_id") REFERENCES "public"."simulacao_objetos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_objetos" ADD CONSTRAINT "simulacao_objetos_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_personagens" ADD CONSTRAINT "simulacao_personagens_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_personagens" ADD CONSTRAINT "simulacao_personagens_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_versoes" ADD CONSTRAINT "simulacao_versoes_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_atualizado_por_id_users_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_file_id_idx" ON "distribution_history" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_assistido_id_idx" ON "distribution_history" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_processo_id_idx" ON "distribution_history" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_status_idx" ON "distribution_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_workspace_id_idx" ON "distribution_history" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_type_idx" ON "extraction_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_original_value_idx" ON "extraction_patterns" USING btree ("original_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_workspace_id_idx" ON "extraction_patterns" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "extraction_patterns_unique_idx" ON "extraction_patterns" USING btree ("pattern_type","original_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_diagrama_id_idx" ON "palacio_conexoes" USING btree ("diagrama_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_origem_idx" ON "palacio_conexoes" USING btree ("elemento_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_destino_idx" ON "palacio_conexoes" USING btree ("elemento_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_tipo_idx" ON "palacio_conexoes" USING btree ("tipo_conexao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_caso_id_idx" ON "palacio_diagramas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_tipo_idx" ON "palacio_diagramas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_status_idx" ON "palacio_diagramas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_criado_por_idx" ON "palacio_diagramas" USING btree ("criado_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_workspace_id_idx" ON "palacio_diagramas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_deleted_at_idx" ON "palacio_diagramas" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_diagrama_id_idx" ON "palacio_elementos" USING btree ("diagrama_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_tipo_vinculo_idx" ON "palacio_elementos" USING btree ("tipo_vinculo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_persona_id_idx" ON "palacio_elementos" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_fato_id_idx" ON "palacio_elementos" USING btree ("fato_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_documento_id_idx" ON "palacio_elementos" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_categoria_idx" ON "simulacao_assets" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_subcategoria_idx" ON "simulacao_assets" USING btree ("subcategoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_publico_idx" ON "simulacao_assets" USING btree ("publico");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_workspace_id_idx" ON "simulacao_assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_exportacoes_versao_id_idx" ON "simulacao_exportacoes" USING btree ("versao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_exportacoes_status_idx" ON "simulacao_exportacoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_versao_id_idx" ON "simulacao_keyframes" USING btree ("versao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_personagem_id_idx" ON "simulacao_keyframes" USING btree ("personagem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_objeto_id_idx" ON "simulacao_keyframes" USING btree ("objeto_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_tempo_idx" ON "simulacao_keyframes" USING btree ("tempo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_objetos_simulacao_id_idx" ON "simulacao_objetos" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_objetos_tipo_idx" ON "simulacao_objetos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_simulacao_id_idx" ON "simulacao_personagens" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_persona_id_idx" ON "simulacao_personagens" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_papel_idx" ON "simulacao_personagens" USING btree ("papel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_versoes_simulacao_id_idx" ON "simulacao_versoes" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_versoes_tipo_idx" ON "simulacao_versoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_caso_id_idx" ON "simulacoes_3d" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_status_idx" ON "simulacoes_3d" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_criado_por_idx" ON "simulacoes_3d" USING btree ("criado_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_workspace_id_idx" ON "simulacoes_3d" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_deleted_at_idx" ON "simulacoes_3d" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_atribuicao_primaria_idx" ON "assistidos" USING btree ("atribuicao_primaria");