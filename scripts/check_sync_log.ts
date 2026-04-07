import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sync_log' ORDER BY ordinal_position
  `;
  console.log("Colunas sync_log:", cols.map(c => c.column_name).join(", "));

  console.log("\n=== Últimas 15 entradas de sync_log ===");
  const logs = await sql`
    SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 15
  `;
  console.table(logs);

  console.log("\n=== Última sync vinda da PLANILHA ===");
  const last = await sql`
    SELECT * FROM sync_log WHERE origem = 'PLANILHA'
    ORDER BY created_at DESC LIMIT 5
  `;
  console.table(last);

  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
