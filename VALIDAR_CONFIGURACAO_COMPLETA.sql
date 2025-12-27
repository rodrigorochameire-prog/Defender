-- ============================================
-- VALIDAÇÃO COMPLETA DA CONFIGURAÇÃO RLS
-- Execute este script para verificar se tudo está correto
-- ============================================

-- ============================================
-- 1. VERIFICAR FUNÇÕES AUXILIARES
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname IN (
    'is_tutor_of_pet', 
    'extract_pet_id_from_path', 
    'is_admin', 
    'extract_tutor_id_from_path'
  )
ORDER BY proname;

-- Resultado esperado: 4 funções listadas

-- ============================================
-- 2. VERIFICAR TOTAL DE POLÍTICAS
-- ============================================

SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Resultado esperado: total_policies = 48

-- ============================================
-- 3. LISTAR TODAS AS POLÍTICAS
-- ============================================

SELECT 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Resultado esperado: 48 políticas listadas

-- ============================================
-- 4. VERIFICAR POLÍTICAS POR BUCKET
-- ============================================

SELECT 
  CASE 
    WHEN policyname LIKE 'pets%' THEN 'pets'
    WHEN policyname LIKE 'daycare%' THEN 'daycare-photos'
    WHEN policyname LIKE 'documents%' THEN 'documents'
    WHEN policyname LIKE 'financial%' THEN 'financial'
    WHEN policyname LIKE 'reports%' THEN 'reports'
    WHEN policyname LIKE 'products%' THEN 'products'
    WHEN policyname LIKE 'health%' THEN 'health-logs'
    WHEN policyname LIKE 'tutors%' THEN 'tutors'
    WHEN policyname LIKE 'staff%' THEN 'staff'
    WHEN policyname LIKE 'wall%' THEN 'wall'
    WHEN policyname LIKE 'partnerships%' THEN 'partnerships'
    WHEN policyname LIKE 'marketing%' THEN 'marketing'
  END as bucket_name,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
GROUP BY bucket_name
ORDER BY bucket_name;

-- Resultado esperado: 12 buckets, cada um com 4 políticas

-- ============================================
-- 5. VERIFICAR OPERAÇÕES POR BUCKET
-- ============================================

SELECT 
  CASE 
    WHEN policyname LIKE 'pets%' THEN 'pets'
    WHEN policyname LIKE 'daycare%' THEN 'daycare-photos'
    WHEN policyname LIKE 'documents%' THEN 'documents'
    WHEN policyname LIKE 'financial%' THEN 'financial'
    WHEN policyname LIKE 'reports%' THEN 'reports'
    WHEN policyname LIKE 'products%' THEN 'products'
    WHEN policyname LIKE 'health%' THEN 'health-logs'
    WHEN policyname LIKE 'tutors%' THEN 'tutors'
    WHEN policyname LIKE 'staff%' THEN 'staff'
    WHEN policyname LIKE 'wall%' THEN 'wall'
    WHEN policyname LIKE 'partnerships%' THEN 'partnerships'
    WHEN policyname LIKE 'marketing%' THEN 'marketing'
  END as bucket_name,
  cmd as operation,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
GROUP BY bucket_name, cmd
ORDER BY bucket_name, cmd;

-- Resultado esperado: Cada bucket deve ter 4 operações (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- 6. VERIFICAR SE RLS ESTÁ HABILITADO
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
-- 7. RESUMO FINAL
-- ============================================

SELECT 
  'Funções auxiliares' as item,
  COUNT(*)::text as status
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname IN ('is_tutor_of_pet', 'extract_pet_id_from_path', 'is_admin', 'extract_tutor_id_from_path')

UNION ALL

SELECT 
  'Políticas RLS' as item,
  COUNT(*)::text as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'

UNION ALL

SELECT 
  'RLS habilitado' as item,
  CASE WHEN rowsecurity THEN 'SIM' ELSE 'NÃO' END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Resultado esperado:
-- Funções auxiliares: 4
-- Políticas RLS: 48
-- RLS habilitado: SIM


