/**
 * Aplica a migração demanda_eventos + atendimento_demandas direto via pg.
 * Bypass drizzle-kit push (que requer TTY interativo).
 * Idempotente: usa CREATE IF NOT EXISTS e blocos EXCEPTION.
 *
 * Uso: npx tsx scripts/apply-demanda-eventos-migration.ts
 */
import * as dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const SQL = `
DO $$ BEGIN
  CREATE TYPE "public"."demanda_evento_tipo" AS ENUM('atendimento','diligencia','observacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "atendimento_demandas" (
  "atendimento_id" integer NOT NULL,
  "demanda_id"     integer NOT NULL,
  "created_at"     timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "atendimento_demandas_atendimento_id_demanda_id_pk"
    PRIMARY KEY("atendimento_id","demanda_id")
);

CREATE TABLE IF NOT EXISTS "demanda_eventos" (
  "id"              serial PRIMARY KEY NOT NULL,
  "demanda_id"      integer NOT NULL,
  "tipo"            "demanda_evento_tipo" NOT NULL,
  "subtipo"         varchar(30),
  "status"          varchar(20),
  "resumo"          varchar(140) NOT NULL,
  "descricao"       text,
  "prazo"           date,
  "responsavel_id"  integer,
  "atendimento_id"  integer,
  "autor_id"        integer NOT NULL,
  "data_conclusao"  timestamp,
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL,
  "deleted_at"      timestamp,
  CONSTRAINT "demanda_eventos_diligencia_only" CHECK (
    "tipo" = 'diligencia' OR ("subtipo" IS NULL AND "status" IS NULL AND "prazo" IS NULL)
  ),
  CONSTRAINT "demanda_eventos_atendimento_only" CHECK (
    "tipo" = 'atendimento' OR "atendimento_id" IS NULL
  )
);

DO $$ BEGIN
  ALTER TABLE "atendimento_demandas"
    ADD CONSTRAINT "atendimento_demandas_atendimento_id_atendimentos_id_fk"
    FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "atendimento_demandas"
    ADD CONSTRAINT "atendimento_demandas_demanda_id_demandas_id_fk"
    FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "demanda_eventos"
    ADD CONSTRAINT "demanda_eventos_demanda_id_demandas_id_fk"
    FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "demanda_eventos"
    ADD CONSTRAINT "demanda_eventos_responsavel_id_users_id_fk"
    FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "demanda_eventos"
    ADD CONSTRAINT "demanda_eventos_atendimento_id_atendimentos_id_fk"
    FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "demanda_eventos"
    ADD CONSTRAINT "demanda_eventos_autor_id_users_id_fk"
    FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "atendimento_demandas_demanda_idx"
  ON "atendimento_demandas" USING btree ("demanda_id");

CREATE INDEX IF NOT EXISTS "demanda_eventos_demanda_created_idx"
  ON "demanda_eventos" USING btree ("demanda_id","created_at" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "demanda_eventos_pendentes_idx"
  ON "demanda_eventos" USING btree ("demanda_id","tipo","status");

CREATE INDEX IF NOT EXISTS "demanda_eventos_autor_idx"
  ON "demanda_eventos" USING btree ("autor_id","created_at" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "demanda_eventos_prazo_idx"
  ON "demanda_eventos" USING btree ("prazo");

CREATE INDEX IF NOT EXISTS "demanda_eventos_atendimento_idx"
  ON "demanda_eventos" USING btree ("atendimento_id");

CREATE INDEX IF NOT EXISTS "demanda_eventos_deleted_idx"
  ON "demanda_eventos" USING btree ("deleted_at");

-- Realtime publication: garante que `demanda_eventos` seja transmitida
-- pelo Supabase Realtime. Idempotente. Em DBs locais sem a publication
-- (ex.: Postgres puro), o EXCEPTION evita falhar a migração.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'demanda_eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_eventos;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Aplicando migração demanda_eventos...");
    await client.query(SQL);
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('demanda_eventos','atendimento_demandas')
      ORDER BY table_name;
    `);
    console.log("Tabelas presentes:", res.rows.map(r => r.table_name));
    const enumRes = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='demanda_evento_tipo')
      ORDER BY enumsortorder;
    `);
    console.log("Enum values:", enumRes.rows.map(r => r.enumlabel));
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
