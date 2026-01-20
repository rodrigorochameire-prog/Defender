-- ==========================================
-- MIGRAÇÃO: Integração de Dados (Personas/Fatos/Evidências)
-- DefesaHub v2.2 - Single Source of Truth
-- Data: 2026-01-20
-- ==========================================

-- ==========================================
-- 1. TABELA: Personas do Caso
-- ==========================================
CREATE TABLE IF NOT EXISTS case_personas (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
    jurado_id INTEGER REFERENCES jurados(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    status VARCHAR(30),
    perfil JSONB,
    contatos JSONB,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS case_personas_caso_id_idx ON case_personas(caso_id);
CREATE INDEX IF NOT EXISTS case_personas_tipo_idx ON case_personas(tipo);
CREATE INDEX IF NOT EXISTS case_personas_status_idx ON case_personas(status);
CREATE INDEX IF NOT EXISTS case_personas_assistido_id_idx ON case_personas(assistido_id);
CREATE INDEX IF NOT EXISTS case_personas_jurado_id_idx ON case_personas(jurado_id);

-- ==========================================
-- 2. TABELA: Fatos do Caso
-- ==========================================
CREATE TABLE IF NOT EXISTS case_facts (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30),
    tags JSONB,
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS case_facts_caso_id_idx ON case_facts(caso_id);
CREATE INDEX IF NOT EXISTS case_facts_tipo_idx ON case_facts(tipo);
CREATE INDEX IF NOT EXISTS case_facts_status_idx ON case_facts(status);

-- ==========================================
-- 3. TABELA: Evidências vinculadas a fatos
-- ==========================================
CREATE TABLE IF NOT EXISTS fact_evidence (
    id SERIAL PRIMARY KEY,
    fact_id INTEGER NOT NULL REFERENCES case_facts(id) ON DELETE CASCADE,
    documento_id INTEGER REFERENCES documentos(id) ON DELETE SET NULL,
    source_type VARCHAR(30),
    source_id TEXT,
    trecho TEXT,
    contradicao BOOLEAN DEFAULT FALSE,
    confianca INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS fact_evidence_fact_id_idx ON fact_evidence(fact_id);
CREATE INDEX IF NOT EXISTS fact_evidence_documento_id_idx ON fact_evidence(documento_id);
CREATE INDEX IF NOT EXISTS fact_evidence_contradicao_idx ON fact_evidence(contradicao);

-- ==========================================
-- 4. TABELA: Itens do Roteiro do Júri
-- ==========================================
CREATE TABLE IF NOT EXISTS juri_script_items (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    sessao_juri_id INTEGER REFERENCES sessoes_juri(id) ON DELETE SET NULL,
    persona_id INTEGER REFERENCES case_personas(id) ON DELETE SET NULL,
    fact_id INTEGER REFERENCES case_facts(id) ON DELETE SET NULL,
    pergunta TEXT,
    fase VARCHAR(40),
    ordem INTEGER,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS juri_script_items_caso_id_idx ON juri_script_items(caso_id);
CREATE INDEX IF NOT EXISTS juri_script_items_sessao_id_idx ON juri_script_items(sessao_juri_id);
CREATE INDEX IF NOT EXISTS juri_script_items_persona_id_idx ON juri_script_items(persona_id);
CREATE INDEX IF NOT EXISTS juri_script_items_fact_id_idx ON juri_script_items(fact_id);
CREATE INDEX IF NOT EXISTS juri_script_items_fase_idx ON juri_script_items(fase);
CREATE INDEX IF NOT EXISTS juri_script_items_ordem_idx ON juri_script_items(ordem);

-- ==========================================
-- 5. AJUSTES EM TABELAS EXISTENTES
-- ==========================================
ALTER TABLE documentos
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id);

CREATE INDEX IF NOT EXISTS documentos_caso_id_idx ON documentos(caso_id);

ALTER TABLE anotacoes
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id);

CREATE INDEX IF NOT EXISTS anotacoes_caso_id_idx ON anotacoes(caso_id);

ALTER TABLE depoimentos_analise
ADD COLUMN IF NOT EXISTS persona_id INTEGER REFERENCES case_personas(id);

CREATE INDEX IF NOT EXISTS depoimentos_analise_persona_id_idx ON depoimentos_analise(persona_id);
