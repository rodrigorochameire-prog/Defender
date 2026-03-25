import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase — credenciais via variáveis de ambiente (obrigatórias)
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Set it in your environment variables.`);
  }
  return value;
}

const SUPABASE_URL = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Singleton para o cliente Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Cliente para uso no frontend (com anon key)
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
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
