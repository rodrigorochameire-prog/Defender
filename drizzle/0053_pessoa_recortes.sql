-- Recortes de imagem do PDF vinculados a pessoa + papel no processo.
SET lock_timeout = '10s';
CREATE TABLE IF NOT EXISTS "pessoa_recortes" (
  "id" serial PRIMARY KEY NOT NULL,
  "pessoa_id" integer NOT NULL REFERENCES "pessoas"("id") ON DELETE cascade,
  "processo_id" integer REFERENCES "processos"("id") ON DELETE set null,
  "drive_file_id" integer,
  "papel" varchar(30),
  "rotulo" text,
  "imagem" text NOT NULL,
  "pagina" integer,
  "posicao" jsonb,
  "criado_por" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "pessoa_recortes_pessoa_idx" ON "pessoa_recortes" ("pessoa_id");
CREATE INDEX IF NOT EXISTS "pessoa_recortes_processo_idx" ON "pessoa_recortes" ("processo_id");
