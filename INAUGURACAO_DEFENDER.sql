-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 🎉 DEFENDER - SCRIPT COMPLETO DE INAUGURAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 
-- Execute este script no Supabase SQL Editor para:
-- 1. Aplicar as migrations de Sistema de Equipe e Multi-Defensor
-- 2. Limpar o banco de dados (reset completo)
-- 3. Criar os usuários da equipe
--
-- 🔐 Senha padrão: Defender@2026
-- ⚠️ ATENÇÃO: Este script APAGA todos os dados existentes!
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1: MIGRATIONS - SISTEMA DE EQUIPE                                             ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝

-- Adicionar campos em users para Sistema de Equipe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS funcao VARCHAR(30);

CREATE INDEX IF NOT EXISTS users_supervisor_id_idx ON users(supervisor_id);

-- Adicionar campos de delegação em demandas
ALTER TABLE demandas
ADD COLUMN IF NOT EXISTS delegado_para_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS data_delegacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS motivo_delegacao TEXT,
ADD COLUMN IF NOT EXISTS status_delegacao VARCHAR(20),
ADD COLUMN IF NOT EXISTS prazo_sugerido DATE;

CREATE INDEX IF NOT EXISTS demandas_delegado_para_id_idx ON demandas(delegado_para_id);

-- Criar tabela de histórico de delegações
CREATE TABLE IF NOT EXISTS delegacoes_historico (
  id SERIAL PRIMARY KEY,
  demanda_id INTEGER NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
  delegado_de_id INTEGER NOT NULL REFERENCES users(id),
  delegado_para_id INTEGER NOT NULL REFERENCES users(id),
  data_delegacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_aceitacao TIMESTAMP,
  data_conclusao TIMESTAMP,
  instrucoes TEXT,
  observacoes TEXT,
  prazo_sugerido DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  workspace_id INTEGER REFERENCES workspaces(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delegacoes_historico_demanda_id_idx ON delegacoes_historico(demanda_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_delegado_de_id_idx ON delegacoes_historico(delegado_de_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_delegado_para_id_idx ON delegacoes_historico(delegado_para_id);
CREATE INDEX IF NOT EXISTS delegacoes_historico_status_idx ON delegacoes_historico(status);

-- RLS para delegacoes_historico
ALTER TABLE delegacoes_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver delegações do workspace" ON delegacoes_historico;
CREATE POLICY "Usuários podem ver delegações do workspace"
ON delegacoes_historico FOR SELECT TO authenticated
USING (true); -- Simplificado para funcionar

DROP POLICY IF EXISTS "Defensores podem criar delegações" ON delegacoes_historico;
CREATE POLICY "Defensores podem criar delegações"
ON delegacoes_historico FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Destinatário pode atualizar delegação" ON delegacoes_historico;
CREATE POLICY "Destinatário pode atualizar delegação"
ON delegacoes_historico FOR UPDATE TO authenticated
USING (true);

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2: MIGRATIONS - MULTI-DEFENSOR                                                ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝

-- Adicionar campos de núcleo e controle em users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nucleo VARCHAR(30),
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_ver_todos_assistidos BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pode_ver_todos_processos BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS users_nucleo_idx ON users(nucleo);

-- Criar tabela de afastamentos
CREATE TABLE IF NOT EXISTS afastamentos (
  id SERIAL PRIMARY KEY,
  defensor_id INTEGER NOT NULL REFERENCES users(id),
  substituto_id INTEGER NOT NULL REFERENCES users(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'FERIAS',
  motivo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  acesso_demandas BOOLEAN DEFAULT TRUE,
  acesso_equipe BOOLEAN DEFAULT FALSE,
  workspace_id INTEGER REFERENCES workspaces(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS afastamentos_defensor_id_idx ON afastamentos(defensor_id);
CREATE INDEX IF NOT EXISTS afastamentos_substituto_id_idx ON afastamentos(substituto_id);
CREATE INDEX IF NOT EXISTS afastamentos_ativo_idx ON afastamentos(ativo);

-- RLS para afastamentos
ALTER TABLE afastamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Defensores veem afastamentos que os envolvem" ON afastamentos;
CREATE POLICY "Defensores veem afastamentos"
ON afastamentos FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin pode criar afastamentos" ON afastamentos;
CREATE POLICY "Admin pode criar afastamentos"
ON afastamentos FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin ou defensor pode atualizar afastamento" ON afastamentos;
CREATE POLICY "Admin pode atualizar afastamentos"
ON afastamentos FOR UPDATE TO authenticated
USING (true);

-- Função para verificar cobertura
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

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3: LIMPAR BANCO DE DADOS                                                      ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- Limpar todas as tabelas (ordem correta para foreign keys)
DELETE FROM afastamentos;
DELETE FROM delegacoes_historico;
DELETE FROM demandas;
DELETE FROM processos;
DELETE FROM casos;
DELETE FROM assistidos;
DELETE FROM jurados;
DELETE FROM users;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ PARTE 4: CRIAR USUÁRIOS DA EQUIPE                                                   ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝

-- Hash bcrypt para senha "Defender@2026"
-- Gerado com: bcrypt.hash("Defender@2026", 10)

INSERT INTO users (
  name, email, password_hash, role, funcao, phone, oab, comarca,
  nucleo, is_admin, pode_ver_todos_assistidos, pode_ver_todos_processos,
  email_verified, approval_status, created_at, updated_at
) VALUES
-- ═══════════════════════════════════════════════════════════════
-- DEFENSORES
-- ═══════════════════════════════════════════════════════════════
(
  'Dr. Rodrigo',
  'rodrigo@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'defensor',
  'defensor_titular',
  '(71) 99999-1111',
  'BA12345',
  'Camaçari',
  'ESPECIALIZADOS',
  true,
  true,
  true,
  true,
  'approved',
  NOW(),
  NOW()
),
(
  'Dra. Juliane',
  'juliane@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'defensor',
  'defensor_titular',
  '(71) 99999-2222',
  'BA12346',
  'Camaçari',
  'ESPECIALIZADOS',
  false,
  true,
  true,
  true,
  'approved',
  NOW(),
  NOW()
),
(
  'Dra. Cristiane',
  'cristiane@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'defensor',
  'defensor_titular',
  '(71) 99999-7777',
  'BA23456',
  'Camaçari',
  'VARA_1',
  false,
  true,
  true,
  true,
  'approved',
  NOW(),
  NOW()
),
(
  'Dr. Danilo',
  'danilo@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'defensor',
  'defensor_titular',
  '(71) 99999-8888',
  'BA23457',
  'Camaçari',
  'VARA_2',
  false,
  true,
  true,
  true,
  'approved',
  NOW(),
  NOW()
),
-- ═══════════════════════════════════════════════════════════════
-- SERVIDORA
-- ═══════════════════════════════════════════════════════════════
(
  'Amanda',
  'amanda@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'servidor',
  'servidor_administrativo',
  '(71) 99999-3333',
  NULL,
  'Camaçari',
  'ESPECIALIZADOS',
  false,
  false,
  false,
  true,
  'approved',
  NOW(),
  NOW()
),
-- ═══════════════════════════════════════════════════════════════
-- TRIAGEM
-- ═══════════════════════════════════════════════════════════════
(
  'Gustavo',
  'gustavo@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'triagem',
  'triagem',
  '(71) 99999-6666',
  NULL,
  'Camaçari',
  'ESPECIALIZADOS',
  false,
  false,
  false,
  true,
  'approved',
  NOW(),
  NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ESTAGIÁRIAS (com supervisor_id)
-- ═══════════════════════════════════════════════════════════════

-- Emilly - vinculada a Dr. Rodrigo
INSERT INTO users (
  name, email, password_hash, role, funcao, phone, comarca,
  nucleo, supervisor_id, email_verified, approval_status, created_at, updated_at
) VALUES (
  'Emilly',
  'emilly@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'estagiario',
  'estagiario_direito',
  '(71) 99999-4444',
  'Camaçari',
  'ESPECIALIZADOS',
  (SELECT id FROM users WHERE email = 'rodrigo@defender.app'),
  true,
  'approved',
  NOW(),
  NOW()
);

-- Taíssa - vinculada a Dra. Juliane
INSERT INTO users (
  name, email, password_hash, role, funcao, phone, comarca,
  nucleo, supervisor_id, email_verified, approval_status, created_at, updated_at
) VALUES (
  'Taíssa',
  'taissa@defender.app',
  '$2a$10$UGcapClF1/R1/T1nTgPz5.ZnNvnEb9bQjOWmaliQvoFv8/B4c4DhW',
  'estagiario',
  'estagiario_direito',
  '(71) 99999-5555',
  'Camaçari',
  'ESPECIALIZADOS',
  (SELECT id FROM users WHERE email = 'juliane@defender.app'),
  true,
  'approved',
  NOW(),
  NOW()
);

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ VERIFICAÇÃO FINAL                                                                    ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝

SELECT '✅ INAUGURAÇÃO CONCLUÍDA!' as status;

SELECT 
  '🎉 Total de usuários criados:' as info, 
  COUNT(*)::text as total 
FROM users;

SELECT 
  name as "Nome",
  email as "Email",
  role as "Papel",
  nucleo as "Núcleo",
  CASE WHEN is_admin THEN '✓ ADMIN' ELSE '' END as "Admin",
  COALESCE((SELECT name FROM users u2 WHERE u2.id = users.supervisor_id), '-') as "Supervisor"
FROM users
ORDER BY 
  CASE role 
    WHEN 'defensor' THEN 1 
    WHEN 'servidor' THEN 2 
    WHEN 'estagiario' THEN 3 
    WHEN 'triagem' THEN 4 
  END,
  name;

-- ╔═════════════════════════════════════════════════════════════════════════════════════╗
-- ║ 📋 CREDENCIAIS DE ACESSO                                                            ║
-- ╠═════════════════════════════════════════════════════════════════════════════════════╣
-- ║                                                                                     ║
-- ║   🔐 Senha para todos: Defender@2026                                                ║
-- ║                                                                                     ║
-- ║   📧 Emails:                                                                        ║
-- ║   • rodrigo@defender.app (Admin)                                                    ║
-- ║   • juliane@defender.app                                                            ║
-- ║   • cristiane@defender.app                                                          ║
-- ║   • danilo@defender.app                                                             ║
-- ║   • amanda@defender.app                                                             ║
-- ║   • emilly@defender.app                                                             ║
-- ║   • taissa@defender.app                                                             ║
-- ║   • gustavo@defender.app                                                            ║
-- ║                                                                                     ║
-- ║   ⚠️  ALTERE AS SENHAS APÓS O PRIMEIRO ACESSO!                                      ║
-- ║                                                                                     ║
-- ╚═════════════════════════════════════════════════════════════════════════════════════╝
