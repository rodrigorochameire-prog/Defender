-- Processo referência de um caso (default false, user marca manualmente no Nível 3)
ALTER TABLE processos ADD COLUMN IF NOT EXISTS is_referencia boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS processos_caso_referencia_idx ON processos(caso_id) WHERE is_referencia = true;
