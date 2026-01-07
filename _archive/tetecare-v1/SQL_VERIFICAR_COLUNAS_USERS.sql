-- ============================================
-- VERIFICAR ESTRUTURA REAL DA TABELA users
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Query 1: Listar todas as colunas da tabela users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Query 2: Verificar se as colunas existem (snake_case)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'open_id') THEN '✅ open_id existe'
    ELSE '❌ open_id NÃO existe'
  END as open_id_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN '✅ password_hash existe'
    ELSE '❌ password_hash NÃO existe'
  END as password_hash_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_method') THEN '✅ login_method existe'
    ELSE '❌ login_method NÃO existe'
  END as login_method_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN '✅ email_verified existe'
    ELSE '❌ email_verified NÃO existe'
  END as email_verified_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN '✅ created_at existe'
    ELSE '❌ created_at NÃO existe'
  END as created_at_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN '✅ updated_at existe'
    ELSE '❌ updated_at NÃO existe'
  END as updated_at_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_signed_in') THEN '✅ last_signed_in existe'
    ELSE '❌ last_signed_in NÃO existe'
  END as last_signed_in_status;

-- Query 3: Verificar se as colunas existem (camelCase com aspas)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'openId') THEN '✅ openId existe'
    ELSE '❌ openId NÃO existe'
  END as openId_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') THEN '✅ passwordHash existe'
    ELSE '❌ passwordHash NÃO existe'
  END as passwordHash_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'loginMethod') THEN '✅ loginMethod existe'
    ELSE '❌ loginMethod NÃO existe'
  END as loginMethod_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emailVerified') THEN '✅ emailVerified existe'
    ELSE '❌ emailVerified NÃO existe'
  END as emailVerified_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN '✅ createdAt existe'
    ELSE '❌ createdAt NÃO existe'
  END as createdAt_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN '✅ updatedAt existe'
    ELSE '❌ updatedAt NÃO existe'
  END as updatedAt_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastSignedIn') THEN '✅ lastSignedIn existe'
    ELSE '❌ lastSignedIn NÃO existe'
  END as lastSignedIn_status;
