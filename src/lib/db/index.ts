import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ==========================================
// CONFIGURAÇÃO DE CONEXÃO
// ==========================================

/**
 * Configurações do pool de conexões
 * Otimizado para ambiente serverless (Vercel)
 */
const POOL_CONFIG = {
  // Número máximo de conexões no pool
  // Em serverless, manter baixo para evitar "too many connections"
  max: process.env.NODE_ENV === "production" ? 15 : 10,
  
  // Timeout de conexão ociosa (segundos)
  idle_timeout: 20,
  
  // Timeout para estabelecer conexão (segundos)
  connect_timeout: 10,
  
  // Desabilitar prepared statements (melhor para serverless/pgbouncer)
  // PgBouncer em modo "transaction" não suporta prepared statements
  prepare: false,
  
  // Timeout máximo para queries (milissegundos)
  max_lifetime: 5 * 60 * 1000, // 5 minutos
  
  // Configurações SSL para Supabase
  ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
} as const;

// Singleton para conexão do banco
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

/**
 * Obtém a URL do banco de dados
 * Suporta tanto DATABASE_URL quanto POSTGRES_URL
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!url) {
    throw new Error(
      "❌ DATABASE_URL não está definida. Configure seu arquivo .env.local"
    );
  }
  
  // DEV: usar o pooler em SESSION mode (5432) em vez de TRANSACTION mode (6543).
  // O postgres-js trava (stall até o connect_timeout) quando a fila de queries
  // excede o pool contra o Supavisor em transaction mode — cada page load do app
  // dispara 15-30 queries paralelas num pool de 10 e congelava o dev inteiro
  // (tRPC uniformemente em ~10s/~30s). Em session mode o mesmo cenário responde
  // em ~1s. Produção (serverless) permanece em transaction mode, que é o correto lá.
  if (process.env.NODE_ENV !== "production" && url.includes("pooler.supabase.com:6543")) {
    return url.replace("pooler.supabase.com:6543", "pooler.supabase.com:5432");
  }

  return url;
}

/**
 * Cria conexão com o banco de dados PostgreSQL
 * Usa singleton para evitar múltiplas conexões em desenvolvimento
 */
function createConnection(): postgres.Sql {
  const databaseUrl = getDatabaseUrl();
  
  // Log da conexão apenas em desenvolvimento
  if (process.env.NODE_ENV === "development") {
    const urlParts = databaseUrl.split("@");
    const host = urlParts[1]?.split("/")[0] || "unknown";
    console.log(`🔌 Conectando ao PostgreSQL: ${host}`);
  }
  
  const conn = postgres(databaseUrl, {
    ...POOL_CONFIG,
    // Callback para log de erros de conexão
    onnotice: process.env.NODE_ENV === "development" 
      ? (notice) => console.log(`[PostgreSQL Notice] ${notice.message}`)
      : undefined,
  });

  return conn;
}

/**
 * Obtém a instância do banco de dados (lazy initialization)
 * Só inicializa a conexão quando realmente precisa
 */
function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!globalForDb.conn) {
    globalForDb.conn = createConnection();
  }

  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.conn, { 
      schema,
      // Log de queries apenas em desenvolvimento
      logger: process.env.NODE_ENV === "development" && process.env.LOG_QUERIES === "true"
        ? {
            logQuery: (query, params) => {
              console.log(`[SQL] ${query.substring(0, 100)}...`);
            },
          }
        : undefined,
    });
  }

  return globalForDb.db;
}

/**
 * Proxy para lazy initialization
 * Exportar db como getter lazy para evitar conexão durante build
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof typeof database];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

/**
 * Verifica se a conexão com o banco está funcionando
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = globalForDb.conn ?? createConnection();
    const result = await conn`SELECT 1 as test`;
    return result.length > 0;
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco:", error);
    return false;
  }
}

/**
 * Verifica a saúde do banco de dados com mais detalhes
 */
export async function healthCheck(): Promise<{
  connected: boolean;
  latency: number;
  poolSize?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const conn = globalForDb.conn ?? createConnection();
    await conn`SELECT 1`;
    
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fecha a conexão com o banco (para cleanup)
 * Útil para testes ou graceful shutdown
 */
export async function closeConnection(): Promise<void> {
  if (globalForDb.conn) {
    await globalForDb.conn.end();
    globalForDb.conn = undefined;
    globalForDb.db = undefined;
    
    if (process.env.NODE_ENV === "development") {
      console.log("🔌 Conexão com PostgreSQL fechada");
    }
  }
}

/**
 * Executa uma transação com retry automático em caso de deadlock
 */
export async function withTransaction<T>(
  fn: (tx: typeof db) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.transaction(fn as any);
    } catch (error: any) {
      lastError = error;
      
      // Código de erro de deadlock no PostgreSQL
      if (error?.code === "40P01" && attempt < maxRetries) {
        // Espera exponencial antes de retry
        await new Promise((resolve) => 
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// Re-exportar tipos, schema e helpers
export * from "./schema";
export * from "./helpers";
