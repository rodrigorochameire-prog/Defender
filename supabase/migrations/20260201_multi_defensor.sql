-- =============================================
-- ARQUITETURA MULTI-DEFENSOR - Defensoria de Camaçari
-- Migração para suportar múltiplos defensores com áreas privadas
-- =============================================

-- 1. Adicionar campos de núcleo e controle em users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nucleo VARCHAR(30),
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_ver_todos_assistidos BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pode_ver_todos_processos BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS users_nucleo_idx ON users(nucleo);

COMMENT ON COLUMN users.nucleo IS 'Núcleo de atuação: ESPECIALIZADOS, VARA_1, VARA_2';
COMMENT ON COLUMN users.is_admin IS 'Se é administrador geral da comarca';
COMMENT ON COLUMN users.pode_ver_todos_assistidos IS 'Se pode ver assistidos de outros núcleos';
COMMENT ON COLUMN users.pode_ver_todos_processos IS 'Se pode ver processos de outros núcleos';

-- 2. Criar tabela de afastamentos
CREATE TABLE IF NOT EXISTS afastamentos (
  id SERIAL PRIMARY KEY,
  
  -- Defensor afastado e substituto
  defensor_id INTEGER NOT NULL REFERENCES users(id),
  substituto_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Período
  data_inicio DATE NOT NULL,
  data_fim DATE,
  
  -- Tipo e motivo
  tipo VARCHAR(20) NOT NULL DEFAULT 'FERIAS',
  motivo TEXT,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Permissões durante o afastamento
  acesso_demandas BOOLEAN DEFAULT TRUE,
  acesso_equipe BOOLEAN DEFAULT FALSE,
  
  -- Workspace
  workspace_id INTEGER REFERENCES workspaces(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS afastamentos_defensor_id_idx ON afastamentos(defensor_id);
CREATE INDEX IF NOT EXISTS afastamentos_substituto_id_idx ON afastamentos(substituto_id);
CREATE INDEX IF NOT EXISTS afastamentos_ativo_idx ON afastamentos(ativo);
CREATE INDEX IF NOT EXISTS afastamentos_data_inicio_idx ON afastamentos(data_inicio);
CREATE INDEX IF NOT EXISTS afastamentos_workspace_id_idx ON afastamentos(workspace_id);

COMMENT ON TABLE afastamentos IS 'Registro de afastamentos e coberturas entre defensores';
COMMENT ON COLUMN afastamentos.tipo IS 'Tipo de afastamento: FERIAS, LICENCA, CAPACITACAO, OUTRO';
COMMENT ON COLUMN afastamentos.acesso_demandas IS 'Se o substituto pode ver demandas do afastado';
COMMENT ON COLUMN afastamentos.acesso_equipe IS 'Se o substituto pode gerenciar equipe do afastado';

-- 3. Habilitar RLS na tabela de afastamentos
ALTER TABLE afastamentos ENABLE ROW LEVEL SECURITY;

-- Política para visualização: defensores podem ver afastamentos que os envolvem
CREATE POLICY "Defensores veem afastamentos que os envolvem"
ON afastamentos FOR SELECT
TO authenticated
USING (
  defensor_id = auth.uid()::integer
  OR substituto_id = auth.uid()::integer
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::integer AND is_admin = TRUE
  )
);

-- Política para criação: apenas admin pode criar afastamentos
CREATE POLICY "Admin pode criar afastamentos"
ON afastamentos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::integer AND (is_admin = TRUE OR role = 'admin')
  )
);

-- Política para atualização: admin ou defensor próprio
CREATE POLICY "Admin ou defensor pode atualizar afastamento"
ON afastamentos FOR UPDATE
TO authenticated
USING (
  defensor_id = auth.uid()::integer
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::integer AND is_admin = TRUE
  )
);

-- 4. Atualizar Dr. Rodrigo como admin (assumindo que é o primeiro usuário)
UPDATE users 
SET is_admin = TRUE, nucleo = 'ESPECIALIZADOS'
WHERE email = 'rodrigo@defender.app';

UPDATE users 
SET nucleo = 'ESPECIALIZADOS'
WHERE email = 'juliane@defender.app';

-- 5. Criar função para verificar se um defensor está cobrindo outro
CREATE OR REPLACE FUNCTION is_covering_defensor(cobridor_id INTEGER, afastado_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM afastamentos
    WHERE substituto_id = cobridor_id
      AND defensor_id = afastado_id
      AND ativo = TRUE
      AND data_inicio <= CURRENT_DATE
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
      AND acesso_demandas = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar view de demandas acessíveis (inclui demandas do afastado quando cobrindo)
CREATE OR REPLACE VIEW demandas_acessiveis AS
SELECT d.*, 
  CASE 
    WHEN d.defensor_id = auth.uid()::integer THEN 'proprio'
    WHEN is_covering_defensor(auth.uid()::integer, d.defensor_id) THEN 'cobertura'
    ELSE 'outro'
  END as tipo_acesso
FROM demandas d
WHERE 
  d.deleted_at IS NULL
  AND (
    d.defensor_id = auth.uid()::integer
    OR is_covering_defensor(auth.uid()::integer, d.defensor_id)
  );

-- Fim da migração
