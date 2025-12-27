-- ============================================
-- RECRIAR FUNÇÃO extract_tutor_id_from_path CORRETA
-- Execute este script se a função estiver incorreta
-- ============================================

-- Remover função existente (se houver)
DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text) CASCADE;

-- Criar função correta
CREATE OR REPLACE FUNCTION public.extract_tutor_id_from_path(
  file_path text
) RETURNS int
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
  -- Exemplo: 'tutors/123/arquivo.pdf' -> path_parts[1] = 'tutors', path_parts[2] = '123'
  IF array_length(path_parts, 1) >= 2 THEN
    tutor_id_str := path_parts[2];
    BEGIN
      RETURN tutor_id_str::int;
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

-- Teste 1: Caminho válido
SELECT 
  'tutors/123/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path('tutors/123/arquivo.pdf') as extracted_id;
-- Resultado esperado: 123

-- Teste 2: Caminho com staff
SELECT 
  'staff/456/foto.jpg' as test_path,
  public.extract_tutor_id_from_path('staff/456/foto.jpg') as extracted_id;
-- Resultado esperado: 456

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

-- ============================================
-- VERIFICAR DEFINIÇÃO DA FUNÇÃO
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path';

-- ============================================
-- FIM
-- ============================================


