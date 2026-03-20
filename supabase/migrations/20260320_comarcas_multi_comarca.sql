-- supabase/migrations/20260320_comarcas_multi_comarca.sql
-- =============================================
-- MULTI-COMARCA: tabela comarcas + comarcaId em users/assistidos/processos
-- Migração aditiva — Camaçari não pode quebrar.
-- =============================================

BEGIN;

-- 1. Criar tabela comarcas
CREATE TABLE IF NOT EXISTS comarcas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  regional VARCHAR(50),
  regiao_metro VARCHAR(50),
  uf VARCHAR(2) NOT NULL DEFAULT 'BA',
  ativo BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comarcas_regiao_metro_idx ON comarcas(regiao_metro);
CREATE INDEX IF NOT EXISTS comarcas_ativo_idx ON comarcas(ativo);

-- 2. Seed: Camaçari (id=1) com todas as features habilitadas
INSERT INTO comarcas (nome, regional, regiao_metro, features) VALUES
  ('Camaçari',               '7ª Regional', 'RMS', '{"drive":true,"whatsapp":true,"enrichment":true,"calendar_sync":true}'),
  ('Salvador',               '1ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Lauro de Freitas',       '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Simões Filho',           '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Dias d''Ávila',          '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Candeias',               '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Francisco do Conde', '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Madre de Deus',          '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Sebastião do Passé', '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}')
ON CONFLICT (nome) DO NOTHING;

-- 3. Adicionar comarcaId em users (nullable → popular → default 1=Camaçari)
ALTER TABLE users ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1;
UPDATE users SET comarca_id = 1 WHERE comarca_id IS NULL;
CREATE INDEX IF NOT EXISTS users_comarca_id_idx ON users(comarca_id);

-- 4. Adicionar comarcaId em assistidos (nullable → popular → default 1=Camaçari)
ALTER TABLE assistidos ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1;
UPDATE assistidos SET comarca_id = 1 WHERE comarca_id IS NULL;
CREATE INDEX IF NOT EXISTS assistidos_comarca_id_idx ON assistidos(comarca_id);

-- 5. Adicionar comarcaId em processos (o campo comarca varchar já existe, mantemos ele)
ALTER TABLE processos ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1;
-- Popular: usar o campo comarca varchar existente como guia
UPDATE processos SET comarca_id = c.id
  FROM comarcas c WHERE lower(processos.comarca) = lower(c.nome) AND processos.comarca_id IS NULL;
-- Processos sem match → Camaçari
UPDATE processos SET comarca_id = 1 WHERE comarca_id IS NULL;
CREATE INDEX IF NOT EXISTS processos_comarca_id_idx ON processos(comarca_id);

-- 6. RLS: service_role full access em comarcas
ALTER TABLE comarcas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON comarcas;
CREATE POLICY "service_role_full_access" ON comarcas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_full_access" ON comarcas;
CREATE POLICY "postgres_full_access" ON comarcas FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Enforce NOT NULL after backfill (comarca_id=1 Camaçari for all existing rows)
ALTER TABLE users ALTER COLUMN comarca_id SET NOT NULL;
ALTER TABLE assistidos ALTER COLUMN comarca_id SET NOT NULL;
ALTER TABLE processos ALTER COLUMN comarca_id SET NOT NULL;

COMMIT;
