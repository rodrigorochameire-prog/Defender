-- ============================================
-- RECRIAR AS 4 POLÍTICAS FINAIS
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- 
-- Este script corrige as políticas que ainda referenciam users.name
-- A função extract_tutor_id_from_path está correta, o problema está nas políticas
-- ============================================

-- ============================================
-- POLÍTICA 1: staff_policy_select
-- ============================================

DROP POLICY IF EXISTS "staff_policy_select" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 2: tutors_policy_select
-- ============================================

DROP POLICY IF EXISTS "tutors_policy_select" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 3: tutors_policy_insert
-- ============================================

DROP POLICY IF EXISTS "tutors_policy_insert" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- POLÍTICA 4: tutors_policy_update
-- ============================================

DROP POLICY IF EXISTS "tutors_policy_update" ON storage.objects;

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO: usa 'name' (caminho do arquivo)
    )
  )
);

-- ============================================
-- VALIDAÇÃO: Verificar se não há mais referências a users.name
-- ============================================

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
-- VALIDAÇÃO ADICIONAL: Verificar as 4 políticas recriadas
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE with_check
  END as expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY policyname, cmd;

-- Verificar que todas usam extract_tutor_id_from_path(name) e NÃO users.name
-- Todas as expressões devem conter: extract_tutor_id_from_path(name)
-- Nenhuma expressão deve conter: users.name

-- ============================================
-- VALIDAÇÃO FINAL: Usar pg_get_policydef para ver definição completa
-- ============================================

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
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY p.policyname;

-- ============================================
-- FIM
-- ============================================
-- 
-- Após executar este script:
-- 1. Verificar que a primeira query retornou 0 linhas
-- 2. Verificar que as 4 políticas foram recriadas
-- 3. Verificar que todas usam extract_tutor_id_from_path(name)
-- ============================================


