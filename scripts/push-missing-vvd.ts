/**
 * Adiciona ao planilha as demandas VVD ativas que ainda não têm linha lá.
 * Usado após cleanup-vvd.ts para fechar o sync.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { readSheet, pushDemanda } from "@/lib/services/google-sheets";

const SHEET_NAME = "Violência Doméstica";
const COL_ID = 0;

async function main() {
  // 1. IDs já presentes na planilha
  const rows = await readSheet(SHEET_NAME);
  const present = new Set<number>();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const idStr = String(r[COL_ID] ?? "").trim();
    if (idStr && !isNaN(Number(idStr))) present.add(Number(idStr));
  }
  console.log(`IDs já na planilha: ${present.size}`);

  // 2. Demandas VVD ativas no banco
  const dbRows = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      ato: demandas.ato,
      prazo: demandas.prazo,
      providencias: demandas.providencias,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .where(and(isNull(demandas.deletedAt), eq(processos.atribuicao, "VVD_CAMACARI")));

  console.log(`VVD ativas no banco: ${dbRows.length}`);

  // 3. Faltantes
  const missing = dbRows.filter((d) => !present.has(d.id));
  console.log(`Faltam adicionar: ${missing.length}\n`);

  for (const m of missing) {
    console.log(`  + id=${m.id}  ${m.assistidoNome}  [${m.status}/${m.substatus}]  ${m.ato}`);
  }

  if (missing.length === 0) {
    console.log("Nada a adicionar.");
    return;
  }

  console.log("\nEnviando para a planilha...");
  for (const m of missing) {
    const res = await pushDemanda({
      id: m.id,
      status: m.status,
      substatus: m.substatus ?? null,
      reuPreso: m.reuPreso,
      dataEntrada: m.dataEntrada,
      ato: m.ato,
      prazo: m.prazo,
      providencias: m.providencias,
      assistidoNome: m.assistidoNome ?? "",
      numeroAutos: m.numeroAutos ?? "",
      atribuicao: m.atribuicao ?? "VVD_CAMACARI",
      delegadoNome: null,
    });
    console.log(`  id=${m.id} → pushed=${res.pushed} conflict=${res.conflict}`);
  }
  console.log(`\n✓ ${missing.length} demandas enviadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
