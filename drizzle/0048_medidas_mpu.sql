-- drizzle/0048_medidas_mpu.sql
CREATE TABLE IF NOT EXISTS "medidas_mpu" (
  "id" serial PRIMARY KEY NOT NULL,
  "processo_vvd_id" integer NOT NULL REFERENCES "processos_vvd"("id") ON DELETE CASCADE,
  "codigo" varchar(40) NOT NULL,
  "artigo" varchar(20),
  "distancia_metros" integer,
  "parametros" jsonb,
  "literal" text,
  "data_decisao" date,
  "data_vencimento" date,
  "status" varchar(20) DEFAULT 'ativa',
  "origem" varchar(20) DEFAULT 'parser',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "medidas_mpu_processo_vvd_id_idx" ON "medidas_mpu" ("processo_vvd_id");
CREATE INDEX IF NOT EXISTS "medidas_mpu_status_idx" ON "medidas_mpu" ("status");
