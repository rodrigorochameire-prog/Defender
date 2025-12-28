import { z } from "zod";

/**
 * Schema de validação das variáveis de ambiente
 * Garante que todas as variáveis necessárias estão configuradas
 */
const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  // Autenticação
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET deve ter no mínimo 16 caracteres"),

  // Supabase (opcional, para storage)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

/**
 * Valida as variáveis de ambiente no startup
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Variáveis de ambiente inválidas:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Configuração de ambiente inválida. Verifique seu .env.local");
  }

  return parsed.data;
}

// Exportar env validado
export const env = validateEnv();

// Helpers
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
