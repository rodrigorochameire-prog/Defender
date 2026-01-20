-- =====================================================
-- MIGRATION: Configuração de Storage Buckets e Políticas RLS
-- DefesaHub - Gestão Processual Jurídica
-- =====================================================

-- =====================================================
-- 1. CRIAR BUCKETS (via insert na tabela storage.buckets)
-- =====================================================

-- Bucket: documents (documentos jurídicos - privado)
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

-- =====================================================
-- 2. LIMPAR POLÍTICAS ANTIGAS (se existirem)
-- =====================================================

DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

-- =====================================================
-- 3. POLÍTICAS PARA DOCUMENTS
-- =====================================================
-- Usuários autenticados com cadastro no sistema

CREATE POLICY "documents_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

CREATE POLICY "documents_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
);

-- =====================================================
-- 4. HABILITAR RLS
-- =====================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
