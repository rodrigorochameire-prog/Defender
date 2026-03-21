-- Adiciona coluna municipio em radar_noticias para suporte multi-escopo
-- Valores: 'camacari' | 'rms' | 'salvador'
ALTER TABLE radar_noticias
ADD COLUMN IF NOT EXISTS municipio TEXT NOT NULL DEFAULT 'camacari';

CREATE INDEX IF NOT EXISTS radar_noticias_municipio_idx
ON radar_noticias(municipio);

-- Composto para feed filtrado por município + status
CREATE INDEX IF NOT EXISTS radar_noticias_municipio_status_idx
ON radar_noticias(municipio, enrichment_status, data_publicacao DESC);

-- Tentar detectar município pelos artigos já existentes
UPDATE radar_noticias SET municipio = 'salvador'
WHERE municipio = 'camacari'
AND (
  titulo ILIKE '%salvador%'
  OR titulo ILIKE '%bonfim%'
  OR titulo ILIKE '%liberdade%'
  OR titulo ILIKE '%cajazeiras%'
  OR titulo ILIKE '%brotas%'
  OR titulo ILIKE '%itapuã%'
  OR titulo ILIKE '%pituba%'
  OR titulo ILIKE '%barra%salvador%'
);

UPDATE radar_noticias SET municipio = 'rms'
WHERE municipio = 'camacari'
AND (
  titulo ILIKE '%simões filho%'
  OR titulo ILIKE '%lauro de freitas%'
  OR titulo ILIKE '%madre de deus%'
);

COMMENT ON COLUMN radar_noticias.municipio IS 'Escopo geográfico: camacari | rms | salvador';
