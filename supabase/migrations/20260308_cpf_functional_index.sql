-- =============================================================
-- Migration: Índices funcionais e compostos para queries frequentes
-- Data: 2026-03-08
-- =============================================================

-- Index funcional para busca de CPF normalizado
-- Queries usam REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
-- O índice existente em cpf não é usado porque a função REPLACE invalida o index scan
CREATE INDEX IF NOT EXISTS idx_assistidos_cpf_normalized
ON assistidos (REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''));

-- =============================================================
-- Composite indexes para queries frequentes
-- =============================================================

-- Demandas: listagem por defensor filtrada por status (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_demandas_defensor_status_deleted
ON demandas (defensor_id, status, deleted_at);

-- Demandas: busca por processo (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_demandas_processo_deleted
ON demandas (processo_id, deleted_at);

-- Audiências: listagem por data e status
-- Nota: audiencias NÃO possui coluna deleted_at
CREATE INDEX IF NOT EXISTS idx_audiencias_data_status
ON audiencias (data_audiencia, status);

-- Processos: busca por assistido (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_processos_assistido_deleted
ON processos (assistido_id, deleted_at);

-- Drive files: busca por processo filtrando pastas
-- Nota: drive_files NÃO possui coluna deleted_at
CREATE INDEX IF NOT EXISTS idx_drive_files_processo_folder
ON drive_files (processo_id, is_folder);
