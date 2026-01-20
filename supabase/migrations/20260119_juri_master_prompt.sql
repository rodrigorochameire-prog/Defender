-- ==========================================
-- MIGRAÇÃO: Módulos do Júri (Estratégia/Provas/Plenário)
-- DefesaHub v2.1 - Prompt Mestre
-- Data: 2026-01-19
-- ==========================================

-- ==========================================
-- 1. ATUALIZAÇÃO: Jurados (Profiler Avançado)
-- ==========================================
ALTER TABLE jurados
ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
ADD COLUMN IF NOT EXISTS classe_social VARCHAR(30),
ADD COLUMN IF NOT EXISTS perfil_psicologico TEXT,
ADD COLUMN IF NOT EXISTS tendencia_voto INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(30),
ADD COLUMN IF NOT EXISTS sessao_juri_id INTEGER REFERENCES sessoes_juri(id);

CREATE INDEX IF NOT EXISTS jurados_sessao_juri_id_idx ON jurados(sessao_juri_id);
CREATE INDEX IF NOT EXISTS jurados_tendencia_voto_idx ON jurados(tendencia_voto);
CREATE INDEX IF NOT EXISTS jurados_status_idx ON jurados(status);

-- ==========================================
-- 2. TABELA: Teses Defensivas
-- ==========================================
CREATE TABLE IF NOT EXISTS teses_defensivas (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30),
    probabilidade_aceitacao INTEGER,
    argumentos_chave JSONB,
    jurisprudencia_relacionada JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS teses_defensivas_caso_id_idx ON teses_defensivas(caso_id);
CREATE INDEX IF NOT EXISTS teses_defensivas_tipo_idx ON teses_defensivas(tipo);
CREATE INDEX IF NOT EXISTS teses_defensivas_probabilidade_idx ON teses_defensivas(probabilidade_aceitacao);

-- ==========================================
-- 3. TABELA: Análise Comparativa de Provas
-- ==========================================
CREATE TABLE IF NOT EXISTS depoimentos_analise (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
    testemunha_nome TEXT,
    versao_delegacia TEXT,
    versao_juizo TEXT,
    contradicoes_identificadas TEXT,
    pontos_fracos TEXT,
    pontos_fortes TEXT,
    estrategia_inquiricao TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS depoimentos_analise_caso_id_idx ON depoimentos_analise(caso_id);
CREATE INDEX IF NOT EXISTS depoimentos_analise_testemunha_idx ON depoimentos_analise(testemunha_nome);

-- ==========================================
-- 4. TABELA: Roteiro de Plenário
-- ==========================================
CREATE TABLE IF NOT EXISTS roteiro_plenario (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
    ordem INTEGER,
    fase VARCHAR(40),
    conteudo JSONB,
    tempo_estimado INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS roteiro_plenario_caso_id_idx ON roteiro_plenario(caso_id);
CREATE INDEX IF NOT EXISTS roteiro_plenario_fase_idx ON roteiro_plenario(fase);
CREATE INDEX IF NOT EXISTS roteiro_plenario_ordem_idx ON roteiro_plenario(ordem);
