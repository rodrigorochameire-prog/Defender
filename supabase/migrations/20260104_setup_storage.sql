-- =====================================================
-- MIGRATION: Configuração de Storage Buckets e Políticas RLS
-- TeteCare - Sistema de Gestão de Creche para Pets
-- =====================================================

-- =====================================================
-- 1. CRIAR BUCKETS (via insert na tabela storage.buckets)
-- =====================================================

-- Bucket: pet-photos (fotos dos pets - privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket: documents (documentos dos pets - privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket: wall-media (mídia do mural - todos autenticados podem ver)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wall-media',
  'wall-media',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 2. FUNÇÃO AUXILIAR - Extrair pet_id do path
-- =====================================================
-- O path segue o padrão: pets/{pet_id}/arquivo.ext

CREATE OR REPLACE FUNCTION storage.extract_pet_id_from_path(file_path TEXT)
RETURNS INTEGER AS $$
DECLARE
  path_parts TEXT[];
BEGIN
  -- Separar o path por '/'
  path_parts := string_to_array(file_path, '/');
  
  -- O pet_id está na segunda posição (índice 2 em arrays 1-based do PostgreSQL)
  -- Ex: pets/123/foto.jpg -> parts[1]='pets', parts[2]='123', parts[3]='foto.jpg'
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
-- 3. LIMPAR POLÍTICAS ANTIGAS (se existirem)
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
-- 4. POLÍTICAS PARA PET-PHOTOS
-- =====================================================
-- Apenas admin e tutores vinculados ao pet podem acessar

-- SELECT: Admin ou tutor vinculado ao pet
CREATE POLICY "pet_photos_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pet-photos' 
  AND auth.role() = 'authenticated'
  AND (
    -- É admin
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (auth.uid())::text::integer 
      AND role = 'admin'
    )
    OR
    -- É tutor do pet (extraído do path)
    EXISTS (
      SELECT 1 FROM public.pet_tutors 
      WHERE pet_id = storage.extract_pet_id_from_path(name)
      AND tutor_id = (auth.uid())::text::integer
    )
  )
);

-- INSERT: Admin ou tutor vinculado ao pet
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

-- UPDATE: Admin ou tutor vinculado ao pet
CREATE POLICY "pet_photos_update" ON storage.objects
FOR UPDATE USING (
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

-- DELETE: Admin ou tutor vinculado ao pet
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
-- 5. POLÍTICAS PARA DOCUMENTS
-- =====================================================
-- Mesma lógica: Apenas admin e tutores vinculados ao pet

-- SELECT
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

-- INSERT
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

-- UPDATE
CREATE POLICY "documents_update" ON storage.objects
FOR UPDATE USING (
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

-- DELETE
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
-- 6. POLÍTICAS PARA WALL-MEDIA (Mural)
-- =====================================================
-- Todos os usuários autenticados podem ver
-- Apenas admin pode fazer upload/delete

-- SELECT: Todos autenticados podem ver
CREATE POLICY "wall_media_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
);

-- INSERT: Apenas admin
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

-- UPDATE: Apenas admin
CREATE POLICY "wall_media_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'wall-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (auth.uid())::text::integer 
    AND role = 'admin'
  )
);

-- DELETE: Apenas admin
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

-- =====================================================
-- 7. HABILITAR RLS NA TABELA DE OBJECTS (se não estiver)
-- =====================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

