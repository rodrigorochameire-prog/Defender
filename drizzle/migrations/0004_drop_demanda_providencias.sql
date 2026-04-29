-- Drop legacy free-text providencias columns from demandas.
-- Data was already migrated to registros (tipo='providencia') in migration 0003.

BEGIN;

ALTER TABLE demandas DROP COLUMN IF EXISTS providencias;
ALTER TABLE demandas DROP COLUMN IF EXISTS providencia_resumo;

COMMIT;
