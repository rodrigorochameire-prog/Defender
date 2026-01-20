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
    { id: 'documents', name: 'documents', public: false, fileSizeLimit: 10485760, allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
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
    -- Limpar políticas antigas
    DROP POLICY IF EXISTS "documents_select" ON storage.objects;
    DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
    DROP POLICY IF EXISTS "documents_update" ON storage.objects;
    DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

    -- Políticas documents (usuários autenticados)
    CREATE POLICY "documents_select" ON storage.objects FOR SELECT USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
    );

    CREATE POLICY "documents_insert" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
    );

    CREATE POLICY "documents_update" ON storage.objects FOR UPDATE USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
    );

    CREATE POLICY "documents_delete" ON storage.objects FOR DELETE USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer)
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

