-- ============================================
-- FORÇAR RECRIAÇÃO DAS POLÍTICAS DE STAFF E TUTORS
-- Execute este script APÓS verificar/corrigir a função
-- ============================================

-- ============================================
-- REMOVER TODAS AS POLÍTICAS (garantir limpeza)
-- ============================================

-- Remover políticas de staff
DROP POLICY IF EXISTS "staff_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_delete" ON storage.objects;

-- Remover políticas de tutors
DROP POLICY IF EXISTS "tutors_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_delete" ON storage.objects;

-- ============================================
-- RECRIAR POLÍTICAS DE STAFF (CORRETAS)
-- ============================================

CREATE POLICY "staff_policy_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ Usa 'name' (caminho do arquivo)
    )
  )
);

CREATE POLICY "staff_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "staff_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "staff_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- RECRIAR POLÍTICAS DE TUTORS (CORRETAS)
-- ============================================

CREATE POLICY "tutors_policy_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ Usa 'name' (caminho do arquivo)
    )
  )
);

CREATE POLICY "tutors_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ Usa 'name' (caminho do arquivo)
    )
  )
);

CREATE POLICY "tutors_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ Usa 'name' (caminho do arquivo)
    )
  )
);

CREATE POLICY "tutors_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- VALIDAÇÃO: Verificar políticas criadas
-- ============================================

-- Verificar políticas de staff
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'staff%'
ORDER BY cmd;

-- Verificar políticas de tutors
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'tutors%'
ORDER BY cmd;

-- Verificar se NÃO há mais referências a users.name
SELECT 
  policyname,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    qual LIKE '%users.name%' 
    OR with_check LIKE '%users.name%'
  );

-- Resultado esperado: 0 linhas (nenhuma política deve usar users.name)

-- ============================================
-- VALIDAÇÃO ADICIONAL: Usar pg_get_policydef
-- ============================================

-- Verificar definição completa das políticas usando pg_get_policydef
SELECT 
  p.policyname,
  p.cmd as operation,
  pg_get_policydef(p.oid) as full_policy_definition
FROM pg_policies p
JOIN pg_policy pol ON pol.polname = p.policyname
WHERE p.schemaname = 'storage' 
  AND p.tablename = 'objects'
  AND p.policyname IN (
    'staff_policy_select',
    'staff_policy_insert',
    'staff_policy_update',
    'staff_policy_delete',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update',
    'tutors_policy_delete'
  )
ORDER BY p.policyname;

-- ============================================
-- FIM
-- ============================================


