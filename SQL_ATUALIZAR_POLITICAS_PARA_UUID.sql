-- ============================================
-- ATUALIZAR POLÍTICAS PARA USAR UUID
-- Use este script APENAS se users.id for UUID
-- Execute APÓS criar a função extract_tutor_uuid_from_path
-- ============================================
-- 
-- ATENÇÃO: Execute este script apenas se a verificação mostrar que users.id é UUID
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
        AND users.id = public.extract_tutor_uuid_from_path(storage.objects.name)  -- ✅ Usa UUID
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
        AND users.id = public.extract_tutor_uuid_from_path(storage.objects.name)  -- ✅ Usa UUID
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
        AND users.id = public.extract_tutor_uuid_from_path(storage.objects.name)  -- ✅ Usa UUID
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
        AND users.id = public.extract_tutor_uuid_from_path(storage.objects.name)  -- ✅ Usa UUID
    )
  )
);

-- ============================================
-- VALIDAÇÃO: Verificar expressões armazenadas
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

-- Verificar que todas usam extract_tutor_uuid_from_path
SELECT 
  p.polname as policy_name,
  CASE 
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_uuid_from_path%' THEN '✅ CORRETO'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_uuid_from_path%' THEN '✅ CORRETO'
    ELSE '❌ VERIFICAR'
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

-- ============================================
-- FIM
-- ============================================


