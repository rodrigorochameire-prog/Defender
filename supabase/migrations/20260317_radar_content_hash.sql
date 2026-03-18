-- Adicionar coluna de hash de conteúdo para deduplicação
ALTER TABLE radar_noticias
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE INDEX IF NOT EXISTS idx_radar_noticias_content_hash
  ON radar_noticias(content_hash)
  WHERE content_hash IS NOT NULL;
