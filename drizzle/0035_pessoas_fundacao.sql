CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
  "confidence" numeric(3,2) DEFAULT 1.0 NOT NULL,
  "merged_into" integer,
  "merge_reason" text,
  "merged_at" timestamp,
  "merged_by" integer,
  "workspace_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);

CREATE INDEX IF NOT EXISTS "pessoas_nome_norm_idx" ON "pessoas"("nome_normalizado");
CREATE INDEX IF NOT EXISTS "pessoas_nome_trgm_idx" ON "pessoas" USING gin("nome_normalizado" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "pessoas_merged_idx" ON "pessoas"("merged_into") WHERE "merged_into" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "pessoas_categoria_idx" ON "pessoas"("categoria_primaria");
CREATE INDEX IF NOT EXISTS "pessoas_workspace_idx" ON "pessoas"("workspace_id");

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_criado_por_users_id_fk"
    FOREIGN KEY ("criado_por") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_by_users_id_fk"
    FOREIGN KEY ("merged_by") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_into_pessoas_id_fk"
    FOREIGN KEY ("merged_into") REFERENCES "pessoas"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
  "confidence" numeric(3,2) DEFAULT 1.0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "participacoes_unique_pessoa_processo_papel"
  ON "participacoes_processo"("pessoa_id", "processo_id", "papel");
CREATE INDEX IF NOT EXISTS "participacoes_pessoa_idx" ON "participacoes_processo"("pessoa_id");
CREATE INDEX IF NOT EXISTS "participacoes_processo_idx" ON "participacoes_processo"("processo_id");
CREATE INDEX IF NOT EXISTS "participacoes_papel_idx" ON "participacoes_processo"("papel");
CREATE INDEX IF NOT EXISTS "participacoes_testemunha_idx" ON "participacoes_processo"("testemunha_id");

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_pessoa_id_fk"
    FOREIGN KEY ("pessoa_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_id_fk"
    FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_testemunha_id_fk"
    FOREIGN KEY ("testemunha_id") REFERENCES "testemunhas"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pessoas_distincts_confirmed" (
  "pessoa_a_id" integer NOT NULL,
  "pessoa_b_id" integer NOT NULL,
  "confirmado_por" integer,
  "confirmado_em" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pessoas_distincts_pk" PRIMARY KEY ("pessoa_a_id", "pessoa_b_id")
);

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_a_fk"
    FOREIGN KEY ("pessoa_a_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_b_fk"
    FOREIGN KEY ("pessoa_b_id") REFERENCES "pessoas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmado_por_fk"
    FOREIGN KEY ("confirmado_por") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
