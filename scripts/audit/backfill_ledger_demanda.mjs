import postgres from "postgres";
import { readFileSync } from "node:fs";

export function pickDemandaId(matches) {
  if (!matches.length) return null;
  return matches.reduce((min, m) => (m.id < min.id ? m : min)).id; // tie-break determinístico: menor id
}

async function main() {
  const env = readFileSync(".env.local", "utf8");
  const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim()?.replace(/^["']|["']$/g, "");
  const sql = postgres(url, { max: 1, prepare: false });
  let filled = 0, ambiguous = 0, unmatched = 0;
  try {
    const rows = await sql`SELECT id, pje_documento_id FROM pje_intimacoes_ledger WHERE demanda_id IS NULL AND pje_documento_id IS NOT NULL`;
    for (const r of rows) {
      const matches = await sql`SELECT id FROM demandas WHERE pje_documento_id = ${r.pje_documento_id} AND deleted_at IS NULL ORDER BY id`;
      const did = pickDemandaId(matches);
      if (did === null) { unmatched++; continue; }
      if (matches.length > 1) ambiguous++;
      await sql`UPDATE pje_intimacoes_ledger SET demanda_id = ${did} WHERE id = ${r.id}`;
      filled++;
    }
    console.log(`backfill: filled=${filled} (ambiguous-resolved=${ambiguous}) unmatched=${unmatched}`);
  } finally { await sql.end(); }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
