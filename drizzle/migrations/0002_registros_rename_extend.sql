-- Rename atendimentos -> registros + extend with new columns/FKs
-- Plan: docs/superpowers/plans/2026-04-29-registros-tipados.md (Task 1)
-- IF EXISTS guards on index renames cover prior drift between schema and DB.

BEGIN;

-- 1. Rename tabela e índices
ALTER TABLE atendimentos RENAME TO registros;
ALTER INDEX IF EXISTS atendimentos_assistido_id_idx RENAME TO registros_assistido_id_idx;
ALTER INDEX IF EXISTS atendimentos_processo_id_idx RENAME TO registros_processo_id_idx;
ALTER INDEX IF EXISTS atendimentos_caso_id_idx RENAME TO registros_caso_id_idx;
ALTER INDEX IF EXISTS atendimentos_data_idx RENAME TO registros_data_idx;
ALTER INDEX IF EXISTS atendimentos_tipo_idx RENAME TO registros_tipo_idx;
ALTER INDEX IF EXISTS atendimentos_status_idx RENAME TO registros_status_idx;
ALTER INDEX IF EXISTS atendimentos_atendido_por_idx RENAME TO registros_autor_idx;
ALTER INDEX IF EXISTS atendimentos_enrichment_status_idx RENAME TO registros_enrichment_status_idx;
ALTER INDEX IF EXISTS atendimentos_plaud_recording_id_idx RENAME TO registros_plaud_recording_id_idx;
ALTER INDEX IF EXISTS atendimentos_transcricao_status_idx RENAME TO registros_transcricao_status_idx;

-- 2. Rename colunas
ALTER TABLE registros RENAME COLUMN resumo TO conteudo;
ALTER TABLE registros RENAME COLUMN data_atendimento TO data_registro;
ALTER TABLE registros RENAME COLUMN atendido_por_id TO autor_id;

-- 3. Adicionar novas colunas
ALTER TABLE registros
  ADD COLUMN titulo VARCHAR(120),
  ADD COLUMN demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  ADD COLUMN audiencia_id INTEGER REFERENCES audiencias(id) ON DELETE SET NULL;

-- 4. Índices novos
CREATE INDEX registros_demanda_id_idx ON registros(demanda_id);
CREATE INDEX registros_audiencia_id_idx ON registros(audiencia_id);

-- 5. Backfill default tipo (segurança — campo já é varchar)
UPDATE registros SET tipo = 'atendimento'
WHERE tipo IS NULL OR tipo NOT IN
  ('atendimento','diligencia','anotacao','providencia','delegacao','pesquisa','elaboracao');

COMMIT;
