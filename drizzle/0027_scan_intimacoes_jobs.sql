CREATE TABLE IF NOT EXISTS "scan_intimacoes_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "numero_processo" varchar(30) NOT NULL,
  "assistido_nome" varchar(200) NOT NULL,
  "atribuicao" varchar(50) NOT NULL,
  "id_documento" varchar(30),
  "drive_base_path" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
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

CREATE INDEX IF NOT EXISTS "scan_jobs_status_idx" ON "scan_intimacoes_jobs" ("status");
CREATE INDEX IF NOT EXISTS "scan_jobs_batch_idx" ON "scan_intimacoes_jobs" ("batch_id");
