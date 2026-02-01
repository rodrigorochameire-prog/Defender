-- Migration: Logs de Atividade
-- Descrição: Cria tabela para rastrear atividades dos usuários no sistema

-- Enum para tipos de ação
DO $$ BEGIN
  CREATE TYPE acao_log AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'COMPLETE',
    'DELEGATE',
    'UPLOAD',
    'SYNC'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para tipos de entidade
DO $$ BEGIN
  CREATE TYPE entidade_log AS ENUM (
    'demanda',
    'assistido',
    'processo',
    'documento',
    'audiencia',
    'delegacao',
    'caso',
    'jurado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acao VARCHAR(20) NOT NULL,
  entidade_tipo VARCHAR(30) NOT NULL,
  entidade_id INTEGER,
  descricao TEXT,
  detalhes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_entidade_idx ON activity_logs(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS activity_logs_acao_idx ON activity_logs(acao);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os logs
CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::INTEGER 
      AND users.role IN ('admin', 'defensor')
    )
  );

-- Política: Usuários podem inserir seus próprios logs
CREATE POLICY "Users can insert own activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::INTEGER);

-- Comentários
COMMENT ON TABLE activity_logs IS 'Logs de atividade dos usuários para auditoria';
COMMENT ON COLUMN activity_logs.acao IS 'Tipo de ação: CREATE, UPDATE, DELETE, VIEW, COMPLETE, DELEGATE, UPLOAD, SYNC';
COMMENT ON COLUMN activity_logs.entidade_tipo IS 'Tipo de entidade afetada: demanda, assistido, processo, etc.';
COMMENT ON COLUMN activity_logs.detalhes IS 'Metadados adicionais em formato JSON';
