-- ============================================
-- SCRIPT AUTOMÁTICO PARA LIMPAR POLÍTICAS ANTIGAS
-- Remove políticas que não seguem o padrão {bucket}_policy_{operacao}
-- ============================================

-- ============================================
-- PASSO 1: LISTAR POLÍTICAS NÃO CONFORMES
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  '❌ Política antiga/duplicada' as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    -- Políticas que não seguem o padrão {bucket}_policy_{operacao}
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
ORDER BY policyname;

-- ============================================
-- PASSO 2: REMOVER POLÍTICAS NÃO CONFORMES
-- ============================================
-- Execute apenas após revisar a lista acima!

DO $$
DECLARE
  policy_record RECORD;
  policies_to_drop text[] := ARRAY[]::text[];
BEGIN
  -- Coletar políticas não conformes
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        policyname NOT LIKE '%_policy_select'
        AND policyname NOT LIKE '%_policy_insert'
        AND policyname NOT LIKE '%_policy_update'
        AND policyname NOT LIKE '%_policy_delete'
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
    policies_to_drop := array_append(policies_to_drop, policy_record.policyname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Removida política: %', policy_record.policyname;
  END LOOP;
  
  IF array_length(policies_to_drop, 1) IS NULL THEN
    RAISE NOTICE 'Nenhuma política antiga encontrada para remover.';
  ELSE
    RAISE NOTICE 'Total de políticas removidas: %', array_length(policies_to_drop, 1);
  END IF;
END $$;

-- ============================================
-- PASSO 3: VALIDAR RESULTADO FINAL
-- ============================================

SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN policyname LIKE '%_policy_select' THEN '✅ SELECT'
    WHEN policyname LIKE '%_policy_insert' THEN '✅ INSERT'
    WHEN policyname LIKE '%_policy_update' THEN '✅ UPDATE'
    WHEN policyname LIKE '%_policy_delete' THEN '✅ DELETE'
    ELSE '❌ Não conforme'
  END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Resultado esperado: Apenas políticas com status ✅

-- ============================================
-- CONTAR POLÍTICAS FINAIS
-- ============================================

SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Resultado esperado: total_policies = 48 (12 buckets × 4 operações)


