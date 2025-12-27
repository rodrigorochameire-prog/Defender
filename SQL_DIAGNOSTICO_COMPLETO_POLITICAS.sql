-- ============================================
-- DIAGNÓSTICO COMPLETO DAS POLÍTICAS
-- Execute este script para entender o problema
-- ============================================

-- ============================================
-- QUERY 1: Informações detalhadas das políticas problemáticas
-- ============================================

SELECT 
  p.polname as policy_name,
  p.polrelid::regclass as table_name,
  r.rolname as policy_owner,
  p.oid as policy_oid,
  pg_get_expr(p.qual, p.polrelid) as stored_using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as stored_with_check_expression,
  p.polcmd as operation,
  p.polpermissive as is_permissive,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'UNKNOWN'
  END as operation_name
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_roles r ON r.oid = p.polowner
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND p.polname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY p.polname, p.polcmd;

-- ============================================
-- QUERY 2: Verificar se há políticas duplicadas
-- ============================================

SELECT 
  p.polname as policy_name,
  COUNT(*) as policy_count,
  array_agg(DISTINCT r.rolname) as owners,
  array_agg(p.oid) as policy_oids
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_roles r ON r.oid = p.polowner
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND p.polname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
GROUP BY p.polname
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 linhas (não deve haver duplicatas)

-- ============================================
-- QUERY 3: Verificar todas as políticas de staff e tutors
-- ============================================

SELECT 
  p.polname as policy_name,
  r.rolname as policy_owner,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_roles r ON r.oid = p.polowner
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    p.polname LIKE 'staff%' 
    OR p.polname LIKE 'tutors%'
  )
ORDER BY p.polname, p.polcmd;

-- ============================================
-- QUERY 4: Verificar role atual e permissões
-- ============================================

SELECT 
  current_user as current_role,
  session_user as session_role,
  current_setting('role') as current_setting_role;

-- ============================================
-- QUERY 5: Verificar se há referências a users.name em TODAS as políticas
-- ============================================

SELECT 
  p.polname as policy_name,
  r.rolname as policy_owner,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_roles r ON r.oid = p.polowner
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    pg_get_expr(p.qual, p.polrelid) LIKE '%users.name%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%users.name%'
  )
ORDER BY p.polname;

-- ============================================
-- FIM DO DIAGNÓSTICO
-- ============================================
-- 
-- Após executar, analise os resultados:
-- 1. Se policy_owner não for o role atual, precisamos executar como o owner correto
-- 2. Se houver duplicatas, precisamos remover as antigas
-- 3. Se as expressões estiverem corretas mas exibidas incorretamente, usar ALTER POLICY
-- ============================================


