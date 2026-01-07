import { createClient } from "@supabase/supabase-js";

// Singleton para o cliente Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Cliente para uso no frontend (com anon key)
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

/**
 * Faz upload de um documento via cliente (frontend)
 * Usa o bucket 'documents' com RLS configurado
 * Documentos são salvos em: pets/{petId}/{category}/{arquivo}
 */
export async function uploadDocumentClient(
  file: File,
  petId: number,
  category: string
): Promise<{ url: string; fileType: string; fileSize: number; path: string }> {
  const supabase = getSupabaseClient();
  
  // Gerar nome único - usando padrão pets/{petId} para compatibilidade com RLS
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `pets/${petId}/${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload para o bucket documents (com RLS configurado)
  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`);
  }

  if (!data?.path) {
    throw new Error("Erro: caminho do arquivo não retornado após upload");
  }

  // Para buckets privados, tentar criar URL assinada
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 ano

  let finalUrl: string;

  if (signedUrlError || !signedUrlData?.signedUrl) {
    // Fallback: tentar URL pública (caso o bucket seja público ou para visualização)
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);
    
    finalUrl = publicUrlData.publicUrl;
    
    // Se ainda não tiver URL, usar URL baseada no path
    if (!finalUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (signedUrlError) {
        console.warn("Erro ao criar URL assinada:", signedUrlError.message);
      }
      finalUrl = `${supabaseUrl}/storage/v1/object/public/documents/${data.path}`;
    }
  } else {
    finalUrl = signedUrlData.signedUrl;
  }

  if (!finalUrl) {
    throw new Error("Não foi possível gerar URL para o arquivo");
  }

  return {
    url: finalUrl,
    fileType: fileExt,
    fileSize: file.size,
    path: data.path,
  };
}

// Cliente para uso no servidor (com service role key)
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Admin não configurado. Verifique SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
