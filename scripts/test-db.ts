/**
 * Script para testar conexão com o banco de dados
 * Execute com: npx tsx scripts/test-db.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  console.log("\nDefina a variável de ambiente DATABASE_URL ou crie um arquivo .env.local");
  process.exit(1);
}

async function testConnection() {
  console.log("🔍 Testando conexão com o banco de dados...\n");

  // Mascarar senha na URL para log
  const maskedUrl = DATABASE_URL!.replace(/:[^@]+@/, ":***@");
  console.log(`📡 URL: ${maskedUrl}\n`);

  const conn = postgres(DATABASE_URL!, {
    ssl: "require",
    connect_timeout: 10,
  });

  try {
    // Testar conexão
    const result = await conn`SELECT current_database() as db, current_user as user, version() as version`;

    console.log("✅ Conexão bem-sucedida!\n");
    console.log(`📊 Banco: ${result[0].db}`);
    console.log(`👤 Usuário: ${result[0].user}`);
    console.log(`🔧 Versão: ${result[0].version.split(",")[0]}`);

    // Listar tabelas
    const tables = await conn`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`\n📋 Tabelas encontradas: ${tables.length}`);
    if (tables.length > 0) {
      tables.forEach((t) => console.log(`   - ${t.table_name}`));
    } else {
      console.log("   (nenhuma tabela criada ainda)");
      console.log("\n💡 Execute 'npm run db:push' para criar as tabelas");
    }
  } catch (error) {
    console.error("❌ Erro ao conectar:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

testConnection();
