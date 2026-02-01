-- ═══════════════════════════════════════════════════════════════════════════
-- 🎉 DEFENDER - SCRIPT DE INAUGURAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Este script prepara o banco de dados para produção:
-- 1. LIMPA todas as tabelas (reset completo)
-- 2. CRIA os defensores da Defensoria de Camaçari
-- 3. CRIA a equipe do Núcleo Especializados
--
-- ⚠️ ATENÇÃO: Este script APAGA todos os dados existentes!
-- 🔐 Senha padrão: Defender@2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 1: LIMPAR BANCO DE DADOS (reset completo)
-- ════════════════════════════════════════════════════════════════════════════

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- Limpar tabelas na ordem correta (respeitando foreign keys)
TRUNCATE TABLE 
  observacoes_jurado,
  avaliacoes_juri,
  conselho_sentenca,
  sessoes_plenarias,
  jurados,
  master_prompt_juri,
  delegacoes_historico,
  afastamentos,
  eventos,
  demandas,
  processos,
  casos,
  assistidos,
  users
CASCADE;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- Reset de sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE assistidos_id_seq RESTART WITH 1;
ALTER SEQUENCE processos_id_seq RESTART WITH 1;
ALTER SEQUENCE casos_id_seq RESTART WITH 1;
ALTER SEQUENCE demandas_id_seq RESTART WITH 1;
ALTER SEQUENCE eventos_id_seq RESTART WITH 1;
ALTER SEQUENCE jurados_id_seq RESTART WITH 1;

-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 2: INSERIR DEFENSORES
-- ════════════════════════════════════════════════════════════════════════════

-- Senha: Defender@2026 (bcrypt hash)
-- Gerado com: await bcrypt.hash("Defender@2026", 10)
-- Hash: $2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e

INSERT INTO users (
  name, email, password_hash, role, funcao, phone, oab, comarca,
  nucleo, is_admin, pode_ver_todos_assistidos, pode_ver_todos_processos,
  email_verified, approval_status, created_at, updated_at
) VALUES
-- Dr. Rodrigo (Admin - Núcleo Especializados)
(
  'Dr. Rodrigo',
  'rodrigo@defender.app',
  '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
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
-- Dra. Juliane (Núcleo Especializados)
(
  'Dra. Juliane',
  'juliane@defender.app',
  '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
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
-- Dra. Cristiane (1ª Vara Criminal)
(
  'Dra. Cristiane',
  'cristiane@defender.app',
  '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
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
-- Dr. Danilo (2ª Vara Criminal)
(
  'Dr. Danilo',
  'danilo@defender.app',
  '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
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
);

-- ════════════════════════════════════════════════════════════════════════════
-- PARTE 3: INSERIR EQUIPE (Servidores, Estagiários, Triagem)
-- ════════════════════════════════════════════════════════════════════════════

-- Pegar IDs dos defensores para vincular estagiários
DO $$
DECLARE
  v_rodrigo_id INT;
  v_juliane_id INT;
BEGIN
  -- Buscar IDs dos defensores
  SELECT id INTO v_rodrigo_id FROM users WHERE email = 'rodrigo@defender.app';
  SELECT id INTO v_juliane_id FROM users WHERE email = 'juliane@defender.app';

  -- Amanda (Servidora Administrativa)
  INSERT INTO users (
    name, email, password_hash, role, funcao, phone, comarca,
    nucleo, email_verified, approval_status, created_at, updated_at
  ) VALUES (
    'Amanda',
    'amanda@defender.app',
    '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
    'servidor',
    'servidor_administrativo',
    '(71) 99999-3333',
    'Camaçari',
    'ESPECIALIZADOS',
    true,
    'approved',
    NOW(),
    NOW()
  );

  -- Emilly (Estagiária - vinculada a Dr. Rodrigo)
  INSERT INTO users (
    name, email, password_hash, role, funcao, phone, comarca,
    nucleo, supervisor_id, email_verified, approval_status, created_at, updated_at
  ) VALUES (
    'Emilly',
    'emilly@defender.app',
    '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
    'estagiario',
    'estagiario_direito',
    '(71) 99999-4444',
    'Camaçari',
    'ESPECIALIZADOS',
    v_rodrigo_id,
    true,
    'approved',
    NOW(),
    NOW()
  );

  -- Taíssa (Estagiária - vinculada a Dra. Juliane)
  INSERT INTO users (
    name, email, password_hash, role, funcao, phone, comarca,
    nucleo, supervisor_id, email_verified, approval_status, created_at, updated_at
  ) VALUES (
    'Taíssa',
    'taissa@defender.app',
    '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
    'estagiario',
    'estagiario_direito',
    '(71) 99999-5555',
    'Camaçari',
    'ESPECIALIZADOS',
    v_juliane_id,
    true,
    'approved',
    NOW(),
    NOW()
  );

  -- Gustavo (Triagem)
  INSERT INTO users (
    name, email, password_hash, role, funcao, phone, comarca,
    nucleo, email_verified, approval_status, created_at, updated_at
  ) VALUES (
    'Gustavo',
    'gustavo@defender.app',
    '$2a$10$K8HvqS/X.B1nKMoF0Q3WYOpQTy5Pp3zxPQ9NvH.d1x8m3FyZ0Yx6e',
    'triagem',
    'triagem',
    '(71) 99999-6666',
    'Camaçari',
    'ESPECIALIZADOS',
    true,
    'approved',
    NOW(),
    NOW()
  );
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════════════════════

SELECT 
  '🎉 INAUGURAÇÃO CONCLUÍDA!' as status,
  COUNT(*) as total_usuarios
FROM users;

SELECT 
  name,
  email,
  role,
  nucleo,
  CASE WHEN is_admin THEN '✓ ADMIN' ELSE '' END as admin,
  CASE WHEN supervisor_id IS NOT NULL THEN 
    (SELECT name FROM users u2 WHERE u2.id = users.supervisor_id)
  ELSE '' END as supervisor
FROM users
ORDER BY 
  CASE role 
    WHEN 'defensor' THEN 1 
    WHEN 'servidor' THEN 2 
    WHEN 'estagiario' THEN 3 
    WHEN 'triagem' THEN 4 
  END,
  name;

-- ════════════════════════════════════════════════════════════════════════════
-- 📋 CREDENCIAIS DE ACESSO
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- Senha para todos: Defender@2026
-- 
-- Emails:
-- - rodrigo@defender.app (Admin)
-- - juliane@defender.app
-- - cristiane@defender.app
-- - danilo@defender.app
-- - amanda@defender.app
-- - emilly@defender.app
-- - taissa@defender.app
-- - gustavo@defender.app
--
-- ⚠️ ALTERE AS SENHAS APÓS O PRIMEIRO ACESSO!
-- ════════════════════════════════════════════════════════════════════════════
