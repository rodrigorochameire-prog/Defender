-- Reverse Sync: Drive → Assistido
-- Campos para rastreabilidade de origem e detecção de duplicatas

ALTER TABLE assistidos
  ADD COLUMN IF NOT EXISTS origem_cadastro VARCHAR(20) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS duplicata_sugerida JSONB;

-- Índice para filtrar pendentes de revisão
CREATE INDEX IF NOT EXISTS assistidos_origem_cadastro_idx ON assistidos (origem_cadastro);
CREATE INDEX IF NOT EXISTS assistidos_duplicata_sugerida_idx ON assistidos ((duplicata_sugerida IS NOT NULL)) WHERE duplicata_sugerida IS NOT NULL;
