-- Storage RLS Policies
-- Este arquivo será executado automaticamente pela integração Vercel

-- Habilitar RLS na tabela storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é admin
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

-- Função para verificar se usuário é tutor do pet
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

-- Limpar políticas existentes
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

-- Políticas para pet-photos (apenas autenticados por enquanto)
CREATE POLICY "pet_photos_select" ON storage.objects 
FOR SELECT USING (bucket_id = 'pet-photos' AND auth.role() = 'authenticated');

CREATE POLICY "pet_photos_insert" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'pet-photos' AND auth.role() = 'authenticated');

CREATE POLICY "pet_photos_update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'pet-photos' AND auth.role() = 'authenticated');

CREATE POLICY "pet_photos_delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'pet-photos' AND auth.role() = 'authenticated');

-- Políticas para documents (apenas autenticados por enquanto)
CREATE POLICY "documents_select" ON storage.objects 
FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents_insert" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents_update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents_delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Políticas para wall-media
CREATE POLICY "wall_media_select" ON storage.objects 
FOR SELECT USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

CREATE POLICY "wall_media_insert" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

CREATE POLICY "wall_media_update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

CREATE POLICY "wall_media_delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

