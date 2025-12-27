-- ============================================
-- POLÍTICAS RLS POR BUCKET - VALIDADO
-- IMPORTANTE: Execute no SQL Editor, NÃO na interface de Policies!
-- ============================================

-- ============================================
-- BUCKET: pets (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "pets_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "pets_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "pets_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "pets_policy_delete" ON storage.objects;

CREATE POLICY "pets_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "pets_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pets' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "pets_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pets' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "pets_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pets' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: daycare-photos (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "daycare_photos_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "daycare_photos_policy_delete" ON storage.objects;

CREATE POLICY "daycare_photos_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "daycare_photos_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daycare-photos' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "daycare_photos_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "daycare_photos_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daycare-photos' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: documents (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "documents_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_policy_delete" ON storage.objects;

CREATE POLICY "documents_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "documents_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
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

CREATE POLICY "documents_policy_update"
ON storage.objects FOR UPDATE
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
);

CREATE POLICY "documents_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: financial (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "financial_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "financial_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "financial_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "financial_policy_delete" ON storage.objects;

CREATE POLICY "financial_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "financial_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'financial' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "financial_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'financial' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "financial_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'financial' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: reports (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "reports_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "reports_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "reports_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "reports_policy_delete" ON storage.objects;

CREATE POLICY "reports_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "reports_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "reports_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "reports_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: products (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "products_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "products_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "products_policy_delete" ON storage.objects;

CREATE POLICY "products_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "products_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
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

CREATE POLICY "products_policy_update"
ON storage.objects FOR UPDATE
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
);

CREATE POLICY "products_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: health-logs (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "health_logs_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "health_logs_policy_delete" ON storage.objects;

CREATE POLICY "health_logs_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "health_logs_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
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

CREATE POLICY "health_logs_policy_update"
ON storage.objects FOR UPDATE
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
);

CREATE POLICY "health_logs_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'health-logs' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: tutors (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "tutors_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "tutors_policy_delete" ON storage.objects;

CREATE POLICY "tutors_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "tutors_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
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

CREATE POLICY "tutors_policy_update"
ON storage.objects FOR UPDATE
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
);

CREATE POLICY "tutors_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutors' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: staff (PRIVADO)
-- ============================================

DROP POLICY IF EXISTS "staff_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_policy_delete" ON storage.objects;

CREATE POLICY "staff_policy_select"
ON storage.objects FOR SELECT
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
);

CREATE POLICY "staff_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "staff_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "staff_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: wall (PÚBLICO - autenticados)
-- ============================================

DROP POLICY IF EXISTS "wall_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "wall_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "wall_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "wall_policy_delete" ON storage.objects;

CREATE POLICY "wall_policy_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wall');

CREATE POLICY "wall_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wall');

CREATE POLICY "wall_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wall' 
  AND (
    public.is_admin((SELECT auth.uid()))
    OR
    (metadata->>'owner')::uuid = (SELECT auth.uid())
  )
);

CREATE POLICY "wall_policy_delete"
ON storage.objects FOR DELETE
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
-- ============================================

DROP POLICY IF EXISTS "partnerships_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "partnerships_policy_delete" ON storage.objects;

CREATE POLICY "partnerships_policy_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'partnerships');

CREATE POLICY "partnerships_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partnerships' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "partnerships_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partnerships' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "partnerships_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'partnerships' 
  AND public.is_admin((SELECT auth.uid()))
);

-- ============================================
-- BUCKET: marketing (PÚBLICO)
-- ============================================

DROP POLICY IF EXISTS "marketing_policy_select" ON storage.objects;
DROP POLICY IF EXISTS "marketing_policy_insert" ON storage.objects;
DROP POLICY IF EXISTS "marketing_policy_update" ON storage.objects;
DROP POLICY IF EXISTS "marketing_policy_delete" ON storage.objects;

CREATE POLICY "marketing_policy_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing');

CREATE POLICY "marketing_policy_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "marketing_policy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing' 
  AND public.is_admin((SELECT auth.uid()))
);

CREATE POLICY "marketing_policy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing' 
  AND public.is_admin((SELECT auth.uid()))
);
