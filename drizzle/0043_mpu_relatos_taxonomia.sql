-- 0043_mpu_relatos_taxonomia.sql
-- Cria tabelas mpu_relatos (1:1 com processos) e mpu_taxonomia (vocabulário emergente)
-- Plano 1 da reforma MPU.

CREATE TABLE IF NOT EXISTS "mpu_relatos" (
  "id" serial PRIMARY KEY,
  "processo_id" integer NOT NULL REFERENCES "processos"("id") ON DELETE CASCADE,
  "relato_texto" text,
  "tipos_violencia" text[],
  "relacao" varchar(30),
  "gatilhos" text[],
  "provas_mencionadas" text[],
  "gravidade" varchar(10),
  "extraido_em" timestamp DEFAULT now() NOT NULL,
  "extracao_modelo" varchar(40),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "mpu_relatos_processo_id_uniq" ON "mpu_relatos" ("processo_id");
CREATE INDEX IF NOT EXISTS "mpu_relatos_relacao_idx" ON "mpu_relatos" ("relacao");
CREATE INDEX IF NOT EXISTS "mpu_relatos_gravidade_idx" ON "mpu_relatos" ("gravidade");

CREATE TABLE IF NOT EXISTS "mpu_taxonomia" (
  "id" serial PRIMARY KEY,
  "categoria" varchar(20) NOT NULL,
  "termo" varchar(60) NOT NULL,
  "contagem" integer DEFAULT 0 NOT NULL,
  "primeiro_visto_em" timestamp DEFAULT now() NOT NULL,
  "ultimo_visto_em" timestamp DEFAULT now() NOT NULL,
  "aprovado" boolean DEFAULT false NOT NULL,
  "variantes" text[],
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "mpu_taxonomia_categoria_termo_uniq" ON "mpu_taxonomia" ("categoria", "termo");
CREATE INDEX IF NOT EXISTS "mpu_taxonomia_categoria_idx" ON "mpu_taxonomia" ("categoria");
CREATE INDEX IF NOT EXISTS "mpu_taxonomia_aprovado_idx" ON "mpu_taxonomia" ("aprovado");
