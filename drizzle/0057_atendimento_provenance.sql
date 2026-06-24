-- Proveniência: ofício / diligência / anotação originados de um atendimento (registros).
-- Aplicado via ALTER direto (padrão do projeto — snapshot drizzle tem drift conhecido).
-- Idempotente: seguro reexecutar.

ALTER TABLE "documentos_gerados" ADD COLUMN IF NOT EXISTS "registro_id" integer;
ALTER TABLE "diligencias" ADD COLUMN IF NOT EXISTS "registro_id" integer;
ALTER TABLE "anotacoes" ADD COLUMN IF NOT EXISTS "registro_id" integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documentos_gerados_registro_id_registros_id_fk') THEN
    ALTER TABLE "documentos_gerados"
      ADD CONSTRAINT "documentos_gerados_registro_id_registros_id_fk"
      FOREIGN KEY ("registro_id") REFERENCES "registros"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diligencias_registro_id_registros_id_fk') THEN
    ALTER TABLE "diligencias"
      ADD CONSTRAINT "diligencias_registro_id_registros_id_fk"
      FOREIGN KEY ("registro_id") REFERENCES "registros"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anotacoes_registro_id_registros_id_fk') THEN
    ALTER TABLE "anotacoes"
      ADD CONSTRAINT "anotacoes_registro_id_registros_id_fk"
      FOREIGN KEY ("registro_id") REFERENCES "registros"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documentos_gerados_registro_id_idx" ON "documentos_gerados" ("registro_id");
CREATE INDEX IF NOT EXISTS "diligencias_registro_id_idx" ON "diligencias" ("registro_id");
CREATE INDEX IF NOT EXISTS "anotacoes_registro_id_idx" ON "anotacoes" ("registro_id");
