/**
 * Script para executar migrações SQL no banco de dados
 * 
 * Uso: npx tsx scripts/run-migration.ts [nome-do-arquivo]
 */

import postgres from "postgres";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL não está definida");
    process.exit(1);
  }

  console.log("🔌 Conectando ao banco de dados...");
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });

  try {
    // Verificar conexão
    await sql`SELECT 1`;
    console.log("✅ Conexão estabelecida");

    // Diretório de migrações
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    
    // Arquivo específico ou todos
    const specificFile = process.argv[2];
    
    let migrationFiles: string[];
    
    if (specificFile) {
      migrationFiles = [specificFile];
    } else {
      // Listar todos os arquivos de migração
      migrationFiles = readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();
    }

    console.log(`\n📁 Migrações a executar: ${migrationFiles.length}`);
    
    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      console.log(`\n📄 Executando: ${file}`);
      
      try {
        const sqlContent = readFileSync(filePath, "utf-8");
        
        // Executar o SQL
        await sql.unsafe(sqlContent);
        
        console.log(`   ✅ ${file} executado com sucesso`);
      } catch (error: any) {
        console.error(`   ❌ Erro em ${file}:`, error.message);
        
        // Continuar com os próximos se for erro de "já existe"
        if (error.message.includes("already exists") || 
            error.message.includes("duplicate")) {
          console.log(`   ⏭️ Continuando (objeto já existe)...`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n🎉 Migrações concluídas!");
    
  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log("🔌 Conexão fechada");
  }
}

runMigration();
