-- ============================================
-- REMOVER POLÍTICAS DUPLICADAS E RECRIAR
-- Use este script se o diagnóstico mostrar duplicatas
-- ============================================
-- 
-- ATENÇÃO: Este script remove TODAS as políticas com os nomes especificados
-- e recria apenas uma versão correta de cada uma
-- ============================================

-- ============================================
-- PASSO 1: Remover TODAS as políticas (incluindo duplicatas)
-- ============================================

-- Remover usando OID (mais seguro se houver duplicatas)
DO $$
DECLARE
  policy_oid oid;
BEGIN
  -- Remover staff_policy_select (todas as versões)
  FOR policy_oid IN 
    SELECT p.oid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'staff_policy_select'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "staff_policy_select" ON storage.objects');
  END LOOP;

  -- Remover tutors_policy_select (todas as versões)
  FOR policy_oid IN 
    SELECT p.oid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'tutors_policy_select'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tutors_policy_select" ON storage.objects');
  END LOOP;

  -- Remover tutors_policy_insert (todas as versões)
  FOR policy_oid IN 
    SELECT p.oid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'tutors_policy_insert'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tutors_policy_insert" ON storage.objects');
  END LOOP;

  -- Remover tutors_policy_update (todas as versões)
  FOR policy_oid IN 
    SELECT p.oid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'objects'
      AND c.relnamespace = 'storage'::regnamespace
      AND p.polname = 'tutors_policy_update'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tutors_policy_update" ON storage.objects');
  END LOOP;
END $$;

-- ============================================
-- PASSO 2: Verificar que todas foram removidas
-- ============================================

SELECT 
  p.polname as policy_name,
  COUNT(*) as remaining_count
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
GROUP BY p.polname;

-- Resultado esperado: 0 linhas (todas removidas)

-- ============================================
-- PASSO 3: Recriar as políticas corretas
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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
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
        AND users.id = public.extract_tutor_id_from_path(name)  -- ✅ CORRETO
    )
  )
);

-- ============================================
-- PASSO 4: Validação final
-- ============================================

-- Verificar que há exatamente 1 política de cada tipo
SELECT 
  p.polname as policy_name,
  COUNT(*) as policy_count
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
GROUP BY p.polname;

-- Resultado esperado: 4 linhas, cada uma com policy_count = 1

-- Verificar que não há mais referências a users.name
SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    pg_get_expr(p.qual, p.polrelid) LIKE '%users.name%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%users.name%'
  );

-- Resultado esperado: 0 linhas

-- ============================================
-- FIM
-- ============================================


