-- ============================================
-- LIMPAR POLÍTICAS ANTIGAS/DUPLICADAS
-- Execute este script para remover políticas que não seguem o padrão
-- ============================================

-- ============================================
-- POLÍTICAS ANTIGAS DO BUCKET: documents
-- ============================================

DROP POLICY IF EXISTS "storage_documents_user_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_user_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_insert" ON storage.objects;

-- ============================================
-- VERIFICAR POLÍTICAS RESTANTES DO BUCKET: documents
-- ============================================

SELECT 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY policyname;

-- Resultado esperado: Apenas 4 políticas:
-- documents_policy_select
-- documents_policy_insert
-- documents_policy_update
-- documents_policy_delete

-- ============================================
-- LIMPAR OUTRAS POLÍTICAS ANTIGAS (se houver)
-- ============================================

-- Remover políticas que não seguem o padrão {bucket}_policy_{operacao}
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        -- Políticas que não seguem o padrão
        policyname NOT LIKE '%_policy_select'
        AND policyname NOT LIKE '%_policy_insert'
        AND policyname NOT LIKE '%_policy_update'
        AND policyname NOT LIKE '%_policy_delete'
        -- Mas são relacionadas aos nossos buckets
        AND (
          policyname LIKE '%pets%'
          OR policyname LIKE '%daycare%'
          OR policyname LIKE '%documents%'
          OR policyname LIKE '%financial%'
          OR policyname LIKE '%reports%'
          OR policyname LIKE '%products%'
          OR policyname LIKE '%health%'
          OR policyname LIKE '%tutors%'
          OR policyname LIKE '%staff%'
          OR policyname LIKE '%wall%'
          OR policyname LIKE '%partnerships%'
          OR policyname LIKE '%marketing%'
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Removida política: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================
-- LISTAR TODAS AS POLÍTICAS FINAIS
-- ============================================

SELECT 
  policyname,
  cmd as operation,
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
  END as bucket_name
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY bucket_name, operation;

-- Resultado esperado: 48 políticas, todas seguindo o padrão {bucket}_policy_{operacao}


