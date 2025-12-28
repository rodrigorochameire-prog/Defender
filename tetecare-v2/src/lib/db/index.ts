import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton para conexão do banco
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

/**
 * Cria conexão com o banco de dados PostgreSQL
 * Usa singleton para evitar múltiplas conexões em desenvolvimento
 */
function createConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "❌ DATABASE_URL não está definida. Configure seu arquivo .env.local"
    );
  }

  // Configurações otimizadas para Supabase/PostgreSQL
  const conn = postgres(databaseUrl, {
    max: 10, // Máximo de conexões no pool
    idle_timeout: 20, // Timeout de conexão ociosa (segundos)
    connect_timeout: 10, // Timeout de conexão (segundos)
    prepare: false, // Desabilitar prepared statements (melhor para serverless)
  });

  return conn;
}

// Conexão singleton
if (!globalForDb.conn) {
  globalForDb.conn = createConnection();
}

// Instância do Drizzle com schema para query builder
if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.conn, { schema });
}

export const db = globalForDb.db;

/**
 * Verifica se a conexão com o banco está funcionando
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await globalForDb.conn!`SELECT 1 as test`;
    return result.length > 0;
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco:", error);
    return false;
  }
}

/**
 * Fecha a conexão com o banco (para cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (globalForDb.conn) {
    await globalForDb.conn.end();
    globalForDb.conn = undefined;
    globalForDb.db = undefined;
  }
}

// Re-exportar tipos e schema
export * from "./schema";
