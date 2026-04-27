DROP MATERIALIZED VIEW IF EXISTS lugares_intel_signals;

CREATE MATERIALIZED VIEW lugares_intel_signals AS
SELECT
  l.id AS lugar_id,
  l.workspace_id,
  l.bairro,
  COALESCE(COUNT(DISTINCT pl.processo_id) FILTER (WHERE pl.processo_id IS NOT NULL), 0)::int AS total_processos,
  COALESCE(COUNT(DISTINCT pl.processo_id) FILTER (
    WHERE pl.processo_id IS NOT NULL AND pl.created_at >= now() - INTERVAL '12 months'
  ), 0)::int AS recentes_12m,
  COALESCE(COUNT(*) FILTER (WHERE pl.tipo IS NOT NULL), 0)::int AS total_participacoes,
  -- Bairro recorrente: total de participações no mesmo bairro (cross-lugares)
  CASE WHEN l.bairro IS NOT NULL THEN (
    SELECT COUNT(*)::int FROM participacoes_lugar pl2
    JOIN lugares l2 ON l2.id = pl2.lugar_id
    WHERE LOWER(l2.bairro) = LOWER(l.bairro)
      AND l2.workspace_id = l.workspace_id
      AND pl2.created_at >= now() - INTERVAL '12 months'
  ) ELSE 0 END AS bairro_total_12m
FROM lugares l
LEFT JOIN participacoes_lugar pl ON pl.lugar_id = l.id
WHERE l.merged_into IS NULL
GROUP BY l.id, l.workspace_id, l.bairro;

CREATE UNIQUE INDEX lugares_intel_signals_pk ON lugares_intel_signals(lugar_id);
CREATE INDEX lugares_intel_signals_workspace ON lugares_intel_signals(workspace_id);
CREATE INDEX lugares_intel_signals_bairro ON lugares_intel_signals(bairro) WHERE bairro IS NOT NULL;

CREATE OR REPLACE FUNCTION refresh_lugares_intel_signals()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY lugares_intel_signals;
END;
$$ LANGUAGE plpgsql;
