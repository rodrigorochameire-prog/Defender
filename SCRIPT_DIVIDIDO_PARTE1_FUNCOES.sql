-- ============================================
-- PARTE 1: FUNÇÕES AUXILIARES
-- Execute esta parte primeiro no SQL Editor
-- ============================================

-- Remover funções existentes
DROP FUNCTION IF EXISTS public.is_tutor_of_pet(uuid, int) CASCADE;
DROP FUNCTION IF EXISTS public.extract_pet_id_from_path(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text) CASCADE;

-- Função: Verifica se usuário é tutor de um pet
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

REVOKE EXECUTE ON FUNCTION public.is_tutor_of_pet(uuid, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_pet(uuid, int) TO service_role;

-- Função: Extrai petId do caminho do arquivo
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

-- Função: Verifica se usuário é admin
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

-- Função: Extrai tutorId do caminho
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
-- FIM DA PARTE 1
-- ============================================
-- 
-- Após executar esta parte, verifique se as funções foram criadas:
-- SELECT proname as function_name 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
--   AND proname IN ('is_tutor_of_pet', 'extract_pet_id_from_path', 'is_admin', 'extract_tutor_id_from_path');
--
-- Se todas as 4 funções aparecerem, continue para a Parte 2 (políticas via Dashboard)
-- ============================================

