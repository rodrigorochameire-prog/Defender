-- ============================================
-- POLÍTICAS RLS UNIFICADAS POR BUCKET
-- Uma política única por bucket (cobre SELECT, INSERT, UPDATE, DELETE)
-- Copie e cole cada seção no SQL Editor do Supabase
-- ============================================

-- ============================================
-- BUCKET: pets (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "pets_policy" ON storage.objects;

CREATE POLICY "pets_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'pets' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'pets' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: daycare-photos (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "daycare_photos_policy" ON storage.objects;

CREATE POLICY "daycare_photos_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'daycare-photos' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: documents (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "documents_policy" ON storage.objects;

CREATE POLICY "documents_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'documents' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
);

-- ============================================
-- BUCKET: financial (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "financial_policy" ON storage.objects;

CREATE POLICY "financial_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'financial' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'financial' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: reports (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "reports_policy" ON storage.objects;

CREATE POLICY "reports_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'reports' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'reports' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: products (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "products_policy" ON storage.objects;

CREATE POLICY "products_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'products' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'products' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
);

-- ============================================
-- BUCKET: health-logs (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "health_logs_policy" ON storage.objects;

CREATE POLICY "health_logs_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'health-logs' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'health-logs' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    public.is_tutor_of_pet(
      (SELECT auth.uid()),
      public.extract_pet_id_from_path(name)
    )
  )
);

-- ============================================
-- BUCKET: tutors (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "tutors_policy" ON storage.objects;

CREATE POLICY "tutors_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'tutors' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
);

-- ============================================
-- BUCKET: staff (PRIVADO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "staff_policy" ON storage.objects;

CREATE POLICY "staff_policy"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'staff' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
        AND id = public.extract_tutor_id_from_path(name)
    )
  )
)
WITH CHECK (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: wall (PÚBLICO - autenticados)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "wall_policy" ON storage.objects;

-- SELECT e INSERT: Todos autenticados
CREATE POLICY "wall_select_insert"
ON storage.objects FOR SELECT, INSERT
TO authenticated
USING (bucket_id = 'wall')
WITH CHECK (bucket_id = 'wall');

-- UPDATE e DELETE: Owner ou Admin
CREATE POLICY "wall_update_delete"
ON storage.objects FOR UPDATE, DELETE
TO authenticated
USING (
  bucket_id = 'wall' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    (metadata->>'owner')::uuid = (SELECT auth.uid())
  )
);

-- ============================================
-- BUCKET: partnerships (PÚBLICO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "partnerships_policy" ON storage.objects;

-- SELECT: Público
CREATE POLICY "partnerships_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'partnerships');

-- INSERT, UPDATE, DELETE: Apenas Admins
CREATE POLICY "partnerships_modify"
ON storage.objects FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  bucket_id = 'partnerships' 
  AND public.is_admin((SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'partnerships' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: marketing (PÚBLICO)
-- Copie e cole esta seção completa
-- ============================================

DROP POLICY IF EXISTS "marketing_policy" ON storage.objects;

-- SELECT: Público
CREATE POLICY "marketing_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing');

-- INSERT, UPDATE, DELETE: Apenas Admins
CREATE POLICY "marketing_modify"
ON storage.objects FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  bucket_id = 'marketing' 
  AND public.is_admin((SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'marketing' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- FIM
-- ============================================
--
-- VALIDAÇÃO FINAL:
-- Execute esta query para verificar se todas as 12 políticas foram criadas:
--
-- SELECT COUNT(*) as total_policies
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects';
--
-- Resultado esperado: total_policies = 14
-- (12 buckets principais + 2 políticas extras para wall, partnerships e marketing)
-- ============================================

