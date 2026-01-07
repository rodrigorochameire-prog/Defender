-- =====================================================
-- CONFIGURAÇÃO DE STORAGE DO SUPABASE - TETECARE
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query

-- =====================================================
-- 1. CRIAR BUCKETS (via Dashboard)
-- =====================================================
-- Criar os seguintes buckets PRIVADOS:
-- 1. pet-photos
-- 2. documents  
-- 3. wall-media

-- =====================================================
-- 2. FUNÇÃO - Extrair pet_id do path
-- =====================================================
CREATE OR REPLACE FUNCTION storage.extract_pet_id_from_path(file_path TEXT)
RETURNS INTEGER AS $$
DECLARE
  path_parts TEXT[];
BEGIN
  path_parts := string_to_array(file_path, '/');
  IF array_length(path_parts, 1) >= 2 THEN
    BEGIN
      RETURN path_parts[2]::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 3. POLÍTICAS PARA PET-PHOTOS
-- =====================================================

-- SELECT: Admin ou tutor vinculado ao pet
CREATE POLICY "pet_photos_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

-- INSERT
CREATE POLICY "pet_photos_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

-- DELETE
CREATE POLICY "pet_photos_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

-- =====================================================
-- 4. POLÍTICAS PARA DOCUMENTS
-- =====================================================

CREATE POLICY "documents_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

CREATE POLICY "documents_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

CREATE POLICY "documents_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

-- =====================================================
-- 5. POLÍTICAS PARA WALL-MEDIA (Mural - todos podem ver)
-- =====================================================

CREATE POLICY "wall_media_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "wall_media_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (auth.uid())::text::integer 
    AND role = 'admin'
  )
);

CREATE POLICY "wall_media_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (auth.uid())::text::integer 
    AND role = 'admin'
  )
);
