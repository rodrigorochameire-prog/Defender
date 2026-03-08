-- =============================================================
-- Migration: Índices trigram para busca por nome e nome_mae
-- Data: 2026-03-08
-- =============================================================
-- Queries como `ilike '%termo%'` não usam btree index.
-- pg_trgm + GIN permite busca textual eficiente com % em ambos os lados.
-- Também cria indexes btree que estavam definidos no schema mas faltavam no banco.
-- =============================================================

-- Habilitar extensão pg_trgm (trigram matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index para busca por nome (ilike '%search%')
CREATE INDEX IF NOT EXISTS idx_assistidos_nome_trgm
ON assistidos USING gin (nome gin_trgm_ops);

-- GIN trigram index para busca por nome_mae
CREATE INDEX IF NOT EXISTS idx_assistidos_nome_mae_trgm
ON assistidos USING gin (nome_mae gin_trgm_ops);

-- =============================================================
-- Indexes btree faltantes que o schema define mas não existiam no banco
-- =============================================================

-- Defensor responsável (FK muito consultada em listagens filtradas)
CREATE INDEX IF NOT EXISTS assistidos_defensor_id_idx
ON assistidos (defensor_id);

-- Soft-delete (toda query filtra por deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS assistidos_deleted_at_idx
ON assistidos (deleted_at);

-- Workspace (multi-tenant, toda query filtra por workspace)
CREATE INDEX IF NOT EXISTS assistidos_workspace_id_idx
ON assistidos (workspace_id);

-- Caso vinculado
CREATE INDEX IF NOT EXISTS assistidos_caso_id_idx
ON assistidos (caso_id);

-- Status prisional (filtro frequente)
CREATE INDEX IF NOT EXISTS assistidos_status_prisional_idx
ON assistidos (status_prisional);

-- CPF (btree para buscas exatas com formatação original)
CREATE INDEX IF NOT EXISTS assistidos_cpf_idx
ON assistidos (cpf);
