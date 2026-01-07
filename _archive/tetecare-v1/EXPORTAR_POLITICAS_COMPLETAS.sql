-- ============================================
-- EXPORTAR DEFINIÇÕES COMPLETAS DAS POLÍTICAS
-- Execute este script para obter o SQL completo de todas as políticas
-- ============================================

-- ============================================
-- MÉTODO 1: Usando pg_policies (mais simples)
-- ============================================

SELECT 
  'CREATE POLICY "' || policyname || '"' || E'\n' ||
  'ON storage.objects FOR ' || cmd || E'\n' ||
  'TO ' || array_to_string(roles, ', ') || E'\n' ||
  CASE 
    WHEN qual IS NOT NULL THEN 'USING (' || qual || ')' || E'\n'
    ELSE ''
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK (' || with_check || ');'
    ELSE ';'
  END as policy_sql
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- MÉTODO 2: Listar com detalhes completos
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  array_to_string(roles, ', ') as target_roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- MÉTODO 3: Agrupar por bucket
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
    ELSE 'other'
  END as bucket_name,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY bucket_name, cmd;

-- ============================================
-- MÉTODO 4: Identificar possíveis duplicatas
-- ============================================

SELECT 
  bucket_id,
  cmd as operation,
  COUNT(*) as policy_count,
  array_agg(policyname) as policy_names
FROM (
  SELECT 
    CASE 
      WHEN qual LIKE '%bucket_id = ''pets''%' THEN 'pets'
      WHEN qual LIKE '%bucket_id = ''daycare-photos''%' THEN 'daycare-photos'
      WHEN qual LIKE '%bucket_id = ''documents''%' THEN 'documents'
      WHEN qual LIKE '%bucket_id = ''financial''%' THEN 'financial'
      WHEN qual LIKE '%bucket_id = ''reports''%' THEN 'reports'
      WHEN qual LIKE '%bucket_id = ''products''%' THEN 'products'
      WHEN qual LIKE '%bucket_id = ''health-logs''%' THEN 'health-logs'
      WHEN qual LIKE '%bucket_id = ''tutors''%' THEN 'tutors'
      WHEN qual LIKE '%bucket_id = ''staff''%' THEN 'staff'
      WHEN qual LIKE '%bucket_id = ''wall''%' THEN 'wall'
      WHEN qual LIKE '%bucket_id = ''partnerships''%' THEN 'partnerships'
      WHEN qual LIKE '%bucket_id = ''marketing''%' THEN 'marketing'
    END as bucket_id,
    cmd,
    policyname
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
) sub
GROUP BY bucket_id, cmd
HAVING COUNT(*) > 1
ORDER BY bucket_id, cmd;

-- Resultado esperado: Nenhuma linha (cada bucket deve ter apenas 1 política por operação)


