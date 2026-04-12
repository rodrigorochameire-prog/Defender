-- KPI views for /admin/dashboard/kpis (Fase 1 do TDD analytics-ml-foundation)
-- Views normais (não materializadas) — escala atual (~250 demandas) executa em <50ms.
-- Promover a MATERIALIZED VIEW se o volume crescer > 10k rows.
-- Aplicado manualmente via psql (não vai no _journal.json do drizzle).

-- ==========================================================================
-- 1. Throughput — demandas criadas/concluídas por semana (últimas 12 semanas)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_throughput AS
SELECT
  d.defensor_id,
  u.comarca_id,
  date_trunc('week', d.created_at)::date AS semana,
  COUNT(*) AS criadas,
  COUNT(*) FILTER (WHERE d.status = 'CONCLUIDO') AS concluidas
FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.created_at > now() - INTERVAL '12 weeks'
GROUP BY d.defensor_id, u.comarca_id, date_trunc('week', d.created_at);

-- ==========================================================================
-- 2. Backlog — contagem por atribuição × status
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_backlog AS
SELECT
  d.defensor_id,
  u.comarca_id,
  COALESCE(p.atribuicao::text, 'SEM_PROCESSO') AS atribuicao,
  d.status::text AS status,
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE d.prazo IS NOT NULL
      AND d.prazo < (now() + INTERVAL '3 days')::date
      AND d.status != 'CONCLUIDO'
  ) AS urgentes
FROM demandas d
LEFT JOIN processos p ON p.id = d.processo_id
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
GROUP BY d.defensor_id, u.comarca_id, COALESCE(p.atribuicao::text, 'SEM_PROCESSO'), d.status;

-- ==========================================================================
-- 3. Prazos — distribuição em buckets (vencido/urgente/próximo/médio/longo)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_prazos AS
SELECT
  d.defensor_id,
  u.comarca_id,
  CASE
    WHEN d.prazo < current_date THEN 'vencido'
    WHEN d.prazo <= current_date + INTERVAL '3 days' THEN 'urgente'
    WHEN d.prazo <= current_date + INTERVAL '7 days' THEN 'proximo'
    WHEN d.prazo <= current_date + INTERVAL '30 days' THEN 'medio'
    ELSE 'longo'
  END AS bucket,
  COUNT(*) AS total
FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.status != 'CONCLUIDO'
  AND d.prazo IS NOT NULL
GROUP BY d.defensor_id, u.comarca_id,
  CASE
    WHEN d.prazo < current_date THEN 'vencido'
    WHEN d.prazo <= current_date + INTERVAL '3 days' THEN 'urgente'
    WHEN d.prazo <= current_date + INTERVAL '7 days' THEN 'proximo'
    WHEN d.prazo <= current_date + INTERVAL '30 days' THEN 'medio'
    ELSE 'longo'
  END;

-- ==========================================================================
-- 4. Top atos — atos mais frequentes (ranking por defensor/comarca)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_top_atos AS
SELECT
  d.defensor_id,
  u.comarca_id,
  d.ato,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.status != 'CONCLUIDO') AS ativas
FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.ato IS NOT NULL
  AND d.ato != ''
GROUP BY d.defensor_id, u.comarca_id, d.ato;

-- ==========================================================================
-- 5. Carga por defensor (admin/servidor — visão de equipe)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_carga_defensor AS
SELECT
  d.defensor_id,
  u.comarca_id,
  u.name AS defensor_nome,
  u.email AS defensor_email,
  COALESCE(p.atribuicao::text, 'SEM_PROCESSO') AS atribuicao,
  COUNT(*) FILTER (WHERE d.status != 'CONCLUIDO') AS ativas,
  COUNT(*) FILTER (WHERE d.status = 'CONCLUIDO') AS concluidas,
  COUNT(*) AS total
FROM demandas d
LEFT JOIN processos p ON p.id = d.processo_id
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.defensor_id IS NOT NULL
GROUP BY d.defensor_id, u.comarca_id, u.name, u.email,
  COALESCE(p.atribuicao::text, 'SEM_PROCESSO');

-- ==========================================================================
-- 6. Réu preso com prazo ≤ 5 dias (view normal — precisa tempo real)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_presos_urgentes AS
SELECT
  d.id,
  d.ato,
  d.prazo,
  d.status::text AS status,
  d.defensor_id,
  u.comarca_id,
  COALESCE(p.atribuicao::text, 'SEM_PROCESSO') AS atribuicao,
  p.numero_autos,
  a.nome AS assistido_nome,
  a.id AS assistido_id,
  (d.prazo - current_date) AS dias_ate_prazo
FROM demandas d
LEFT JOIN processos p ON p.id = d.processo_id
LEFT JOIN assistidos a ON a.id = d.assistido_id
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
  AND d.reu_preso = true
  AND d.status != 'CONCLUIDO'
  AND d.prazo IS NOT NULL
  AND d.prazo <= current_date + INTERVAL '5 days';

-- ==========================================================================
-- 7. Summary — KPIs agregados para os cards grandes do topo
-- ==========================================================================
CREATE OR REPLACE VIEW vw_kpi_summary AS
SELECT
  d.defensor_id,
  u.comarca_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.status != 'CONCLUIDO') AS ativas,
  COUNT(*) FILTER (WHERE d.status = 'CONCLUIDO') AS concluidas,
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
  COUNT(*) FILTER (
    WHERE d.reu_preso = true AND d.status != 'CONCLUIDO'
  ) AS reu_preso_ativas,
  COUNT(*) FILTER (
    WHERE d.status = 'CONCLUIDO'
      AND d.updated_at > date_trunc('month', current_date)
  ) AS concluidas_mes
FROM demandas d
LEFT JOIN users u ON u.id = d.defensor_id
WHERE d.deleted_at IS NULL
GROUP BY d.defensor_id, u.comarca_id;

-- Grants — readonly pro role postgres já tem por default
GRANT SELECT ON vw_kpi_throughput, vw_kpi_backlog, vw_kpi_prazos,
  vw_kpi_top_atos, vw_kpi_carga_defensor, vw_presos_urgentes, vw_kpi_summary
TO authenticated, anon, service_role;
