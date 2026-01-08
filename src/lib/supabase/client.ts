import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://siwapjqndevuwsluncnr.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpd2FwanFuZGV2dXdzbHVuY25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDcwOTQsImV4cCI6MjA4MjA4MzA5NH0.TZY7Niw2qT-Pp3vMc2l5HO-Pq6dcEGvjKBrxBYQwm_4";

// Singleton para o cliente Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Cliente para uso no frontend (com anon key)
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
): Promise<{ url: string; fileName: string; mimeType: string; fileSize: number; path: string }> {
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

  // Para buckets privados, usar URL assinada
  const { data: signedUrlData } = await supabase.storage
    .from("documents")
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 ano

  return {
    url: signedUrlData?.signedUrl || "",
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    path: data.path,
  };
}

// Service Role Key (para operações administrativas no servidor)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente para uso no servidor (com service role key)
export function getSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
