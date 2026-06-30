-- supabase/migrations/20260630_testemunhas_pins_timestamps.sql
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction.
-- Supabase applies each migration file outside a transaction by default.

ALTER TYPE tipo_testemunha ADD VALUE IF NOT EXISTS 'INTERROGANDO';

ALTER TABLE testemunhas
  ADD COLUMN IF NOT EXISTS termo_delegacia_drive_file_id varchar(100),
  ADD COLUMN IF NOT EXISTS termo_delegacia_pagina integer,
  ADD COLUMN IF NOT EXISTS depoimento_timestamp_inicio_s integer,
  ADD COLUMN IF NOT EXISTS depoimento_timestamp_fim_s integer,
  ADD COLUMN IF NOT EXISTS pinos jsonb NOT NULL DEFAULT '[]'::jsonb;
