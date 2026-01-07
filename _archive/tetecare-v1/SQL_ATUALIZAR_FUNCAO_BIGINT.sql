-- ============================================
-- ATUALIZAR FUNÇÃO extract_tutor_id_from_path PARA RETORNAR BIGINT
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- 
-- PROBLEMA: users.id é BIGINT (int8), mas a função retorna INTEGER (int4)
-- SOLUÇÃO: Atualizar função para retornar BIGINT
-- ============================================

-- ============================================
-- ATUALIZAR FUNÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION public.extract_tutor_id_from_path(
  file_path text
) RETURNS bigint  -- ✅ MUDOU DE integer PARA bigint
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
      RETURN tutor_id_str::bigint;  -- ✅ MUDOU DE ::int PARA ::bigint
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================
-- VALIDAÇÃO: Verificar definição da função
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path';

-- Resultado esperado:
-- function_name: extract_tutor_id_from_path
-- arguments: file_path text
-- return_type: bigint  -- ✅ Deve ser bigint

-- ============================================
-- VALIDAÇÃO: Testar a função
-- ============================================

-- Teste 1: Caminho válido
SELECT 
  'tutors/123/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path('tutors/123/arquivo.pdf') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path('tutors/123/arquivo.pdf')) as id_type;
-- Resultado esperado: extracted_id = 123, id_type = bigint

-- Teste 2: Caminho com staff
SELECT 
  'staff/456/foto.jpg' as test_path,
  public.extract_tutor_id_from_path('staff/456/foto.jpg') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path('staff/456/foto.jpg')) as id_type;
-- Resultado esperado: extracted_id = 456, id_type = bigint

-- Teste 3: Caminho inválido (sem ID)
SELECT 
  'tutors/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path('tutors/arquivo.pdf') as extracted_id;
-- Resultado esperado: NULL

-- Teste 4: Caminho NULL
SELECT 
  NULL as test_path,
  public.extract_tutor_id_from_path(NULL) as extracted_id;
-- Resultado esperado: NULL

-- Teste 5: Número grande (testar bigint)
SELECT 
  'tutors/9223372036854775807/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path('tutors/9223372036854775807/arquivo.pdf') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path('tutors/9223372036854775807/arquivo.pdf')) as id_type;
-- Resultado esperado: extracted_id = 9223372036854775807, id_type = bigint

-- ============================================
-- VALIDAÇÃO: Verificar que as políticas ainda funcionam
-- ============================================

SELECT 
  p.polname as policy_name,
  r.rolname as policy_owner,
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
JOIN pg_roles r ON r.oid = p.polowner
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND p.polname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY p.polname, p.polcmd;

-- Verificar que todas usam extract_tutor_id_from_path
-- As políticas não precisam ser alteradas, apenas a função foi atualizada

-- ============================================
-- VALIDAÇÃO: Verificar compatibilidade de tipos
-- ============================================

-- Verificar tipo de users.id
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'id';

-- Resultado esperado: data_type = bigint, udt_name = int8

-- Verificar que a função retorna o mesmo tipo
SELECT 
  'users.id type' as check_type,
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id') as users_id_type,
  'extract_tutor_id_from_path return type' as check_type_2,
  (SELECT pg_get_function_result(oid)::text FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace 
     AND proname = 'extract_tutor_id_from_path') as function_return_type;

-- Resultado esperado: Ambos devem ser 'bigint' ou 'int8'

-- ============================================
-- FIM
-- ============================================
-- 
-- Após executar este script:
-- 1. Função retorna bigint (compatível com users.id)
-- 2. Políticas comparam bigint com bigint (sem mismatch)
-- 3. Sistema RLS funcionando corretamente
-- ============================================


