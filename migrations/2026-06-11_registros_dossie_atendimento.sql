-- Dossiê de atendimento (preparar-atendimentos) — registros tipo='atendimento'
-- Aplicada em 2026-06-11 via script direto (lock_timeout 5s).

BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE registros ADD COLUMN IF NOT EXISTS dossie_atendimento jsonb;
COMMIT;
