-- KPIs inteligentes (Fase 1.5) — estende vw_kpi_summary com métricas de
-- eficiência/velocidade/saúde do backlog, e adiciona vw_kpi_backlog_aging.
-- Todas as métricas derivam de colunas que já existem em demandas.
-- Aplicado manualmente via psycopg2.

-- ==========================================================================
-- vw_kpi_summary — extendida com 6 campos novos
-- DROP primeiro: CREATE OR REPLACE falha quando a assinatura de colunas muda
-- ==========================================================================
DROP VIEW IF EXISTS vw_kpi_summary;
CREATE VIEW vw_kpi_summary AS
SELECT
  d.defensor_id,
  u.comarca_id,

  -- Totais base
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.status != 'CONCLUIDO') AS ativas,
  COUNT(*) FILTER (WHERE d.status = 'CONCLUIDO') AS concluidas,

  -- Urgência temporal
  COUNT(*) FILTER (
    WHERE d.status != 'CONCLUIDO'
      AND d.prazo IS NOT NULL
      AND d.prazo < current_date
  ) AS vencidas,
  COUNT(*) FILTER (
    WHERE d.status != 'CONCLUIDO'
      AND d.prazo IS NOT NULL
      AND d.prazo BETWEEN current_date AND current_date + INTERVAL '3 days'
  ) AS urgentes,

  -- HOJE — o que precisa ser olhado agora
  COUNT(*) FILTER (
    WHERE d.status != 'CONCLUIDO' AND d.prazo = current_date
  ) AS vencem_hoje,
  COUNT(*) FILTER (
    WHERE d.created_at::date = current_date
  ) AS criadas_hoje,

  -- Réu preso
  COUNT(*) FILTER (
    WHERE d.reu_preso = true AND d.status != 'CONCLUIDO'
  ) AS reu_preso_ativas,

  -- Mensal
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.updated_at > date_trunc('month', current_date)
  ) AS concluidas_mes,

  -- SLA: concluídas no prazo (numerador) / concluídas com prazo (denominador)
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.prazo IS NOT NULL
      AND d.data_conclusao IS NOT NULL
      AND d.data_conclusao <= d.prazo
  ) AS concluidas_no_prazo,
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.prazo IS NOT NULL
      AND d.data_conclusao IS NOT NULL
  ) AS concluidas_com_prazo,

  -- Velocidade: últimos 7 dias vs 7-14 dias atrás (usa updated_at como proxy de conclusão)
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.updated_at >= current_date - INTERVAL '7 days'
  ) AS concluidas_7d,
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.updated_at >= current_date - INTERVAL '14 days'
      AND d.updated_at < current_date - INTERVAL '7 days'
  ) AS concluidas_7d_anterior,

  -- Tempo médio de resposta (dias) — apenas concluídas que têm created_at e data_conclusao
  COALESCE(
    AVG(
      EXTRACT(EPOCH FROM (d.data_conclusao::timestamp - d.created_at))/86400
    ) FILTER (
      WHERE d.status = 'CONCLUIDO'
        AND d.data_conclusao IS NOT NULL
    ),
    0
  )::real AS tempo_medio_resposta_dias,

  -- Encalhadas: ativas sem atualização há > 15 dias (gargalo silencioso)
  COUNT(*) FILTER (
    WHERE d.status != 'CONCLUIDO'
      AND d.updated_at < current_date - INTERVAL '15 days'
  ) AS encalhadas

FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
GROUP BY d.defensor_id, u.comarca_id;

-- ==========================================================================
-- vw_kpi_backlog_aging — idade do backlog em buckets
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_backlog_aging AS
SELECT
  d.defensor_id,
  u.comarca_id,
  CASE
    WHEN (current_date - d.created_at::date) <= 7 THEN 'a_0_7'
    WHEN (current_date - d.created_at::date) <= 15 THEN 'b_7_15'
    WHEN (current_date - d.created_at::date) <= 30 THEN 'c_15_30'
    WHEN (current_date - d.created_at::date) <= 60 THEN 'd_30_60'
    ELSE 'e_60_plus'
  END AS bucket,
  COUNT(*) AS total
FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.status != 'CONCLUIDO'
GROUP BY d.defensor_id, u.comarca_id,
  CASE
    WHEN (current_date - d.created_at::date) <= 7 THEN 'a_0_7'
    WHEN (current_date - d.created_at::date) <= 15 THEN 'b_7_15'
    WHEN (current_date - d.created_at::date) <= 30 THEN 'c_15_30'
    WHEN (current_date - d.created_at::date) <= 60 THEN 'd_30_60'
    ELSE 'e_60_plus'
  END;

GRANT SELECT ON vw_kpi_summary, vw_kpi_backlog_aging
TO authenticated, anon, service_role;
