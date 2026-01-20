-- Storage RLS Policies
-- Este arquivo será executado automaticamente pela integração Vercel

-- Habilitar RLS na tabela storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

-- Políticas para documents (usuários autenticados com cadastro)
CREATE POLICY "documents_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);
