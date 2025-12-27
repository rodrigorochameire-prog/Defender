-- ============================================
-- CORREÇÕES DE POLÍTICAS RLS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- ============================================
-- PROBLEMA 1: Corrigir políticas de STAFF
-- ============================================
-- ❌ ERRADO: extract_tutor_id_from_path(users.name)
-- ✅ CORRETO: extract_tutor_id_from_path(name)

DROP POLICY IF EXISTS "staff_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_delete" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRIGIDO: usa 'name' (caminho do arquivo)
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
-- PROBLEMA 2: Corrigir políticas de TUTORS
-- ============================================
-- ❌ ERRADO: extract_tutor_id_from_path(users.name)
-- ✅ CORRETO: extract_tutor_id_from_path(name)

DROP POLICY IF EXISTS "tutors_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_delete" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRIGIDO: usa 'name' (caminho do arquivo)
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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRIGIDO: usa 'name' (caminho do arquivo)
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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRIGIDO: usa 'name' (caminho do arquivo)
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
-- PROBLEMA 3 (OPCIONAL): Melhorar wall_policy_insert
-- ============================================
-- Recomendação: Forçar que o usuário seja owner ao inserir
-- Descomente as linhas abaixo se desejar aplicar esta correção

/*
DROP POLICY IF EXISTS "wall_policy_insert" ON storage.objects;

CREATE POLICY "wall_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wall' 
  AND (metadata->>'owner')::uuid = (SELECT auth.uid())  -- ✅ Força o usuário a ser owner
);
*/

-- ============================================
-- VALIDAÇÃO: Verificar se as correções foram aplicadas
-- ============================================

-- Verificar políticas de staff
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'staff%'
ORDER BY cmd;

-- Verificar políticas de tutors
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'tutors%'
ORDER BY cmd;

-- Verificar se não há mais referências a users.name
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
-- FIM
-- ============================================


