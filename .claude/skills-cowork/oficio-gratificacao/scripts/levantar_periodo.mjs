/**
 * Levanta dados de uma substituição p/ o relatório, agrupado por vara/atribuição.
 * Audiências + demandas (atos) + atendimentos (registros) do OMBUDS no período.
 * As petições (Drive, por data de assinatura) são varridas à parte pelo orquestrador.
 *
 * Uso: node levantar_periodo.mjs 2026-06-16 2026-07-05
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), { prepare: false, ssl: "require", connect_timeout: 20 });
const [ini, fim] = [process.argv[2], process.argv[3]];

const aud = await sql`
  SELECT DATE(au.data_audiencia AT TIME ZONE 'America/Bahia') d, au.tipo, p.atribuicao, p.numero_autos, ass.nome
  FROM audiencias au LEFT JOIN processos p ON p.id=au.processo_id LEFT JOIN assistidos ass ON ass.id=au.assistido_id
  WHERE DATE(au.data_audiencia AT TIME ZONE 'America/Bahia') BETWEEN ${ini} AND ${fim}
  ORDER BY au.data_audiencia`;
const dem = await sql`
  SELECT DATE(COALESCE(d.data_conclusao,d.data_entrada) AT TIME ZONE 'America/Bahia') dt, d.ato, p.atribuicao, p.numero_autos
  FROM demandas d LEFT JOIN processos p ON p.id=d.processo_id
  WHERE DATE(COALESCE(d.data_conclusao,d.data_entrada) AT TIME ZONE 'America/Bahia') BETWEEN ${ini} AND ${fim}
    AND d.deleted_at IS NULL ORDER BY dt`;
const ate = await sql`
  SELECT DATE(r.data_registro AT TIME ZONE 'America/Bahia') dt, r.tipo, r.assunto
  FROM registros r
  WHERE DATE(r.data_registro AT TIME ZONE 'America/Bahia') BETWEEN ${ini} AND ${fim}
  ORDER BY dt`;

const grp = (rows, key) => rows.reduce((m,r)=>{ (m[r[key]||'—'] ??= []).push(r); return m; }, {});
console.log(`=== PERÍODO ${ini} a ${fim} ===`);
console.log(`\nAUDIÊNCIAS (${aud.length}) por atribuição:`);
for (const [k,v] of Object.entries(grp(aud,"atribuicao"))) {
  console.log(`  [${k}] ${v.length}`);
  for (const x of v) console.log(`     ${x.d} ${x.tipo} | ${x.numero_autos} | ${x.nome??''}`);
}
console.log(`\nDEMANDAS/ATOS (${dem.length}) por atribuição:`);
for (const [k,v] of Object.entries(grp(dem,"atribuicao"))) console.log(`  [${k}] ${v.length}`);
console.log(`\nATENDIMENTOS/REGISTROS (${ate.length}) por tipo:`);
for (const [k,v] of Object.entries(grp(ate,"tipo"))) console.log(`  [${k}] ${v.length}`);
await sql.end();
