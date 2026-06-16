// scripts/backfill-autor-desconhecido.ts
// Uso: npx tsx scripts/backfill-autor-desconhecido.ts --dry-run   (ou sem flag p/ aplicar)
//
// Normaliza nomes de cadastros de autor não identificado e DESFUNDE assistidos
// que agrupam múltiplos processos — cada processo recebe seu próprio assistido
// keyed pelo CNJ. Idempotente: rodar novamente não cria duplicatas (nomes já
// corretos são preservados, processos já com assistido próprio não são movidos).
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import {
  isAutorDesconhecido, placeholderAutorDesconhecido, nomeAutorDesconhecido,
} from "../src/lib/autor-desconhecido";

const DRY = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL!.replace(/^"|"$/g, ""), {
  prepare: false,
  connect_timeout: 20,
  ssl: "require",
});

function log(m: string) { console.log(m); }

interface ProcRow {
  id: number;
  numero_autos: string;
  classe_processual: string | null;
  assunto: string | null;
  comarca: string | null;
  parte_contraria: string | null;
}

function nomeFor(p: ProcRow): string {
  return nomeAutorDesconhecido({
    cnj: p.numero_autos,
    classe: p.classe_processual,
    assunto: p.assunto,
    comarca: p.comarca,
    poloPassivo: p.parte_contraria,
  }) || placeholderAutorDesconhecido(p.numero_autos);
}

async function main() {
  const assistidos = await sql<{ id: number; nome: string; autor_nao_identificado: boolean }[]>`
    SELECT id, nome, autor_nao_identificado FROM assistidos WHERE deleted_at IS NULL`;
  const alvos = assistidos.filter((a) => a.autor_nao_identificado || isAutorDesconhecido(a.nome));
  log(`alvos: ${alvos.length}${DRY ? " (DRY-RUN — nada será gravado)" : ""}`);

  for (const a of alvos) {
    const procs = await sql<ProcRow[]>`
      SELECT id, numero_autos, classe_processual, assunto, comarca, parte_contraria
      FROM processos WHERE assistido_id = ${a.id} AND deleted_at IS NULL ORDER BY id`;

    if (procs.length === 0) {
      log(`  #${a.id} "${a.nome}" — sem processo, só marca flag`);
      if (!DRY) await sql`UPDATE assistidos SET autor_nao_identificado = true, updated_at = now() WHERE id = ${a.id}`;
      continue;
    }

    const p0 = procs[0];
    const nome0 = nomeFor(p0);
    log(`  #${a.id} "${a.nome}" → "${nome0}" (proc ${p0.numero_autos})`);
    if (!DRY) await sql`UPDATE assistidos SET nome = ${nome0}, autor_nao_identificado = true, updated_at = now() WHERE id = ${a.id}`;

    for (const p of procs.slice(1)) {
      const nomeN = nomeFor(p);
      log(`    DESFUNDIR proc ${p.numero_autos} → novo assistido "${nomeN}"`);
      if (!DRY) {
        const [novo] = await sql<{ id: number }[]>`
          INSERT INTO assistidos (nome, autor_nao_identificado, created_at, updated_at)
          VALUES (${nomeN}, true, now(), now()) RETURNING id`;
        await sql`UPDATE processos SET assistido_id = ${novo.id}, updated_at = now() WHERE id = ${p.id}`;
        await sql`UPDATE demandas SET assistido_id = ${novo.id}, updated_at = now() WHERE processo_id = ${p.id}`;
        await sql`UPDATE assistidos_processos SET assistido_id = ${novo.id} WHERE processo_id = ${p.id}`;
      }
    }
  }
  await sql.end();
  log("fim.");
}
main().catch((e) => { console.error(e); process.exit(1); });
