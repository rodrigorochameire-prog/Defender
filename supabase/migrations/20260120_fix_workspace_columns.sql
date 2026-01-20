-- =====================================================
-- MIGRAÇÃO: Correção de colunas workspace_id
-- Data: 2026-01-20
-- Descrição: Garante que todas as tabelas tenham a coluna workspace_id
-- NOTA: Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar tabela workspaces se não existir
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS workspaces_name_idx ON workspaces(name);
CREATE INDEX IF NOT EXISTS workspaces_active_idx ON workspaces(is_active);

-- 2. Adicionar coluna workspace_id em todas as tabelas necessárias

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS users_workspace_id_idx ON users(workspace_id);

-- Assistidos
ALTER TABLE assistidos ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS assistidos_workspace_id_idx ON assistidos(workspace_id);

-- Processos
ALTER TABLE processos ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS processos_workspace_id_idx ON processos(workspace_id);

-- Demandas
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS demandas_workspace_id_idx ON demandas(workspace_id);

-- Sessões do Júri
ALTER TABLE sessoes_juri ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS sessoes_juri_workspace_id_idx ON sessoes_juri(workspace_id);

-- Audiências
ALTER TABLE audiencias ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS audiencias_workspace_id_idx ON audiencias(workspace_id);

-- Documentos
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS documentos_workspace_id_idx ON documentos(workspace_id);

-- Calendar Events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS calendar_events_workspace_id_idx ON calendar_events(workspace_id);

-- Casos
ALTER TABLE casos ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS casos_workspace_id_idx ON casos(workspace_id);

-- 3. Criar workspace padrão se não existir
INSERT INTO workspaces (name, description, is_active)
SELECT 'Default', 'Workspace padrão', TRUE
WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE name = 'Default');

-- 4. Atualizar registros existentes para usar o workspace padrão
DO $$
DECLARE
  default_workspace_id INTEGER;
BEGIN
  SELECT id INTO default_workspace_id FROM workspaces WHERE name = 'Default' LIMIT 1;
  
  IF default_workspace_id IS NOT NULL THEN
    -- Atualizar users sem workspace
    UPDATE users SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar assistidos sem workspace
    UPDATE assistidos SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar processos sem workspace
    UPDATE processos SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar demandas sem workspace
    UPDATE demandas SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar sessoes_juri sem workspace
    UPDATE sessoes_juri SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar audiencias sem workspace
    UPDATE audiencias SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar documentos sem workspace
    UPDATE documentos SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar calendar_events sem workspace
    UPDATE calendar_events SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    -- Atualizar casos sem workspace
    UPDATE casos SET workspace_id = default_workspace_id WHERE workspace_id IS NULL;
    
    RAISE NOTICE 'Registros atualizados com workspace_id = %', default_workspace_id;
  END IF;
END $$;

-- 5. Confirmar
SELECT 'Migration 20260120_fix_workspace_columns completed successfully' AS status;
