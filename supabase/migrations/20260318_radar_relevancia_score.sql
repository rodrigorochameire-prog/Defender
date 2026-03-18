-- Adicionar score de relevância às notícias do radar
ALTER TABLE radar_noticias
  ADD COLUMN IF NOT EXISTS relevancia_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_radar_noticias_relevancia
  ON radar_noticias (relevancia_score);
