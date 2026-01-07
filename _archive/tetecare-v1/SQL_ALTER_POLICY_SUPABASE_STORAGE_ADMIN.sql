-- ============================================
-- ALTER POLICY - CORRIGIR POLÍTICAS DE supabase_storage_admin
-- Execute este script no SQL Editor do Supabase Dashboard
-- O SQL Editor geralmente tem permissões elevadas para alterar políticas
-- ============================================

-- ============================================
-- POLÍTICA 1: staff_policy_select
-- ============================================

ALTER POLICY "staff_policy_select" ON storage.objects
USING (
  bucket_id = 'staff'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 2: tutors_policy_select
-- ============================================

ALTER POLICY "tutors_policy_select" ON storage.objects
USING (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 3: tutors_policy_insert
-- ============================================

ALTER POLICY "tutors_policy_insert" ON storage.objects
WITH CHECK (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 4: tutors_policy_update
-- ============================================

ALTER POLICY "tutors_policy_update" ON storage.objects
USING (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- VALIDAÇÃO: Verificar expressões armazenadas
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
  pg_get_expr(p.qual, p.polrelid) as stored_using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as stored_with_check_expression
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
-- VALIDAÇÃO: Verificar que NÃO há mais referências a users.name
-- ============================================

SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    pg_get_expr(p.qual, p.polrelid) LIKE '%users.name%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%users.name%'
  );

-- Resultado esperado: 0 linhas (nenhuma política deve usar users.name)

-- ============================================
-- VALIDAÇÃO ADICIONAL: Verificar que todas usam 'name' corretamente
-- ============================================

SELECT 
  p.polname as policy_name,
  CASE 
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_id_from_path(name)%' THEN '✅ CORRETO'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_id_from_path(name)%' THEN '✅ CORRETO'
    ELSE '❌ VERIFICAR'
  END as status,
  CASE 
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%users.name%' THEN '❌ ERRADO: usa users.name'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%users.name%' THEN '❌ ERRADO: usa users.name'
    ELSE '✅ OK'
  END as validation
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND p.polname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY p.polname;

-- Resultado esperado: Todas as linhas devem mostrar "✅ CORRETO" e "✅ OK"

-- ============================================
-- FIM
-- ============================================
-- 
-- Após executar este script:
-- 1. Verificar que a primeira query de validação mostra as expressões corretas
-- 2. Verificar que a segunda query retorna 0 linhas (sem users.name)
-- 3. Verificar que a terceira query mostra todas como "✅ CORRETO" e "✅ OK"
-- ============================================


