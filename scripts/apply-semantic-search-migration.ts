/**
 * Script to apply the semantic search migration (pgvector document_embeddings table).
 * Run with: npx tsx scripts/apply-semantic-search-migration.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  // Load .env.local for database URL
  const dotenv = await import("dotenv");
  dotenv.config({ path: join(process.cwd(), ".env.local") });

  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const { sql } = await import("drizzle-orm");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  console.log("[migration] Connecting to database...");
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    const migrationPath = join(process.cwd(), "drizzle", "0013_semantic_search.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    // Split by semicolons and execute each statement
    const statements = migrationSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`[migration] Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[migration] Statement ${i + 1}/${statements.length}: ${stmt.substring(0, 60)}...`);
      await db.execute(sql.raw(stmt));
    }

    console.log("[migration] Semantic search migration applied successfully!");
  } catch (error) {
    console.error("[migration] Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
