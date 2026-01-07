import { z } from "zod";

/**
 * Schema de validação das variáveis de ambiente
 * Garante que todas as variáveis necessárias estão configuradas
 */
const envSchema = z.object({
  // Banco de dados (obrigatório em runtime, opcional no build)
  DATABASE_URL: z.string().optional(),

  // Autenticação (obrigatório em runtime, opcional no build)
  AUTH_SECRET: z.string().optional(),

  // Supabase (opcional - para storage)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Stripe (opcional - para pagamentos)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

/**
 * Valida as variáveis de ambiente
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

/**
 * Verifica se DATABASE_URL está configurada (para uso em runtime)
 */
export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está configurada");
  }
  return env.DATABASE_URL;
}

/**
 * Verifica se AUTH_SECRET está configurada (para uso em runtime)
 */
export function requireAuthSecret(): string {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 16) {
    throw new Error("AUTH_SECRET deve ter no mínimo 16 caracteres");
  }
  return env.AUTH_SECRET;
}

// Helpers
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
