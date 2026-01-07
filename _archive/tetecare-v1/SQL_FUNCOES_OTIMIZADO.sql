-- ============================================
-- FUNÇÕES AUXILIARES PARA POLÍTICAS RLS
-- Tete House Hub - Supabase
-- Execute este script no SQL Editor
-- ============================================
-- 
-- Este script cria apenas as funções auxiliares.
-- As políticas RLS serão criadas via Dashboard (Storage → Policies)
--
-- ============================================

-- Remover funções existentes
DROP FUNCTION IF EXISTS public.is_tutor_of_pet(uuid, int) CASCADE;
DROP FUNCTION IF EXISTS public.extract_pet_id_from_path(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text) CASCADE;

-- ============================================
-- Função 1: Verifica se usuário é tutor de um pet
-- ============================================

CREATE OR REPLACE FUNCTION public.is_tutor_of_pet(
  user_auth_id uuid,
  pet_id_param int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF pet_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.pet_tutors pt ON pt."tutorId" = u.id
    WHERE u.auth_id = user_auth_id
      AND pt."petId" = pet_id_param
  );
END;
$$;

-- Revogar acesso público
REVOKE EXECUTE ON FUNCTION public.is_tutor_of_pet(uuid, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_pet(uuid, int) TO service_role;

-- ============================================
-- Função 2: Extrai petId do caminho do arquivo
-- ============================================

CREATE OR REPLACE FUNCTION public.extract_pet_id_from_path(
  file_path text
) RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  path_parts text[];
  pet_id_str text;
BEGIN
  IF file_path IS NULL OR file_path = '' THEN
    RETURN NULL;
  END IF;
  
  path_parts := string_to_array(file_path, '/');
  
  IF array_length(path_parts, 1) >= 2 THEN
    pet_id_str := path_parts[2];
    BEGIN
      RETURN pet_id_str::int;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================
-- Função 3: Verifica se usuário é admin
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(
  user_auth_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF user_auth_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_id = user_auth_id
      AND role = 'admin'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- ============================================
-- Função 4: Extrai tutorId do caminho
-- ============================================

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
  IF file_path IS NULL OR file_path = '' THEN
    RETURN NULL;
  END IF;
  
  path_parts := string_to_array(file_path, '/');
  
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
-- FIM
-- ============================================
--
-- PRÓXIMOS PASSOS:
-- 1. Verificar se as funções foram criadas:
--    SELECT routine_name FROM information_schema.routines 
--    WHERE routine_schema = 'public' 
--      AND routine_name IN ('is_tutor_of_pet', 'extract_pet_id_from_path', 'is_admin', 'extract_tutor_id_from_path');
--
-- 2. Criar políticas RLS via Dashboard:
--    Storage → [Bucket] → Policies → New Policy
--    Use as expressões do arquivo POLITICAS_UI_DASHBOARD.md
-- ============================================


