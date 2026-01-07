-- ============================================
-- POLÍTICAS RLS COMPLETAS PARA BUCKETS
-- Tete House Hub - Supabase
-- Script final consolidado - executar no SQL Editor
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Cole este script completo no SQL Editor do Supabase
-- 2. Execute tudo de uma vez (ou em blocos se preferir)
-- 3. Verifique se todas as políticas foram criadas
--
-- ============================================

-- ============================================
-- PASSO 1: REMOVER FUNÇÕES EXISTENTES
-- ============================================

DROP FUNCTION IF EXISTS public.is_tutor_of_pet(uuid, int) CASCADE;
DROP FUNCTION IF EXISTS public.extract_pet_id_from_path(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text) CASCADE;

-- ============================================
-- PASSO 2: CRIAR FUNÇÕES AUXILIARES
-- ============================================

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

-- Revogar acesso público
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
-- PASSO 3: HABILITAR RLS NA TABELA storage.objects
-- ============================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 4: REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================

-- Remover políticas antigas por nome específico
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        policyname LIKE '%pets%'
        OR policyname LIKE '%daycare%'
        OR policyname LIKE '%documents%'
        OR policyname LIKE '%financial%'
        OR policyname LIKE '%reports%'
        OR policyname LIKE '%products%'
        OR policyname LIKE '%health%'
        OR policyname LIKE '%tutors%'
        OR policyname LIKE '%staff%'
        OR policyname LIKE '%wall%'
        OR policyname LIKE '%partnerships%'
        OR policyname LIKE '%marketing%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
  END LOOP;
END $$;

-- ============================================
-- PASSO 5: CRIAR POLÍTICAS RLS
-- ============================================

-- ============================================
-- BUCKET: pets (PRIVADO)
-- ============================================

CREATE POLICY "pets_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pets' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "pets_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pets' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "pets_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pets' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "pets_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pets' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: daycare-photos (PRIVADO)
-- ============================================

CREATE POLICY "daycare_photos_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "daycare_photos_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daycare-photos' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "daycare_photos_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "daycare_photos_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: documents (PRIVADO)
-- ============================================

CREATE POLICY "documents_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "documents_insert_tutors_and_admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "documents_update_tutors_and_admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "documents_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: financial (PRIVADO)
-- ============================================

CREATE POLICY "financial_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'financial' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "financial_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'financial' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "financial_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'financial' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "financial_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'financial' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: reports (PRIVADO)
-- ============================================

CREATE POLICY "reports_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "reports_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "reports_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "reports_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: products (PRIVADO)
-- ============================================

CREATE POLICY "products_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'products' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "products_insert_tutors_and_admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "products_update_tutors_and_admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "products_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: health-logs (PRIVADO)
-- ============================================

CREATE POLICY "health_logs_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-logs' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "health_logs_insert_tutors_and_admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'health-logs' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "health_logs_update_tutors_and_admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'health-logs' 
  AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

CREATE POLICY "health_logs_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'health-logs' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: tutors (PRIVADO)
-- ============================================

CREATE POLICY "tutors_select_own_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
);

CREATE POLICY "tutors_insert_own_and_admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutors' 
  AND (
    public.is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
);

CREATE POLICY "tutors_update_own_and_admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
);

CREATE POLICY "tutors_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: staff (PRIVADO)
-- ============================================

CREATE POLICY "staff_select_own_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff' 
  AND (
    public.is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
);

CREATE POLICY "staff_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "staff_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "staff_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: wall (PÚBLICO - autenticados)
-- ============================================

CREATE POLICY "wall_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wall');

CREATE POLICY "wall_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wall');

CREATE POLICY "wall_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wall' 
  AND (
    public.is_admin(auth.uid())
    OR
    (metadata->>'owner')::uuid = auth.uid()
  )
);

CREATE POLICY "wall_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wall' 
  AND (
    public.is_admin(auth.uid())
    OR
    (metadata->>'owner')::uuid = auth.uid()
  )
);

-- ============================================
-- BUCKET: partnerships (PÚBLICO)
-- ============================================

CREATE POLICY "partnerships_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'partnerships');

CREATE POLICY "partnerships_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partnerships' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "partnerships_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partnerships' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "partnerships_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'partnerships' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- BUCKET: marketing (PÚBLICO)
-- ============================================

CREATE POLICY "marketing_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing');

CREATE POLICY "marketing_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "marketing_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing' 
  AND public.is_admin(auth.uid())
);

CREATE POLICY "marketing_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing' 
  AND public.is_admin(auth.uid())
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
--
-- VALIDAÇÃO:
-- Execute esta query para verificar se todas as políticas foram criadas:
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects'
-- ORDER BY policyname;
--
-- Você deve ver 48 políticas (12 buckets × 4 operações)
-- ============================================


