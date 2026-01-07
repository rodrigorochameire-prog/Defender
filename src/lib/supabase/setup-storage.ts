import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Script para configurar os buckets de storage do Supabase
 * Pode ser executado via API route ou durante o deploy
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUCKETS_CONFIG = [
  {
    id: "pet-photos",
    name: "pet-photos",
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    id: "documents",
    name: "documents",
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  {
    id: "wall-media",
    name: "wall-media",
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"],
  },
];

export async function setupStorageBuckets() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Variáveis de ambiente do Supabase não configuradas");
    return { success: false, error: "Missing environment variables" };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results: Array<{ bucket: string; status: string; error?: string }> = [];

  for (const config of BUCKETS_CONFIG) {
    try {
      // Verificar se bucket já existe
      const { data: existingBuckets } = await supabase.storage.listBuckets();
      const bucketExists = existingBuckets?.some((b) => b.id === config.id);

      if (bucketExists) {
        // Atualizar bucket existente
        const { error } = await supabase.storage.updateBucket(config.id, {
          public: config.public,
          fileSizeLimit: config.fileSizeLimit,
          allowedMimeTypes: config.allowedMimeTypes,
        });

        if (error) {
          results.push({ bucket: config.id, status: "error", error: error.message });
        } else {
          results.push({ bucket: config.id, status: "updated" });
        }
      } else {
        // Criar novo bucket
        const { error } = await supabase.storage.createBucket(config.id, {
          public: config.public,
          fileSizeLimit: config.fileSizeLimit,
          allowedMimeTypes: config.allowedMimeTypes,
        });

        if (error) {
          results.push({ bucket: config.id, status: "error", error: error.message });
        } else {
          results.push({ bucket: config.id, status: "created" });
        }
      }
    } catch (err) {
      results.push({
        bucket: config.id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Executar SQL para criar políticas
  const policiesResult = await setupStoragePolicies(supabase);

  return {
    success: results.every((r) => r.status !== "error") && policiesResult.success,
    buckets: results,
    policies: policiesResult,
  };
}

async function setupStoragePolicies(supabase: SupabaseClient) {
  const policiesSQL = `
    -- Função para extrair pet_id do path
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

    -- Limpar políticas antigas
    DO $$
    BEGIN
      DROP POLICY IF EXISTS "pet_photos_select" ON storage.objects;
      DROP POLICY IF EXISTS "pet_photos_insert" ON storage.objects;
      DROP POLICY IF EXISTS "pet_photos_delete" ON storage.objects;
      DROP POLICY IF EXISTS "documents_select" ON storage.objects;
      DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
      DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
      DROP POLICY IF EXISTS "wall_media_select" ON storage.objects;
      DROP POLICY IF EXISTS "wall_media_insert" ON storage.objects;
      DROP POLICY IF EXISTS "wall_media_delete" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END $$;

    -- Políticas para pet-photos
    CREATE POLICY "pet_photos_select" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "pet_photos_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "pet_photos_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    -- Políticas para documents
    CREATE POLICY "documents_select" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "documents_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    CREATE POLICY "documents_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.pet_tutors WHERE pet_id = storage.extract_pet_id_from_path(name) AND tutor_id = (auth.uid())::text::integer)
      )
    );

    -- Políticas para wall-media (todos podem ver, só admin pode upload)
    CREATE POLICY "wall_media_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');

    CREATE POLICY "wall_media_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'wall-media' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
    );

    CREATE POLICY "wall_media_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'wall-media' 
      AND auth.role() = 'authenticated'
      AND EXISTS (SELECT 1 FROM public.users WHERE id = (auth.uid())::text::integer AND role = 'admin')
    );
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql: policiesSQL });
    
    if (error) {
      // Se rpc não funcionar, tentar via REST API direta
      console.log("RPC não disponível, políticas precisam ser criadas manualmente");
      return { success: false, error: error.message, manual: true };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      manual: true,
    };
  }
}

export { BUCKETS_CONFIG };

