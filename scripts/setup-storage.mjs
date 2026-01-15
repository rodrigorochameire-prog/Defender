import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function setupStorage() {
  console.log('🚀 Iniciando configuração do Storage...\n');

  // 1. Criar/Atualizar buckets
  const buckets = [
    { id: 'pet-photos', name: 'pet-photos', public: false, fileSizeLimit: 5242880, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
    { id: 'documents', name: 'documents', public: false, fileSizeLimit: 10485760, allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { id: 'wall-media', name: 'wall-media', public: false, fileSizeLimit: 10485760, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'] },
  ];

  for (const bucket of buckets) {
    const { data: existing } = await supabase.storage.listBuckets();
    const exists = existing?.some(b => b.id === bucket.id);

    if (exists) {
      const { error } = await supabase.storage.updateBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });
      if (error) {
        console.log(`❌ Erro ao atualizar bucket ${bucket.id}:`, error.message);
      } else {
        console.log(`✅ Bucket ${bucket.id} atualizado`);
      }
    } else {
      const { error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });
      if (error) {
        console.log(`❌ Erro ao criar bucket ${bucket.id}:`, error.message);
      } else {
        console.log(`✅ Bucket ${bucket.id} criado`);
      }
    }
  }

  // 2. Executar SQL para políticas
  console.log('\n📋 Configurando políticas RLS...\n');

  const sql = `
    -- Função para extrair pet_id
    CREATE OR REPLACE FUNCTION storage.extract_pet_id_from_path(file_path TEXT)
    RETURNS INTEGER AS $$
    BEGIN
      RETURN (string_to_array(file_path, '/'))[2]::INTEGER;
    EXCEPTION WHEN OTHERS THEN RETURN NULL;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    -- Limpar políticas antigas
    DROP POLICY IF EXISTS "pet_photos_select" ON storage.objects;
    DROP POLICY IF EXISTS "pet_photos_insert" ON storage.objects;
    DROP POLICY IF EXISTS "pet_photos_delete" ON storage.objects;
    DROP POLICY IF EXISTS "documents_select" ON storage.objects;
    DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
    DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
    DROP POLICY IF EXISTS "wall_media_select" ON storage.objects;
    DROP POLICY IF EXISTS "wall_media_insert" ON storage.objects;
    DROP POLICY IF EXISTS "wall_media_delete" ON storage.objects;

    -- Políticas pet-photos
    CREATE POLICY "pet_photos_select" ON storage.objects FOR SELECT USING (
      bucket_id = 'pet-photos' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "pet_photos_insert" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'pet-photos' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "pet_photos_delete" ON storage.objects FOR DELETE USING (
      bucket_id = 'pet-photos' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    -- Políticas documents
    CREATE POLICY "documents_select" ON storage.objects FOR SELECT USING (
      bucket_id = 'documents' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "documents_insert" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'documents' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "documents_delete" ON storage.objects FOR DELETE USING (
      bucket_id = 'documents' AND auth.role() = 'authenticated' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    -- Políticas wall-media
    CREATE POLICY "wall_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

    CREATE POLICY "wall_media_insert" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'wall-media' AND auth.role() = 'authenticated' AND 
      EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
    );

    CREATE POLICY "wall_media_delete" ON storage.objects FOR DELETE USING (
      bucket_id = 'wall-media' AND auth.role() = 'authenticated' AND 
      EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
    );

    -- Habilitar RLS
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `;

  // Executar SQL via rpc ou diretamente
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: { message: 'RPC não disponível' } }));
  
  if (error) {
    console.log('⚠️  Não foi possível executar SQL via RPC.');
    console.log('📋 Execute o SQL manualmente no Supabase Dashboard > SQL Editor');
    console.log('\n--- SQL para executar ---\n');
    console.log(sql);
    console.log('\n--- Fim do SQL ---\n');
  } else {
    console.log('✅ Políticas RLS configuradas com sucesso!');
  }

  console.log('\n🎉 Configuração concluída!');
}

setupStorage().catch(console.error);

