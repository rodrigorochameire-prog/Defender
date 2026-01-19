-- =====================================================
-- MIGRAÇÃO: Arquitetura de Workspaces por Atribuição
-- Data: 2026-01-17
-- Descrição: Adiciona enum de atribuição e tabelas específicas por módulo
-- =====================================================

-- Enum de Atribuição (O Coração da Divisão)
DO $$ BEGIN
    CREATE TYPE atribuicao AS ENUM (
        'JURI_CAMACARI',      -- Vara do Júri Camaçari
        'VVD_CAMACARI',       -- Violência Doméstica
        'EXECUCAO_PENAL',     -- Execução Penal
        'SUBSTITUICAO',       -- Substituições Gerais
        'GRUPO_JURI'          -- Grupo Especial do Júri
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna de atribuição na tabela de processos
ALTER TABLE processos ADD COLUMN IF NOT EXISTS atribuicao atribuicao DEFAULT 'SUBSTITUICAO' NOT NULL;

-- Índice para filtrar por atribuição
CREATE INDEX IF NOT EXISTS processos_atribuicao_idx ON processos(atribuicao);

-- =====================================================
-- MÓDULO VVD - Medidas Protetivas
-- =====================================================

CREATE TABLE IF NOT EXISTS medidas_protetivas (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
    
    -- Dados da Medida
    numero_medida VARCHAR(50),
    tipo_medida VARCHAR(100) NOT NULL,
    data_decisao DATE,
    prazo_dias INTEGER,
    data_vencimento DATE,
    
    -- Distância mínima (se aplicável)
    distancia_metros INTEGER,
    
    -- Partes
    nome_vitima TEXT,
    telefone_vitima VARCHAR(20),
    
    -- Status
    status VARCHAR(30) DEFAULT 'ativa',
    
    -- Observações
    observacoes TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para medidas protetivas
CREATE INDEX IF NOT EXISTS medidas_protetivas_processo_id_idx ON medidas_protetivas(processo_id);
CREATE INDEX IF NOT EXISTS medidas_protetivas_status_idx ON medidas_protetivas(status);
CREATE INDEX IF NOT EXISTS medidas_protetivas_data_vencimento_idx ON medidas_protetivas(data_vencimento);

-- =====================================================
-- MÓDULO EP - Cálculos SEEU (Benefícios)
-- =====================================================

CREATE TABLE IF NOT EXISTS calculos_seeu (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
    
    -- Dados Base
    data_base DATE NOT NULL,
    pena_total INTEGER NOT NULL, -- Total em dias
    regime_inicial VARCHAR(20),
    
    -- Frações de progressão
    fracao_progressao VARCHAR(20),
    fracao_livramento VARCHAR(20),
    
    -- Datas calculadas
    data_progressao DATE,
    data_livramento DATE,
    data_termino DATE,
    data_saida DATE,
    
    -- Remição
    dias_remidos INTEGER DEFAULT 0,
    dias_trabalho INTEGER DEFAULT 0,
    dias_estudo INTEGER DEFAULT 0,
    
    -- Crime hediondo
    is_hediondo BOOLEAN DEFAULT FALSE,
    is_primario BOOLEAN DEFAULT TRUE,
    
    -- Status do benefício
    status_progressao VARCHAR(30),
    status_livramento VARCHAR(30),
    
    -- Observações
    observacoes TEXT,
    
    -- Metadados
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para cálculos SEEU
CREATE INDEX IF NOT EXISTS calculos_seeu_processo_id_idx ON calculos_seeu(processo_id);
CREATE INDEX IF NOT EXISTS calculos_seeu_assistido_id_idx ON calculos_seeu(assistido_id);
CREATE INDEX IF NOT EXISTS calculos_seeu_data_progressao_idx ON calculos_seeu(data_progressao);
CREATE INDEX IF NOT EXISTS calculos_seeu_data_livramento_idx ON calculos_seeu(data_livramento);

-- =====================================================
-- Trigger para atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para medidas_protetivas
DROP TRIGGER IF EXISTS update_medidas_protetivas_updated_at ON medidas_protetivas;
CREATE TRIGGER update_medidas_protetivas_updated_at
    BEFORE UPDATE ON medidas_protetivas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calculos_seeu
DROP TRIGGER IF EXISTS update_calculos_seeu_updated_at ON calculos_seeu;
CREATE TRIGGER update_calculos_seeu_updated_at
    BEFORE UPDATE ON calculos_seeu
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comentários nas tabelas
-- =====================================================

COMMENT ON TABLE medidas_protetivas IS 'Módulo VVD: Gestão de Medidas Protetivas de Urgência';
COMMENT ON TABLE calculos_seeu IS 'Módulo EP: Cálculos de progressão, livramento e benefícios';
COMMENT ON COLUMN processos.atribuicao IS 'Atribuição/Workspace do processo - filtro mestre';
