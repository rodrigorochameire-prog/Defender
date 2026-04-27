-- Cowork Encaminhamentos — Fase 1 (backend)
-- Criado manualmente (drizzle-kit generate está bloqueado por schema drift em outras tabelas).
-- Reflete exatamente o schema em src/lib/db/schema/cowork.ts (commit 59c9337e).

CREATE TABLE IF NOT EXISTS "encaminhamentos" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "remetente_id" integer NOT NULL REFERENCES "users"("id"),
  "tipo" varchar(20) NOT NULL,
  "titulo" varchar(200),
  "mensagem" text NOT NULL,
  "demanda_id" integer REFERENCES "demandas"("id"),
  "processo_id" integer REFERENCES "processos"("id"),
  "assistido_id" integer REFERENCES "assistidos"("id"),
  "status" varchar(20) NOT NULL DEFAULT 'pendente',
  "urgencia" varchar(10) NOT NULL DEFAULT 'normal',
  "notificar_ombuds" boolean NOT NULL DEFAULT true,
  "notificar_whatsapp" boolean NOT NULL DEFAULT false,
  "notificar_email" boolean NOT NULL DEFAULT false,
  "concluido_em" timestamp,
  "concluido_por_id" integer REFERENCES "users"("id"),
  "motivo_recusa" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "enc_workspace_idx" ON "encaminhamentos" ("workspace_id");
CREATE INDEX IF NOT EXISTS "enc_remetente_idx" ON "encaminhamentos" ("remetente_id");
CREATE INDEX IF NOT EXISTS "enc_demanda_idx" ON "encaminhamentos" ("demanda_id");
CREATE INDEX IF NOT EXISTS "enc_status_idx" ON "encaminhamentos" ("status");
CREATE INDEX IF NOT EXISTS "enc_created_idx" ON "encaminhamentos" ("created_at");

CREATE TABLE IF NOT EXISTS "encaminhamento_destinatarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "encaminhamento_id" integer NOT NULL REFERENCES "encaminhamentos"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "estado_pessoal" varchar(20) NOT NULL DEFAULT 'pendente',
  "lido_em" timestamp,
  "ciente_em" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "enc_dest_unique" ON "encaminhamento_destinatarios" ("encaminhamento_id", "user_id");
CREATE INDEX IF NOT EXISTS "enc_dest_user_idx" ON "encaminhamento_destinatarios" ("user_id");

CREATE TABLE IF NOT EXISTS "encaminhamento_respostas" (
  "id" serial PRIMARY KEY NOT NULL,
  "encaminhamento_id" integer NOT NULL REFERENCES "encaminhamentos"("id") ON DELETE CASCADE,
  "autor_id" integer NOT NULL REFERENCES "users"("id"),
  "mensagem" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "enc_resp_enc_idx" ON "encaminhamento_respostas" ("encaminhamento_id");

CREATE TABLE IF NOT EXISTS "encaminhamento_anexos" (
  "id" serial PRIMARY KEY NOT NULL,
  "encaminhamento_id" integer REFERENCES "encaminhamentos"("id") ON DELETE CASCADE,
  "resposta_id" integer REFERENCES "encaminhamento_respostas"("id") ON DELETE CASCADE,
  "tipo" varchar(20) NOT NULL,
  "drive_file_id" varchar(80),
  "storage_url" text,
  "nome" varchar(200),
  "size_bytes" integer,
  "duracao_seg" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "demandas_acompanhantes" (
  "id" serial PRIMARY KEY NOT NULL,
  "demanda_id" integer NOT NULL REFERENCES "demandas"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "origem_encaminhamento_id" integer REFERENCES "encaminhamentos"("id") ON DELETE SET NULL,
  "notificar_alteracoes" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "dem_acomp_unique" ON "demandas_acompanhantes" ("demanda_id", "user_id");
CREATE INDEX IF NOT EXISTS "dem_acomp_user_idx" ON "demandas_acompanhantes" ("user_id");
