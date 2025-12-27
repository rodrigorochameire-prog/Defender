-- ============================================
-- POLÍTICAS RLS COMPLETAS PARA BUCKETS
-- Tete House Hub - Supabase
-- ============================================
-- 
-- IMPORTANTE: Antes de executar, verifique:
-- 1. Nomes de colunas (snake_case vs camelCase)
-- 2. Tipo de auth_id (uuid vs text)
-- 3. Nomes exatos das tabelas no banco
--
-- ============================================

-- ============================================
-- 1. FUNÇÕES AUXILIARES
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
-- Exemplo: "pets/123/profile.jpg" -> 123
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
-- 2. REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================

-- Remover políticas antigas dos buckets privados
DROP POLICY IF EXISTS "pets_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "pets_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "pets_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "pets_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "daycare_photos_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "documents_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "financial_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "financial_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "financial_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "financial_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "reports_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "reports_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "reports_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "products_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "products_insert_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "products_update_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "products_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "health_logs_select_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_insert_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_update_tutors_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "tutors_select_own_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "tutors_insert_own_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "tutors_update_own_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "tutors_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "staff_select_own_and_admins" ON storage.objects;
DROP POLICY IF EXISTS "staff_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "staff_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "staff_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "wall_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "wall_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "wall_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "wall_delete_authenticated" ON storage.objects;

DROP POLICY IF EXISTS "partnerships_select_public" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_delete_admins_only" ON storage.objects;

DROP POLICY IF EXISTS "marketing_select_public" ON storage.objects;
DROP POLICY IF EXISTS "marketing_insert_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "marketing_update_admins_only" ON storage.objects;
DROP POLICY IF EXISTS "marketing_delete_admins_only" ON storage.objects;

-- ============================================
-- 3. POLÍTICAS PARA BUCKET: pets (PRIVADO)
-- ============================================

-- SELECT: Tutores do pet + Admins
CREATE POLICY "pets_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pets' AND (
    public.is_admin(auth.uid())
    OR
    public.is_tutor_of_pet(
      auth.uid(),
      public.extract_pet_id_from_path(name)
    )
  )
);

-- INSERT: Admins apenas
CREATE POLICY "pets_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pets' AND
  public.is_admin(auth.uid())
);

-- UPDATE: Admins apenas
CREATE POLICY "pets_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pets' AND
  public.is_admin(auth.uid())
);

-- DELETE: Admins apenas
CREATE POLICY "pets_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pets' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 4. POLÍTICAS PARA BUCKET: daycare-photos (PRIVADO)
-- ============================================

CREATE POLICY "daycare_photos_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'daycare-photos' AND (
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
  bucket_id = 'daycare-photos' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "daycare_photos_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daycare-photos' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "daycare_photos_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daycare-photos' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 5. POLÍTICAS PARA BUCKET: documents (PRIVADO)
-- ============================================

CREATE POLICY "documents_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
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
  bucket_id = 'documents' AND (
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
  bucket_id = 'documents' AND (
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
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 6. POLÍTICAS PARA BUCKET: financial (PRIVADO)
-- ============================================

CREATE POLICY "financial_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'financial' AND (
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
  bucket_id = 'financial' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "financial_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'financial' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "financial_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'financial' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 7. POLÍTICAS PARA BUCKET: reports (PRIVADO)
-- ============================================

CREATE POLICY "reports_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND (
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
  bucket_id = 'reports' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "reports_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "reports_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 8. POLÍTICAS PARA BUCKET: products (PRIVADO)
-- ============================================

CREATE POLICY "products_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'products' AND (
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
  bucket_id = 'products' AND (
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
  bucket_id = 'products' AND (
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
  bucket_id = 'products' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 9. POLÍTICAS PARA BUCKET: health-logs (PRIVADO)
-- ============================================

CREATE POLICY "health_logs_select_tutors_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-logs' AND (
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
  bucket_id = 'health-logs' AND (
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
  bucket_id = 'health-logs' AND (
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
  bucket_id = 'health-logs' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 10. POLÍTICAS PARA BUCKET: tutors (PRIVADO)
-- ============================================

-- Função auxiliar: extrai tutorId do caminho
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

CREATE POLICY "tutors_select_own_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutors' AND (
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
  bucket_id = 'tutors' AND (
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
  bucket_id = 'tutors' AND (
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
  bucket_id = 'tutors' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 11. POLÍTICAS PARA BUCKET: staff (PRIVADO)
-- ============================================

CREATE POLICY "staff_select_own_and_admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff' AND (
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
  bucket_id = 'staff' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "staff_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "staff_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 12. POLÍTICAS PARA BUCKET: wall (PÚBLICO - autenticados)
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
  bucket_id = 'wall' AND (
    public.is_admin(auth.uid())
    OR
    -- Verificar ownership via metadados (owner = auth.uid())
    (metadata->>'owner')::uuid = auth.uid()
  )
);

CREATE POLICY "wall_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wall' AND (
    public.is_admin(auth.uid())
    OR
    (metadata->>'owner')::uuid = auth.uid()
  )
);

-- ============================================
-- 13. POLÍTICAS PARA BUCKET: partnerships (PÚBLICO)
-- ============================================

CREATE POLICY "partnerships_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'partnerships');

CREATE POLICY "partnerships_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partnerships' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "partnerships_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partnerships' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "partnerships_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'partnerships' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- 14. POLÍTICAS PARA BUCKET: marketing (PÚBLICO)
-- ============================================

CREATE POLICY "marketing_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing');

CREATE POLICY "marketing_insert_admins_only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "marketing_update_admins_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "marketing_delete_admins_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing' AND
  public.is_admin(auth.uid())
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
--
-- PRÓXIMOS PASSOS:
-- 1. Verificar nomes de colunas (petId vs pet_id)
-- 2. Ajustar funções conforme necessário
-- 3. Testar políticas com usuários de teste
-- 4. Verificar estrutura de pastas no código
-- ============================================


