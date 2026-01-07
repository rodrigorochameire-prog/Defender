-- ============================================
-- REMOVER FUNÇÃO ANTIGA (APÓS PERÍODO DE MONITORAMENTO)
-- Execute este script APENAS após validar que tudo está funcionando
-- ============================================
-- 
-- ATENÇÃO: Execute este script apenas após:
-- 1. Período de monitoramento (24-48 horas)
-- 2. Testes de funcionalidade bem-sucedidos
-- 3. Verificação de que não há outras referências
-- ============================================

-- ============================================
-- PASSO 1: Verificar se há outras referências à função antiga
-- ============================================

-- Verificar políticas que ainda usam a função antiga
SELECT 
  p.polname as policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation,
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

-- ============================================
-- PASSO 2: Verificar se a função antiga existe
-- ============================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path'
  AND pg_get_function_arguments(oid) = 'file_path text';

-- Resultado esperado: 1 linha (função antiga existe)

-- ============================================
-- PASSO 3: Remover função antiga (APENAS se não houver referências)
-- ============================================
-- 
-- ATENÇÃO: Execute este comando APENAS se:
-- 1. A query do PASSO 1 retornou 0 linhas
-- 2. Você validou que não há outras referências (código da aplicação, etc.)
-- 3. Período de monitoramento foi bem-sucedido
-- ============================================

-- Descomente a linha abaixo quando estiver pronto para remover:
-- DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text);

-- ============================================
-- PASSO 4: Validação final
-- ============================================

-- Verificar que a função antiga foi removida
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path'
  AND pg_get_function_arguments(oid) = 'file_path text';

-- Resultado esperado: 0 linhas (função antiga removida)

-- Verificar que a nova função ainda existe
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path_bigint';

-- Resultado esperado: 1 linha (nova função existe e retorna bigint)

-- ============================================
-- FIM
-- ============================================
-- 
-- Após executar este script:
-- 1. Função antiga removida (se não houver referências)
-- 2. Nova função mantida (extract_tutor_id_from_path_bigint)
-- 3. Sistema RLS funcionando corretamente
-- ============================================


