-- ============================================
-- QUERIES DE VALIDAÇÃO
-- Execute estas queries para verificar se tudo foi criado corretamente
-- ============================================

-- ============================================
-- 1. VERIFICAR FUNÇÕES CRIADAS
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname IN ('is_tutor_of_pet', 'extract_pet_id_from_path', 'is_admin', 'extract_tutor_id_from_path')
ORDER BY proname;

-- Resultado esperado: 4 funções listadas

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS CRIADAS
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    ELSE cmd
  END as operation_type
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Resultado esperado: 48 políticas listadas (12 buckets × 4 operações)

-- ============================================
-- 3. CONTAR TOTAL DE POLÍTICAS
-- ============================================

SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Resultado esperado: total_policies = 48

-- ============================================
-- 4. VERIFICAR POLÍTICAS POR BUCKET
-- ============================================

SELECT 
  CASE 
    WHEN policyname LIKE '%pets%' THEN 'pets'
    WHEN policyname LIKE '%daycare%' THEN 'daycare-photos'
    WHEN policyname LIKE '%documents%' THEN 'documents'
    WHEN policyname LIKE '%financial%' THEN 'financial'
    WHEN policyname LIKE '%reports%' THEN 'reports'
    WHEN policyname LIKE '%products%' THEN 'products'
    WHEN policyname LIKE '%health%' THEN 'health-logs'
    WHEN policyname LIKE '%tutors%' THEN 'tutors'
    WHEN policyname LIKE '%staff%' THEN 'staff'
    WHEN policyname LIKE '%wall%' THEN 'wall'
    WHEN policyname LIKE '%partnerships%' THEN 'partnerships'
    WHEN policyname LIKE '%marketing%' THEN 'marketing'
    ELSE 'other'
  END as bucket_name,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
GROUP BY bucket_name
ORDER BY bucket_name;

-- Resultado esperado: 12 buckets, cada um com 4 políticas

-- ============================================
-- 5. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Resultado esperado: rls_enabled = true

-- ============================================
-- FIM
-- ============================================


