-- ============================================
-- LIMPAR FUNÇÕES DUPLICADAS/ANTIGAS
-- Execute este script para remover sobrecargas indesejadas
-- ============================================

-- Remover versão antiga com bigint (manter apenas integer)
DROP FUNCTION IF EXISTS public.is_tutor_of_pet(uuid, bigint) CASCADE;

-- Verificar funções restantes
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'is_tutor_of_pet'
ORDER BY proname, arguments;

-- Resultado esperado: Apenas uma função is_tutor_of_pet(uuid, integer)

-- ============================================
-- VERIFICAR TODAS AS FUNÇÕES AUXILIARES
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname IN (
    'is_tutor_of_pet', 
    'extract_pet_id_from_path', 
    'is_admin', 
    'extract_tutor_id_from_path'
  )
ORDER BY proname, arguments;

-- Resultado esperado: 4 funções, cada uma com uma única sobrecarga

-- ============================================
-- FIM
-- ============================================


