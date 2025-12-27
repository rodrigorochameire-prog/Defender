-- ============================================
-- VERIFICAR TIPO REAL DE users.id
-- Execute este script para confirmar o tipo no banco
-- ============================================

-- Query 1: Verificar tipo da coluna id
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'id';

-- Query 2: Verificar tipo usando pg_type
SELECT 
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  t.typname as type_name
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_type t ON a.atttypid = t.oid
WHERE c.relname = 'users'
  AND a.attname = 'id'
  AND a.attnum > 0
  AND NOT a.attisdropped;

-- Query 3: Verificar alguns valores reais (para confirmar formato)
SELECT 
  id,
  pg_typeof(id) as id_type,
  name,
  email
FROM public.users
LIMIT 5;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================
-- 
-- Se data_type = 'integer' ou udt_name = 'int4':
--   ✅ users.id é INTEGER
--   ✅ Função extract_tutor_id_from_path está correta (retorna integer)
--   ✅ Políticas estão corretas (comparando integer com integer)
--   ✅ Apenas garantir que usam storage.objects.name
--
-- Se data_type = 'uuid' ou udt_name = 'uuid':
--   ❌ users.id é UUID
--   ❌ Precisamos ajustar a função para retornar UUID
--   ❌ Precisamos atualizar as políticas
--   ✅ Aplicar Opção A: Criar função extract_tutor_uuid_from_path
-- ============================================


