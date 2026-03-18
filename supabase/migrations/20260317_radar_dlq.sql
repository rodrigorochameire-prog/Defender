-- ============================================================
-- Radar Criminal — Dead-Letter Queue (DLQ)
-- Adiciona colunas de controle de erros e novos status ao enum
-- ============================================================

-- 1. Adicionar colunas DLQ à tabela radar_noticias
ALTER TABLE radar_noticias
  ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error  text;

-- 2. Adicionar novos valores ao enum radar_enrichment_status
--    (ALTER TYPE ... ADD VALUE é idempotente no PostgreSQL 9.6+
--     mas não suporta IF NOT EXISTS — usar bloco DO para segurança)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'radar_enrichment_status'::regtype
      AND enumlabel = 'failed'
  ) THEN
    ALTER TYPE radar_enrichment_status ADD VALUE 'failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'radar_enrichment_status'::regtype
      AND enumlabel = 'duplicate'
  ) THEN
    ALTER TYPE radar_enrichment_status ADD VALUE 'duplicate';
  END IF;
END;
$$;

-- 3. Índice para facilitar queries de DLQ (buscar failed rapidamente)
CREATE INDEX IF NOT EXISTS radar_noticias_error_count_idx
  ON radar_noticias (error_count)
  WHERE error_count > 0;
