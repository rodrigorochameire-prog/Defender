-- =====================================================
-- POLÍTICAS RLS PARA SUPABASE STORAGE
-- Execute este SQL no Dashboard do Supabase > SQL Editor
-- =====================================================

-- Habilitar RLS na tabela storage.objects (se não estiver)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO AUXILIAR: Extrair pet_id do caminho do arquivo
-- Espera formato: pets/{pet_id}/arquivo.jpg
-- =====================================================
CREATE OR REPLACE FUNCTION storage.extract_pet_id(file_path TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := string_to_array(file_path, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'pets' THEN
    RETURN parts[2]::INTEGER;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNÇÃO AUXILIAR: Verificar se usuário é admin
-- =====================================================
CREATE OR REPLACE FUNCTION storage.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid()::text 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO AUXILIAR: Verificar se usuário é tutor do pet
-- =====================================================
CREATE OR REPLACE FUNCTION storage.is_pet_tutor(pet_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.pet_tutors pt
    JOIN public.users u ON pt.tutor_id = u.id
    WHERE pt.pet_id = pet_id_param 
    AND u.auth_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- LIMPAR POLÍTICAS ANTIGAS (se existirem)
-- =====================================================
DROP POLICY IF EXISTS "pet_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "wall_media_select" ON storage.objects;
DROP POLICY IF EXISTS "wall_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "wall_media_update" ON storage.objects;
DROP POLICY IF EXISTS "wall_media_delete" ON storage.objects;

-- =====================================================
-- POLÍTICAS PARA BUCKET: pet-photos
-- Acesso: Admin OU Tutores vinculados ao pet
-- =====================================================

CREATE POLICY "pet_photos_select" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "pet_photos_insert" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "pet_photos_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "pet_photos_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

-- =====================================================
-- POLÍTICAS PARA BUCKET: documents
-- Acesso: Admin OU Tutores vinculados ao pet
-- =====================================================

CREATE POLICY "documents_select" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "documents_insert" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "documents_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

CREATE POLICY "documents_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (
    storage.is_admin() 
    OR storage.is_pet_tutor(storage.extract_pet_id(name))
  )
);

-- =====================================================
-- POLÍTICAS PARA BUCKET: wall-media
-- SELECT: Todos usuários autenticados
-- INSERT/UPDATE/DELETE: Apenas Admin
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
  AND storage.is_admin()
);

CREATE POLICY "wall_media_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
  AND storage.is_admin()
);

CREATE POLICY "wall_media_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
  AND storage.is_admin()
);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

