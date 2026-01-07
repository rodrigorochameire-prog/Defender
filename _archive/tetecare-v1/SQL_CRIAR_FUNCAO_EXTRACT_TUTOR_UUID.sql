-- ============================================
-- CRIAR FUNÇÃO extract_tutor_uuid_from_path
-- Use este script APENAS se users.id for UUID
-- ============================================
-- 
-- ATENÇÃO: Execute este script apenas se a verificação mostrar que users.id é UUID
-- ============================================

-- Remover função existente (se houver)
DROP FUNCTION IF EXISTS public.extract_tutor_uuid_from_path(text) CASCADE;

-- Criar função que retorna UUID
CREATE OR REPLACE FUNCTION public.extract_tutor_uuid_from_path(
  file_path text
) RETURNS uuid
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
  -- Exemplo: 'tutors/123e4567-e89b-12d3-a456-426614174000/arquivo.pdf' -> path_parts[2] = '123e4567-e89b-12d3-a456-426614174000'
  IF array_length(path_parts, 1) >= 2 THEN
    tutor_id_str := path_parts[2];
    BEGIN
      RETURN tutor_id_str::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================
-- VALIDAÇÃO: Testar a função
-- ============================================

-- Teste 1: Caminho válido com UUID
SELECT 
  'tutors/123e4567-e89b-12d3-a456-426614174000/arquivo.pdf' as test_path,
  public.extract_tutor_uuid_from_path('tutors/123e4567-e89b-12d3-a456-426614174000/arquivo.pdf') as extracted_uuid;
-- Resultado esperado: UUID válido

-- Teste 2: Caminho com staff
SELECT 
  'staff/123e4567-e89b-12d3-a456-426614174000/foto.jpg' as test_path,
  public.extract_tutor_uuid_from_path('staff/123e4567-e89b-12d3-a456-426614174000/foto.jpg') as extracted_uuid;
-- Resultado esperado: UUID válido

-- Teste 3: Caminho inválido (sem UUID)
SELECT 
  'tutors/arquivo.pdf' as test_path,
  public.extract_tutor_uuid_from_path('tutors/arquivo.pdf') as extracted_uuid;
-- Resultado esperado: NULL

-- Teste 4: Caminho NULL
SELECT 
  NULL as test_path,
  public.extract_tutor_uuid_from_path(NULL) as extracted_uuid;
-- Resultado esperado: NULL

-- ============================================
-- VERIFICAR DEFINIÇÃO DA FUNÇÃO
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_uuid_from_path';

-- ============================================
-- FIM
-- ============================================
-- 
-- Após criar esta função, atualize as políticas para usar:
-- extract_tutor_uuid_from_path(storage.objects.name)
-- em vez de extract_tutor_id_from_path(storage.objects.name)
-- ============================================


