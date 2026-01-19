-- ==========================================
-- MIGRATION: Adicionar Substituição Cível
-- Data: 2026-01-17
-- Descrição: Adiciona novo tipo de atribuição para
--            substituições não penais (cível, família, etc.)
-- ==========================================

-- Adicionar novo valor ao enum de atribuição
ALTER TYPE atribuicao ADD VALUE IF NOT EXISTS 'SUBSTITUICAO_CIVEL';

COMMENT ON TYPE atribuicao IS 'Tipos de atribuição/workspace: JURI_CAMACARI (Verde), VVD_CAMACARI (Amarelo), EXECUCAO_PENAL (Azul), SUBSTITUICAO (Vermelho), SUBSTITUICAO_CIVEL (Roxo), GRUPO_JURI (Laranja)';
