-- ==========================================
-- MIGRATION: Create Missing Tables
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Criar o enum modelo_categoria (se não existir)
DO $$ BEGIN
    CREATE TYPE modelo_categoria AS ENUM (
        'PROVIDENCIA_ADMINISTRATIVA',
        'PROVIDENCIA_FUNCIONAL',
        'PROVIDENCIA_INSTITUCIONAL',
        'PECA_PROCESSUAL',
        'COMUNICACAO',
        'OUTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela plaud_config
CREATE TABLE IF NOT EXISTS plaud_config (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id),

    -- Configuração da API
    api_key TEXT,
    api_secret TEXT,
    webhook_secret TEXT,

    -- Dispositivo vinculado
    device_id VARCHAR(100),
    device_name VARCHAR(100),
    device_model VARCHAR(50),

    -- Configurações de transcrição
    default_language VARCHAR(10) DEFAULT 'pt-BR',
    auto_transcribe BOOLEAN DEFAULT TRUE,
    auto_summarize BOOLEAN DEFAULT TRUE,

    -- Configurações de upload para Drive
    auto_upload_to_drive BOOLEAN DEFAULT TRUE,
    drive_folder_id VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    last_sync_at TIMESTAMP,

    -- Metadados
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para plaud_config
CREATE INDEX IF NOT EXISTS plaud_config_workspace_id_idx ON plaud_config(workspace_id);
CREATE INDEX IF NOT EXISTS plaud_config_device_id_idx ON plaud_config(device_id);
CREATE INDEX IF NOT EXISTS plaud_config_is_active_idx ON plaud_config(is_active);

-- 3. Criar tabela plaud_recordings
CREATE TABLE IF NOT EXISTS plaud_recordings (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL REFERENCES plaud_config(id) ON DELETE CASCADE,

    -- Identificação Plaud
    plaud_recording_id VARCHAR(100) NOT NULL UNIQUE,
    plaud_device_id VARCHAR(100),

    -- Metadados da gravação
    title VARCHAR(255),
    duration INTEGER,
    recorded_at TIMESTAMP,
    file_size INTEGER,

    -- Status de processamento
    status VARCHAR(20) DEFAULT 'received',
    error_message TEXT,

    -- Transcrição recebida
    transcription TEXT,
    summary TEXT,
    speakers JSONB,

    -- Vinculação ao atendimento
    atendimento_id INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,

    -- Arquivo no Drive
    drive_file_id VARCHAR(100),
    drive_file_url TEXT,

    -- Metadados
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para plaud_recordings
CREATE INDEX IF NOT EXISTS plaud_recordings_config_id_idx ON plaud_recordings(config_id);
CREATE INDEX IF NOT EXISTS plaud_recordings_plaud_recording_id_idx ON plaud_recordings(plaud_recording_id);
CREATE INDEX IF NOT EXISTS plaud_recordings_atendimento_id_idx ON plaud_recordings(atendimento_id);
CREATE INDEX IF NOT EXISTS plaud_recordings_assistido_id_idx ON plaud_recordings(assistido_id);
CREATE INDEX IF NOT EXISTS plaud_recordings_status_idx ON plaud_recordings(status);
CREATE INDEX IF NOT EXISTS plaud_recordings_recorded_at_idx ON plaud_recordings(recorded_at);

-- 4. Criar tabela documento_modelos
CREATE TABLE IF NOT EXISTS documento_modelos (
    id SERIAL PRIMARY KEY,

    -- Identificação
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria modelo_categoria NOT NULL DEFAULT 'OUTRO',

    -- Conteúdo do modelo (texto com {{VARIAVEIS}})
    conteudo TEXT NOT NULL,

    -- Tipo de documento
    tipo_peca VARCHAR(100),
    area area,

    -- Variáveis disponíveis (JSON array)
    variaveis JSONB,

    -- Formatação para exportação
    formatacao JSONB,

    -- Tags para busca
    tags JSONB,

    -- Visibilidade e controle
    is_public BOOLEAN DEFAULT TRUE,
    is_ativo BOOLEAN DEFAULT TRUE,

    -- Estatísticas de uso
    total_usos INTEGER DEFAULT 0,

    -- Workspace e usuário
    workspace_id INTEGER REFERENCES workspaces(id),
    created_by_id INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP
);

-- Índices para documento_modelos
CREATE INDEX IF NOT EXISTS documento_modelos_categoria_idx ON documento_modelos(categoria);
CREATE INDEX IF NOT EXISTS documento_modelos_tipo_peca_idx ON documento_modelos(tipo_peca);
CREATE INDEX IF NOT EXISTS documento_modelos_area_idx ON documento_modelos(area);
CREATE INDEX IF NOT EXISTS documento_modelos_is_ativo_idx ON documento_modelos(is_ativo);
CREATE INDEX IF NOT EXISTS documento_modelos_workspace_id_idx ON documento_modelos(workspace_id);
CREATE INDEX IF NOT EXISTS documento_modelos_deleted_at_idx ON documento_modelos(deleted_at);

-- 5. Criar tabela documentos_gerados
CREATE TABLE IF NOT EXISTS documentos_gerados (
    id SERIAL PRIMARY KEY,

    -- Relacionamentos
    modelo_id INTEGER REFERENCES documento_modelos(id) ON DELETE SET NULL,
    processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
    demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
    caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,

    -- Conteúdo gerado
    titulo VARCHAR(300) NOT NULL,
    conteudo_final TEXT NOT NULL,

    -- Valores das variáveis usadas
    valores_variaveis JSONB,

    -- Se foi gerado/aprimorado por IA
    gerado_por_ia BOOLEAN DEFAULT FALSE,
    prompt_ia TEXT,

    -- Exportação
    google_doc_id TEXT,
    google_doc_url TEXT,
    drive_file_id TEXT,

    -- Workspace e usuário
    workspace_id INTEGER REFERENCES workspaces(id),
    created_by_id INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para documentos_gerados
CREATE INDEX IF NOT EXISTS documentos_gerados_modelo_id_idx ON documentos_gerados(modelo_id);
CREATE INDEX IF NOT EXISTS documentos_gerados_processo_id_idx ON documentos_gerados(processo_id);
CREATE INDEX IF NOT EXISTS documentos_gerados_assistido_id_idx ON documentos_gerados(assistido_id);
CREATE INDEX IF NOT EXISTS documentos_gerados_caso_id_idx ON documentos_gerados(caso_id);
CREATE INDEX IF NOT EXISTS documentos_gerados_workspace_id_idx ON documentos_gerados(workspace_id);

-- 6. Adicionar colunas de áudio/transcrição na tabela atendimentos (se não existirem)
DO $$
BEGIN
    -- Colunas de gravação
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'audio_url') THEN
        ALTER TABLE atendimentos ADD COLUMN audio_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'audio_drive_file_id') THEN
        ALTER TABLE atendimentos ADD COLUMN audio_drive_file_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'audio_mime_type') THEN
        ALTER TABLE atendimentos ADD COLUMN audio_mime_type VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'audio_file_size') THEN
        ALTER TABLE atendimentos ADD COLUMN audio_file_size INTEGER;
    END IF;

    -- Colunas de transcrição
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'transcricao') THEN
        ALTER TABLE atendimentos ADD COLUMN transcricao TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'transcricao_resumo') THEN
        ALTER TABLE atendimentos ADD COLUMN transcricao_resumo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'transcricao_status') THEN
        ALTER TABLE atendimentos ADD COLUMN transcricao_status VARCHAR(20) DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'transcricao_idioma') THEN
        ALTER TABLE atendimentos ADD COLUMN transcricao_idioma VARCHAR(10) DEFAULT 'pt-BR';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'plaud_recording_id') THEN
        ALTER TABLE atendimentos ADD COLUMN plaud_recording_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'plaud_device_id') THEN
        ALTER TABLE atendimentos ADD COLUMN plaud_device_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'transcricao_metadados') THEN
        ALTER TABLE atendimentos ADD COLUMN transcricao_metadados JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'pontos_chave') THEN
        ALTER TABLE atendimentos ADD COLUMN pontos_chave JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atendimentos' AND column_name = 'duracao') THEN
        ALTER TABLE atendimentos ADD COLUMN duracao INTEGER;
    END IF;
END $$;

-- Criar índices para as novas colunas de atendimentos
CREATE INDEX IF NOT EXISTS atendimentos_transcricao_status_idx ON atendimentos(transcricao_status);
CREATE INDEX IF NOT EXISTS atendimentos_plaud_recording_id_idx ON atendimentos(plaud_recording_id);

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================
