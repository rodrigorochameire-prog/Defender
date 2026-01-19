-- ==========================================
-- SINCRONIZAÇÃO GOOGLE DRIVE
-- ==========================================
-- Esta migração cria as tabelas necessárias para sincronização
-- bidirecional entre o Google Drive e o DefensorHub

-- Tabela de configuração de pastas sincronizadas
CREATE TABLE IF NOT EXISTS drive_sync_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL UNIQUE,
    drive_folder_url TEXT,
    description TEXT,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'drive_to_app', 'app_to_drive')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_sync_at TIMESTAMP,
    sync_token TEXT, -- Token para Changes API do Google Drive
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de arquivos sincronizados
CREATE TABLE IF NOT EXISTS drive_files (
    id SERIAL PRIMARY KEY,
    
    -- Identificação Google Drive
    drive_file_id VARCHAR(100) NOT NULL UNIQUE,
    drive_folder_id VARCHAR(100) NOT NULL,
    
    -- Metadados do arquivo
    name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    
    -- Links
    web_view_link TEXT,
    web_content_link TEXT,
    thumbnail_link TEXT,
    icon_link TEXT,
    
    -- Status de sincronização
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_upload', 'pending_download', 'conflict', 'error')),
    last_modified_time TIMESTAMP,
    last_sync_at TIMESTAMP,
    local_checksum VARCHAR(64),
    drive_checksum VARCHAR(64),
    
    -- Relacionamentos (opcionais - para vincular a processos/assistidos)
    processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
    assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
    documento_id INTEGER REFERENCES documentos(id) ON DELETE SET NULL,
    
    -- Cópia local (se salvo no Supabase Storage)
    local_file_url TEXT,
    local_file_key TEXT,
    
    -- Controle de versão
    version INTEGER DEFAULT 1,
    is_folder BOOLEAN DEFAULT FALSE,
    parent_file_id INTEGER REFERENCES drive_files(id) ON DELETE CASCADE,
    
    -- Metadados
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de histórico de sincronização
CREATE TABLE IF NOT EXISTS drive_sync_logs (
    id SERIAL PRIMARY KEY,
    drive_file_id VARCHAR(100),
    action VARCHAR(50) NOT NULL, -- 'upload', 'download', 'delete', 'rename', 'move', 'sync_started', 'sync_completed'
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    details TEXT,
    error_message TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de webhooks/change tokens do Drive
CREATE TABLE IF NOT EXISTS drive_webhooks (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(100) NOT NULL UNIQUE,
    resource_id VARCHAR(100),
    folder_id VARCHAR(100) NOT NULL,
    expiration TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_drive_files_drive_folder_id ON drive_files(drive_folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_drive_file_id ON drive_files(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_processo_id ON drive_files(processo_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_assistido_id ON drive_files(assistido_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_sync_status ON drive_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_drive_files_is_folder ON drive_files(is_folder);
CREATE INDEX IF NOT EXISTS idx_drive_files_parent_file_id ON drive_files(parent_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_sync_logs_drive_file_id ON drive_sync_logs(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_sync_logs_created_at ON drive_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_drive_sync_folders_drive_folder_id ON drive_sync_folders(drive_folder_id);

-- Comentários para documentação
COMMENT ON TABLE drive_sync_folders IS 'Pastas do Google Drive configuradas para sincronização';
COMMENT ON TABLE drive_files IS 'Arquivos e pastas sincronizados do Google Drive';
COMMENT ON TABLE drive_sync_logs IS 'Histórico de operações de sincronização';
COMMENT ON TABLE drive_webhooks IS 'Webhooks ativos para notificação de mudanças no Drive';

COMMENT ON COLUMN drive_files.sync_status IS 'synced: em sincronia, pending_upload: aguardando envio para Drive, pending_download: aguardando download do Drive, conflict: versões conflitantes, error: erro na sincronização';
COMMENT ON COLUMN drive_sync_folders.sync_direction IS 'bidirectional: ambos os lados, drive_to_app: apenas do Drive para o app, app_to_drive: apenas do app para o Drive';
