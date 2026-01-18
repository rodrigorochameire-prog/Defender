-- ==========================================
-- MIGRAÇÃO: Arquitetura Case-Centric
-- DefesaHub v2.0 - Gestão Inteligente
-- Data: 2026-01-18
-- ==========================================

-- ==========================================
-- 1. ENUM: Tipos de audiência
-- ==========================================
DO $$ BEGIN
    CREATE TYPE tipo_audiencia AS ENUM (
        'INSTRUCAO',
        'CUSTODIA', 
        'CONCILIACAO',
        'JUSTIFICACAO',
        'ADMONICAO',
        'UNA',
        'PLENARIO_JURI',
        'CONTINUACAO',
        'OUTRA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. ENUM: Status de audiência
-- ==========================================
DO $$ BEGIN
    CREATE TYPE status_audiencia AS ENUM (
        'A_DESIGNAR',
        'DESIGNADA',
        'REALIZADA',
        'AGUARDANDO_ATA',
        'CONCLUIDA',
        'ADIADA',
        'CANCELADA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 3. TABELA: Casos (Entidade Mestre)
-- O núcleo da arquitetura Case-Centric
-- ==========================================
CREATE TABLE IF NOT EXISTS casos (
    id SERIAL PRIMARY KEY,
    
    -- Identificação do Caso
    titulo TEXT NOT NULL,                    -- ex: "Homicídio - Operação Reuso"
    codigo VARCHAR(50),                      -- Código interno opcional
    
    -- Atribuição/Workspace
    atribuicao atribuicao NOT NULL DEFAULT 'SUBSTITUICAO',
    
    -- Teoria do Caso (Tripé da Defesa)
    teoria_fatos TEXT,                       -- Narrativa defensiva dos fatos
    teoria_provas TEXT,                      -- Evidências que corroboram a tese
    teoria_direito TEXT,                     -- Teses jurídicas e fundamentação
    
    -- Tags para conexões inteligentes
    tags TEXT[],                             -- ex: ['NulidadeBusca', 'LegitimaDefesa']
    
    -- Status
    status VARCHAR(30) DEFAULT 'ativo',      -- 'ativo' | 'arquivado' | 'suspenso'
    fase VARCHAR(50),                        -- 'inquerito' | 'instrucao' | 'plenario' | 'recurso' | 'execucao'
    
    -- Prioridade
    prioridade prioridade DEFAULT 'NORMAL',
    
    -- Defensor responsável
    defensor_id INTEGER REFERENCES users(id),
    
    -- Caso conexo (self-referencing)
    caso_conexo_id INTEGER REFERENCES casos(id),
    
    -- Observações gerais
    observacoes TEXT,
    
    -- Links externos
    link_drive TEXT,                         -- Pasta no Google Drive
    
    -- Soft delete
    deleted_at TIMESTAMP,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para casos
CREATE INDEX IF NOT EXISTS casos_titulo_idx ON casos(titulo);
CREATE INDEX IF NOT EXISTS casos_atribuicao_idx ON casos(atribuicao);
CREATE INDEX IF NOT EXISTS casos_status_idx ON casos(status);
CREATE INDEX IF NOT EXISTS casos_defensor_id_idx ON casos(defensor_id);
CREATE INDEX IF NOT EXISTS casos_deleted_at_idx ON casos(deleted_at);
CREATE INDEX IF NOT EXISTS casos_tags_idx ON casos USING GIN(tags);

-- ==========================================
-- 4. ATUALIZAÇÃO: Assistidos → Caso
-- Adicionar referência ao caso
-- ==========================================
ALTER TABLE assistidos 
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id);

CREATE INDEX IF NOT EXISTS assistidos_caso_id_idx ON assistidos(caso_id);

-- ==========================================
-- 5. ATUALIZAÇÃO: Processos → Caso
-- Adicionar referência ao caso
-- ==========================================
ALTER TABLE processos 
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id);

CREATE INDEX IF NOT EXISTS processos_caso_id_idx ON processos(caso_id);

-- ==========================================
-- 6. ATUALIZAÇÃO: Audiências (Módulo Completo)
-- Transformar em hub de gestão de audiências
-- ==========================================

-- Adicionar novos campos à tabela audiencias
ALTER TABLE audiencias 
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id),
ADD COLUMN IF NOT EXISTS assistido_id INTEGER REFERENCES assistidos(id),
ADD COLUMN IF NOT EXISTS titulo TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS sala VARCHAR(50),
ADD COLUMN IF NOT EXISTS horario VARCHAR(10),
ADD COLUMN IF NOT EXISTS anotacoes TEXT,                              -- Ata/notas da audiência
ADD COLUMN IF NOT EXISTS anotacoes_versao INTEGER DEFAULT 1,          -- Versionamento
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,               -- Sincronia Google Calendar
ADD COLUMN IF NOT EXISTS resumo_defesa TEXT,                          -- Puxado da Teoria do Caso
ADD COLUMN IF NOT EXISTS gerar_prazo_apos BOOLEAN DEFAULT FALSE,      -- Flag para criar tarefa
ADD COLUMN IF NOT EXISTS prazo_gerado_id INTEGER REFERENCES demandas(id);

-- Índices adicionais
CREATE INDEX IF NOT EXISTS audiencias_caso_id_idx ON audiencias(caso_id);
CREATE INDEX IF NOT EXISTS audiencias_assistido_id_idx ON audiencias(assistido_id);
CREATE INDEX IF NOT EXISTS audiencias_google_event_idx ON audiencias(google_calendar_event_id);

-- ==========================================
-- 7. TABELA: Histórico de Anotações de Audiência
-- Versionamento para auditoria
-- ==========================================
CREATE TABLE IF NOT EXISTS audiencias_historico (
    id SERIAL PRIMARY KEY,
    audiencia_id INTEGER NOT NULL REFERENCES audiencias(id) ON DELETE CASCADE,
    
    -- Versão
    versao INTEGER NOT NULL,
    anotacoes TEXT NOT NULL,
    
    -- Quem editou
    editado_por_id INTEGER REFERENCES users(id),
    
    -- Quando
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS audiencias_hist_audiencia_idx ON audiencias_historico(audiencia_id);
CREATE INDEX IF NOT EXISTS audiencias_hist_versao_idx ON audiencias_historico(versao);

-- ==========================================
-- 8. TABELA: Tags de Casos (para sugestões)
-- ==========================================
CREATE TABLE IF NOT EXISTS caso_tags (
    id SERIAL PRIMARY KEY,
    
    nome VARCHAR(100) NOT NULL UNIQUE,       -- ex: 'NulidadeBusca', 'LegitimaDefesa'
    descricao TEXT,
    cor VARCHAR(20) DEFAULT 'slate',         -- Para UI
    
    -- Contagem de uso (para ranking)
    uso_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS caso_tags_nome_idx ON caso_tags(nome);
CREATE INDEX IF NOT EXISTS caso_tags_uso_idx ON caso_tags(uso_count DESC);

-- ==========================================
-- 9. TABELA: Conexões entre Casos
-- Para relacionamentos além do self-reference
-- ==========================================
CREATE TABLE IF NOT EXISTS casos_conexos (
    id SERIAL PRIMARY KEY,
    
    caso_origem_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    caso_destino_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
    
    tipo_conexao VARCHAR(50),                -- 'coautoria' | 'fato_conexo' | 'tese_similar' | 'mesmo_evento'
    descricao TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Evitar duplicatas
    UNIQUE(caso_origem_id, caso_destino_id)
);

CREATE INDEX IF NOT EXISTS casos_conexos_origem_idx ON casos_conexos(caso_origem_id);
CREATE INDEX IF NOT EXISTS casos_conexos_destino_idx ON casos_conexos(caso_destino_id);

-- ==========================================
-- 10. ATUALIZAÇÃO: Demandas → Caso
-- Adicionar referência direta ao caso
-- ==========================================
ALTER TABLE demandas 
ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id);

CREATE INDEX IF NOT EXISTS demandas_caso_id_idx ON demandas(caso_id);

-- ==========================================
-- 11. VIEW: Dashboard de Casos
-- Para consultas rápidas
-- ==========================================
CREATE OR REPLACE VIEW vw_casos_dashboard AS
SELECT 
    c.id,
    c.titulo,
    c.atribuicao,
    c.status,
    c.fase,
    c.prioridade,
    c.tags,
    c.created_at,
    u.name as defensor_nome,
    COUNT(DISTINCT a.id) as total_assistidos,
    COUNT(DISTINCT p.id) as total_processos,
    COUNT(DISTINCT d.id) FILTER (WHERE d.status NOT IN ('7_PROTOCOLADO', '7_CIENCIA', 'CONCLUIDO', 'ARQUIVADO')) as demandas_pendentes,
    COUNT(DISTINCT aud.id) FILTER (WHERE aud.data_audiencia > NOW() AND aud.status = 'DESIGNADA') as audiencias_futuras
FROM casos c
LEFT JOIN users u ON c.defensor_id = u.id
LEFT JOIN assistidos a ON a.caso_id = c.id AND a.deleted_at IS NULL
LEFT JOIN processos p ON p.caso_id = c.id AND p.deleted_at IS NULL
LEFT JOIN demandas d ON d.caso_id = c.id AND d.deleted_at IS NULL
LEFT JOIN audiencias aud ON aud.caso_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, u.name;

-- ==========================================
-- 12. VIEW: Agenda de Audiências
-- Para o módulo de calendário
-- ==========================================
CREATE OR REPLACE VIEW vw_agenda_audiencias AS
SELECT 
    aud.id,
    aud.data_audiencia,
    aud.horario,
    aud.tipo,
    aud.status,
    aud.sala,
    aud.local,
    aud.resumo_defesa,
    aud.google_calendar_event_id,
    c.id as caso_id,
    c.titulo as caso_titulo,
    c.teoria_fatos,
    a.id as assistido_id,
    a.nome as assistido_nome,
    a.status_prisional,
    a.photo_url as assistido_foto,
    p.id as processo_id,
    p.numero_autos,
    p.vara,
    p.comarca,
    u.name as defensor_nome
FROM audiencias aud
LEFT JOIN casos c ON aud.caso_id = c.id
LEFT JOIN assistidos a ON aud.assistido_id = a.id
LEFT JOIN processos p ON aud.processo_id = p.id
LEFT JOIN users u ON aud.defensor_id = u.id
WHERE c.deleted_at IS NULL OR c.deleted_at IS NULL;

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON TABLE casos IS 'Entidade mestre do sistema Case-Centric. Um caso agrupa assistidos, processos e audiências.';
COMMENT ON COLUMN casos.teoria_fatos IS 'Narrativa defensiva - os fatos conforme a defesa.';
COMMENT ON COLUMN casos.teoria_provas IS 'Evidências e provas que corroboram a tese defensiva.';
COMMENT ON COLUMN casos.teoria_direito IS 'Fundamentos jurídicos, teses e jurisprudência aplicável.';
COMMENT ON COLUMN casos.tags IS 'Tags semânticas para conexões inteligentes entre casos.';

COMMENT ON TABLE audiencias_historico IS 'Histórico de versões das anotações de audiência para auditoria.';
COMMENT ON TABLE casos_conexos IS 'Relacionamentos entre casos (coautoria, fatos conexos, teses similares).';
