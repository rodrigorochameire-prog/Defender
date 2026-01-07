-- ============================================
-- ALTER POLICY - FORÇAR CORREÇÃO
-- Use este script APÓS o diagnóstico
-- Execute apenas se o diagnóstico indicar que é necessário
-- ============================================
-- 
-- ATENÇÃO: Este script usa ALTER POLICY em vez de DROP/CREATE
-- Isso pode funcionar melhor se houver problemas de ownership
-- ============================================

-- ============================================
-- POLÍTICA 1: staff_policy_select
-- ============================================

ALTER POLICY "staff_policy_select" ON storage.objects
USING (
  bucket_id = 'staff' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

-- ============================================
-- POLÍTICA 2: tutors_policy_select
-- ============================================

ALTER POLICY "tutors_policy_select" ON storage.objects
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

-- ============================================
-- POLÍTICA 3: tutors_policy_insert
-- ============================================

ALTER POLICY "tutors_policy_insert" ON storage.objects
WITH CHECK (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

-- ============================================
-- POLÍTICA 4: tutors_policy_update
-- ============================================

ALTER POLICY "tutors_policy_update" ON storage.objects
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

-- ============================================
-- VALIDAÇÃO: Verificar se a correção funcionou
-- ============================================

SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as stored_using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as stored_with_check_expression
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

-- Verificar que NÃO há mais referências a users.name
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

-- Resultado esperado: 0 linhas

-- ============================================
-- FIM
-- ============================================


