-- Materialized view pre-computing intelligence signals per pessoa
DROP MATERIALIZED VIEW IF EXISTS pessoas_intel_signals;

CREATE MATERIALIZED VIEW pessoas_intel_signals AS
SELECT
  p.id AS pessoa_id,
  p.workspace_id,
  COALESCE(COUNT(DISTINCT pp.processo_id), 0)::int AS total_casos,
  COALESCE(COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '6 months'
  ), 0)::int AS casos_recentes_6m,
  COALESCE(COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '12 months'
  ), 0)::int AS casos_recentes_12m,
  COALESCE(jsonb_object_agg(pp.papel, pp_count)
    FILTER (WHERE pp.papel IS NOT NULL), '{}'::jsonb) AS papeis_count,
  (
    SELECT pp2.papel
    FROM participacoes_processo pp2
    WHERE pp2.pessoa_id = p.id
    GROUP BY pp2.papel
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS papel_primario,
  COALESCE(COUNT(*) FILTER (WHERE pp.lado = 'acusacao'), 0)::int AS lado_acusacao,
  COALESCE(COUNT(*) FILTER (WHERE pp.lado = 'defesa'), 0)::int AS lado_defesa,
  MAX(pp.created_at) AS last_seen_at,
  MIN(pp.created_at) AS first_seen_at,
  EXISTS(
    SELECT 1 FROM pessoas p2
    WHERE p2.id != p.id
      AND p2.nome_normalizado = p.nome_normalizado
      AND p2.merged_into IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pessoas_distincts_confirmed pdc
        WHERE (pdc.pessoa_a_id = LEAST(p.id, p2.id) AND pdc.pessoa_b_id = GREATEST(p.id, p2.id))
      )
  ) AS ambiguity_flag,
  0::int AS contradicoes_conhecidas,
  0::int AS consistencias_detectadas,
  false AS high_value_flag
FROM pessoas p
LEFT JOIN LATERAL (
  SELECT papel, COUNT(*)::int AS pp_count
  FROM participacoes_processo
  WHERE pessoa_id = p.id
  GROUP BY papel
) AS papel_agg ON true
LEFT JOIN participacoes_processo pp ON pp.pessoa_id = p.id
WHERE p.merged_into IS NULL
GROUP BY p.id, p.workspace_id;

CREATE UNIQUE INDEX pessoas_intel_signals_pk ON pessoas_intel_signals(pessoa_id);
CREATE INDEX pessoas_intel_signals_workspace ON pessoas_intel_signals(workspace_id);
CREATE INDEX pessoas_intel_signals_papel_primario ON pessoas_intel_signals(papel_primario);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_pessoas_intel_signals()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY pessoas_intel_signals;
END;
$$ LANGUAGE plpgsql;
