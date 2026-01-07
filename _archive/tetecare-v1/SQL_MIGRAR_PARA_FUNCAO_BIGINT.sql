-- ============================================
-- MIGRAR PARA FUNÇÃO BIGINT (ZERO-DOWNTIME)
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- 
-- ESTRATÉGIA: Criar nova função com nome diferente e migrar políticas
-- Isso evita DROP CASCADE e mantém as políticas ativas durante a migração
-- ============================================

-- ============================================
-- PASSO 1: Criar nova função extract_tutor_id_from_path_bigint
-- ============================================

CREATE OR REPLACE FUNCTION public.extract_tutor_id_from_path_bigint(
  file_path text
) RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  path_parts text[];
  tutor_id_str text;
BEGIN
  -- Retorna NULL se file_path for NULL ou vazio
  IF file_path IS NULL OR file_path = '' THEN
    RETURN NULL;
  END IF;
  
  -- Divide o caminho por '/'
  path_parts := string_to_array(file_path, '/');
  
  -- Extrai o segundo elemento (índice 2) que deve ser o tutorId
  -- Exemplo: 'tutors/123/arquivo.pdf' -> path_parts[2] = '123'
  IF array_length(path_parts, 1) >= 2 THEN
    tutor_id_str := path_parts[2];
    BEGIN
      RETURN tutor_id_str::bigint;  -- ✅ Retorna bigint
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================
-- PASSO 2: Atualizar políticas para usar a nova função
-- ============================================

-- POLÍTICA 1: staff_policy_select
ALTER POLICY "staff_policy_select" ON storage.objects
USING (
  bucket_id = 'staff'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path_bigint(storage.objects.name)  -- ✅ Nova função
    )
  )
);

-- POLÍTICA 2: tutors_policy_select
ALTER POLICY "tutors_policy_select" ON storage.objects
USING (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path_bigint(storage.objects.name)  -- ✅ Nova função
    )
  )
);

-- POLÍTICA 3: tutors_policy_insert
ALTER POLICY "tutors_policy_insert" ON storage.objects
WITH CHECK (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path_bigint(storage.objects.name)  -- ✅ Nova função
    )
  )
);

-- POLÍTICA 4: tutors_policy_update
ALTER POLICY "tutors_policy_update" ON storage.objects
USING (
  bucket_id = 'tutors'::text 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = (SELECT auth.uid())
        AND users.id = public.extract_tutor_id_from_path_bigint(storage.objects.name)  -- ✅ Nova função
    )
  )
);

-- ============================================
-- PASSO 3: Validação - Verificar nova função
-- ============================================

-- Verificar que a nova função existe e retorna bigint
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path_bigint';

-- Resultado esperado:
-- function_name: extract_tutor_id_from_path_bigint
-- arguments: file_path text
-- return_type: bigint

-- ============================================
-- PASSO 4: Validação - Testar nova função
-- ============================================

-- Teste 1: Caminho válido
SELECT 
  'tutors/123/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path_bigint('tutors/123/arquivo.pdf') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path_bigint('tutors/123/arquivo.pdf')) as id_type;
-- Resultado esperado: extracted_id = 123, id_type = bigint

-- Teste 2: Caminho com staff
SELECT 
  'staff/456/foto.jpg' as test_path,
  public.extract_tutor_id_from_path_bigint('staff/456/foto.jpg') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path_bigint('staff/456/foto.jpg')) as id_type;
-- Resultado esperado: extracted_id = 456, id_type = bigint

-- Teste 3: Número grande (testar bigint)
SELECT 
  'tutors/9223372036854775807/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path_bigint('tutors/9223372036854775807/arquivo.pdf') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path_bigint('tutors/9223372036854775807/arquivo.pdf')) as id_type;
-- Resultado esperado: extracted_id = 9223372036854775807, id_type = bigint

-- ============================================
-- PASSO 5: Validação - Verificar políticas
-- ============================================

-- Verificar que as políticas usam a nova função
SELECT 
  p.polname as policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation,
  pg_get_expr(p.qual, p.polrelid) as stored_using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as stored_with_check_expression
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
ORDER BY p.polname, p.polcmd;

-- Verificar que todas usam a nova função (não a antiga)
SELECT 
  p.polname as policy_name,
  CASE 
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_id_from_path_bigint%' THEN '✅ Usa nova função'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_id_from_path_bigint%' THEN '✅ Usa nova função'
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_id_from_path(%' 
      AND pg_get_expr(p.qual, p.polrelid) NOT LIKE '%extract_tutor_id_from_path_bigint%' THEN '❌ Ainda usa função antiga'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_id_from_path(%' 
      AND pg_get_expr(p.polwithcheck, p.polrelid) NOT LIKE '%extract_tutor_id_from_path_bigint%' THEN '❌ Ainda usa função antiga'
    ELSE '⚠️ VERIFICAR'
  END as validation
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
ORDER BY p.polname;

-- Resultado esperado: Todas as linhas devem mostrar "✅ Usa nova função"

-- ============================================
-- PASSO 6 (OPCIONAL): Remover função antiga
-- ============================================
-- 
-- Execute este passo APENAS após validar que tudo está funcionando
-- e que nenhuma outra política ou código usa a função antiga
-- ============================================

-- Verificar se há outras referências à função antiga
SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_id_from_path(%'
      AND pg_get_expr(p.qual, p.polrelid) NOT LIKE '%extract_tutor_id_from_path_bigint%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_id_from_path(%'
      AND pg_get_expr(p.polwithcheck, p.polrelid) NOT LIKE '%extract_tutor_id_from_path_bigint%'
  );

-- Resultado esperado: 0 linhas (nenhuma política usa a função antiga)

-- Se não houver outras referências, pode remover a função antiga:
-- DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text);

-- ============================================
-- FIM
-- ============================================
-- 
-- Após executar este script:
-- 1. Nova função criada (retorna bigint)
-- 2. Todas as 4 políticas migradas para a nova função
-- 3. Sistema RLS funcionando corretamente (zero-downtime)
-- 4. Função antiga pode ser removida (opcional, após validação)
-- ============================================


