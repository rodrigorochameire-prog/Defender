-- =============================================
-- SISTEMA DE EQUIPE - Defender
-- Migração para suportar delegação e controle de acesso
-- =============================================

-- 1. Adicionar campos em users para Sistema de Equipe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS funcao VARCHAR(30);

CREATE INDEX IF NOT EXISTS users_supervisor_id_idx ON users(supervisor_id);

COMMENT ON COLUMN users.supervisor_id IS 'ID do defensor supervisor (para estagiários)';
COMMENT ON COLUMN users.funcao IS 'Função detalhada: defensor_titular, defensor_substituto, servidor_administrativo, estagiario_direito, triagem';

-- 2. Adicionar campos de delegação em demandas
ALTER TABLE demandas
ADD COLUMN IF NOT EXISTS delegado_para_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS data_delegacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS motivo_delegacao TEXT,
ADD COLUMN IF NOT EXISTS status_delegacao VARCHAR(20),
ADD COLUMN IF NOT EXISTS prazo_sugerido DATE;

CREATE INDEX IF NOT EXISTS demandas_delegado_para_id_idx ON demandas(delegado_para_id);

COMMENT ON COLUMN demandas.delegado_para_id IS 'ID do usuário que recebeu a delegação';
COMMENT ON COLUMN demandas.data_delegacao IS 'Data/hora em que a demanda foi delegada';
COMMENT ON COLUMN demandas.motivo_delegacao IS 'Instruções ou motivo da delegação';
COMMENT ON COLUMN demandas.status_delegacao IS 'Status da delegação: pendente, aceita, em_andamento, concluida, devolvida';
COMMENT ON COLUMN demandas.prazo_sugerido IS 'Prazo sugerido para conclusão da tarefa delegada';

-- 3. Criar tabela de histórico de delegações
CREATE TABLE IF NOT EXISTS delegacoes_historico (
  id SERIAL PRIMARY KEY,
  demanda_id INTEGER NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
  
  -- Quem delegou e para quem
  delegado_de_id INTEGER NOT NULL REFERENCES users(id),
  delegado_para_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Timestamps
  data_delegacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_aceitacao TIMESTAMP,
  data_conclusao TIMESTAMP,
  
  -- Detalhes
  instrucoes TEXT,
  observacoes TEXT,
  prazo_sugerido DATE,
  
  -- Status: pendente, aceita, em_andamento, concluida, devolvida, cancelada
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  
  -- Workspace
  workspace_id INTEGER REFERENCES workspaces(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delegacoes_historico_demanda_id_idx ON delegacoes_historico(demanda_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_delegado_de_id_idx ON delegacoes_historico(delegado_de_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_delegado_para_id_idx ON delegacoes_historico(delegado_para_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_status_idx ON delegacoes_historico(status);
CREATE INDEX IF NOT EXISTS delegacoes_historico_workspace_id_idx ON delegacoes_historico(workspace_id);

COMMENT ON TABLE delegacoes_historico IS 'Histórico de todas as delegações de demandas';

-- 4. Habilitar RLS na nova tabela
ALTER TABLE delegacoes_historico ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver delegações de seu workspace
CREATE POLICY "Usuários podem ver delegações do workspace"
ON delegacoes_historico FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()::integer
  )
  OR delegado_de_id = auth.uid()::integer
  OR delegado_para_id = auth.uid()::integer
);

-- Política para inserção: apenas defensores podem delegar
CREATE POLICY "Defensores podem criar delegações"
ON delegacoes_historico FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::integer 
    AND role IN ('admin', 'defensor')
  )
);

-- Política para atualização: quem recebeu pode atualizar status
CREATE POLICY "Destinatário pode atualizar delegação"
ON delegacoes_historico FOR UPDATE
TO authenticated
USING (
  delegado_para_id = auth.uid()::integer
  OR delegado_de_id = auth.uid()::integer
);

-- 5. Adicionar novos valores de role se necessário
-- (triagem já está incluso no comentário do schema)

-- 6. Inserir dados iniciais da equipe (opcional - descomente se necessário)
/*
INSERT INTO users (name, email, role, funcao, supervisor_id, password_hash, email_verified, approval_status)
VALUES 
  ('Dr. Rodrigo', 'rodrigo@defender.app', 'defensor', 'defensor_titular', NULL, '$2b$10$...', true, 'approved'),
  ('Dra. Juliane', 'juliane@defender.app', 'defensor', 'defensor_titular', NULL, '$2b$10$...', true, 'approved'),
  ('Amanda', 'amanda@defender.app', 'servidor', 'servidor_administrativo', NULL, '$2b$10$...', true, 'approved'),
  ('Emilly', 'emilly@defender.app', 'estagiario', 'estagiario_direito', 1, '$2b$10$...', true, 'approved'), -- supervisor_id = Dr. Rodrigo
  ('Taíssa', 'taissa@defender.app', 'estagiario', 'estagiario_direito', 2, '$2b$10$...', true, 'approved'), -- supervisor_id = Dra. Juliane
  ('Gustavo', 'gustavo@defender.app', 'triagem', 'triagem', NULL, '$2b$10$...', true, 'approved')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  funcao = EXCLUDED.funcao,
  supervisor_id = EXCLUDED.supervisor_id;
*/

-- Fim da migração
