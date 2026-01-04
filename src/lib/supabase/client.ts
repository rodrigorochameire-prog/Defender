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
 * Usa o bucket 'pet-photos' que já tem RLS configurado
 * Documentos são salvos em: docs/{petId}/{category}/{arquivo}
 */
export async function uploadDocumentClient(
  file: File,
  petId: number,
  category: string
): Promise<{ url: string; fileType: string; fileSize: number }> {
  const supabase = getSupabaseClient();
  
  // Gerar nome único - usando pasta 'docs' dentro do bucket pet-photos
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `docs/${petId}/${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload para o bucket pet-photos (já tem RLS configurado)
  const { data, error } = await supabase.storage
    .from("pet-photos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`);
  }

  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from("pet-photos")
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    fileType: fileExt,
    fileSize: file.size,
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
