-- Backfill demandas.providencias -> registros (tipo='providencia')
-- Plan: docs/superpowers/plans/2026-04-29-registros-tipados.md (Task 1, Step 1.3)

BEGIN;

INSERT INTO registros (
  assistido_id, processo_id, demanda_id, tipo, conteudo,
  data_registro, autor_id, status, interlocutor,
  created_at, updated_at
)
SELECT
  d.assistido_id,
  d.processo_id,
  d.id AS demanda_id,
  'providencia' AS tipo,
  d.providencias AS conteudo,
  COALESCE(d.updated_at, d.created_at) AS data_registro,
  d.defensor_id AS autor_id,
  'realizado' AS status,
  'assistido' AS interlocutor,
  NOW() AS created_at,
  NOW() AS updated_at
FROM demandas d
WHERE d.providencias IS NOT NULL
  AND length(trim(d.providencias)) > 0
  AND d.deleted_at IS NULL;

COMMIT;
