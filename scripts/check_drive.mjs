import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sql = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL, { max: 1 });
try {
  // Garrido (832) + top proc c/ arquivos (244)
  for (const pid of [832, 244, 118, 187]) {
    const rows = await sql`
      SELECT name, mime_type, categoria, document_type
      FROM drive_files WHERE processo_id = ${pid} ORDER BY name LIMIT 15
    `;
    console.log(`\n=== Proc ${pid} (${rows.length} sample) ===`);
    for (const r of rows) {
      console.log(`  [${r.categoria ?? r.document_type ?? '-'}] ${r.name}`);
    }
  }
} catch(e){ console.error("ERR:", e.message); }
await sql.end();
