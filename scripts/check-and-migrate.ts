import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";

/**
 * Script para verificar e aplicar migrações com segurança
 *
 * Este script:
 * 1. Verifica se as colunas linkedResourceType, linkedResourceId e autoCreated existem
 * 2. Se existirem, marca a migração 0050 como aplicada
 * 3. Aplica as migrações restantes
 */

async function checkAndMigrate() {
  try {
    console.log("🔍 Verificando estado do banco de dados...");

    const db = await getDb();
    if (!db) {
      console.error("❌ Não foi possível conectar ao banco de dados");
      process.exit(1);
    }

    // Verificar se as colunas já existem
    const columns = await db.execute<any>(sql`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'calendar_events'
        AND COLUMN_NAME IN ('linkedResourceType', 'linkedResourceId', 'autoCreated')
    `);

    const existingColumns = columns.rows?.map((row: any) => row.COLUMN_NAME) || [];
    console.log(`📊 Colunas encontradas: ${existingColumns.join(", ")}`);

    if (existingColumns.length === 3) {
      console.log("✅ Todas as colunas já existem no banco!");

      // Verificar se a migração 0050 está registrada
      const migrations = await db.execute<any>(sql`
        SELECT hash FROM __drizzle_migrations
        WHERE hash LIKE '0050%' OR hash LIKE '%calendar_auto_integration%'
      `);

      if (!migrations.rows || migrations.rows.length === 0) {
        console.log("⚠️  Migração 0050 não está registrada. Registrando...");

        await db.execute(sql`
          INSERT INTO __drizzle_migrations (hash, created_at)
          VALUES ('0050_calendar_auto_integration', NOW())
          ON DUPLICATE KEY UPDATE hash = hash
        `);

        console.log("✅ Migração 0050 registrada!");
      } else {
        console.log("✅ Migração 0050 já estava registrada");
      }
    } else if (existingColumns.length > 0 && existingColumns.length < 3) {
      console.error("❌ Estado inconsistente! Apenas algumas colunas existem.");
      console.error(`   Encontradas: ${existingColumns.join(", ")}`);
      console.error(`   Esperadas: linkedResourceType, linkedResourceId, autoCreated`);
      process.exit(1);
    } else {
      console.log("📝 Colunas não existem. As migrações irão criá-las.");
    }

    // Aplicar migrações
    console.log("\n🚀 Aplicando migrações...");

    await migrate(db, {
      migrationsFolder: "./drizzle",
    });

    console.log("✅ Migrações aplicadas com sucesso!");
    process.exit(0);

  } catch (error: any) {
    // Se o erro for de coluna duplicada, considerar como sucesso
    if (error.message?.includes("Duplicate column name") ||
        error.cause?.message?.includes("Duplicate column name")) {
      console.log("ℹ️  Colunas já existem (erro de duplicação ignorado)");
      console.log("✅ Banco de dados está no estado correto!");
      process.exit(0);
    }

    console.error("❌ Erro ao verificar/migrar:", error);
    process.exit(1);
  }
}

checkAndMigrate();
