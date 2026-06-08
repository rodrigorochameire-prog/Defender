-- drizzle/0049_delegacao_backfill.sql
-- Demandas já delegadas (apareciam como "Delegada a X") → estado "delegado".
UPDATE demandas
SET status_delegacao = 'delegado'
WHERE delegado_para_id IS NOT NULL
  AND (status_delegacao IS NULL OR status_delegacao NOT IN ('a_delegar', 'delegado'));
