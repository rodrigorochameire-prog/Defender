-- ============================================
-- LISTAR TODAS AS POLÍTICAS COM DEFINIÇÕES COMPLETAS
-- Execute este script para ver todas as políticas e suas definições
-- ============================================

-- ============================================
-- LISTAGEM SIMPLES (usando pg_policies)
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- LISTAGEM COMPLETA (usando pg_get_policydef)
-- ============================================

SELECT 
  p.policyname,
  p.cmd as operation,
  p.roles,
  p.qual as using_expression,
  pg_get_policydef(p.oid) as full_definition
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE p.schemaname = 'storage' 
  AND p.tablename = 'objects'
ORDER BY p.policyname;

-- ============================================
-- IDENTIFICAR POLÍTICAS ANTIGAS/DUPLICADAS
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN policyname LIKE '%_policy_select' THEN '✅ Padrão correto'
    WHEN policyname LIKE '%_policy_insert' THEN '✅ Padrão correto'
    WHEN policyname LIKE '%_policy_update' THEN '✅ Padrão correto'
    WHEN policyname LIKE '%_policy_delete' THEN '✅ Padrão correto'
    ELSE '❌ Política antiga/duplicada'
  END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY status, policyname;

-- ============================================
-- CONTAR POLÍTICAS POR STATUS
-- ============================================

SELECT 
  CASE 
    WHEN policyname LIKE '%_policy_select' OR 
         policyname LIKE '%_policy_insert' OR 
         policyname LIKE '%_policy_update' OR 
         policyname LIKE '%_policy_delete' THEN 'Políticas corretas'
    ELSE 'Políticas antigas/duplicadas'
  END as categoria,
  COUNT(*) as quantidade
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
GROUP BY categoria;


