-- drizzle/0050_delegacao_work_status.sql
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS delegacao_work_status varchar(20);

-- Espelhar o andamento do histórico ativo mais recente nas demandas delegadas.
UPDATE demandas d
SET delegacao_work_status = h.status
FROM (
  SELECT DISTINCT ON (demanda_id) demanda_id, status
  FROM delegacoes_historico
  WHERE demanda_id IS NOT NULL
  ORDER BY demanda_id, data_delegacao DESC
) h
WHERE d.id = h.demanda_id AND d.delegado_para_id IS NOT NULL;
