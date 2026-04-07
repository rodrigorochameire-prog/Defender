/**
 * Script: cleanup-vvd.ts
 *
 * Limpa a aba "Violência Doméstica" da planilha removendo linhas zumbi
 * (que apontam para demandas soft-deleted ou de outras atribuições no banco).
 *
 * Estratégia: lê a planilha, identifica __id__s órfãos, deleta as linhas
 * fisicamente via batchUpdate.deleteDimension (em ordem reversa para manter
 * índices válidos). Preserva formatação, dropdowns e cores condicionais.
 *
 * Uso:
 *   DRY_RUN=true  npx tsx scripts/cleanup-vvd.ts   (default — só mostra)
 *   DRY_RUN=false npx tsx scripts/cleanup-vvd.ts   (executa)
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { demandas, processos } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { readSheet, getSheets } from "@/lib/services/google-sheets";
import { GoogleAuth } from "google-auth-library";

const SHEET_NAME = "Violência Doméstica";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const DRY_RUN = process.env.DRY_RUN !== "false";

const COL_ID = 0;
const COL_STATUS = 1;
const COL_ASSISTIDO = 4;
const COL_AUTOS = 5;
const COL_ATO = 6;

async function getToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  let credentials;
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    credentials = JSON.parse(Buffer.from(keyJson, "base64").toString("utf-8"));
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  return tok.token!;
}

async function main() {
  console.log(`\n=== Cleanup VVD (${DRY_RUN ? "DRY RUN" : "EXECUTANDO"}) ===\n`);

  // 1. Ler planilha
  const rows = await readSheet(SHEET_NAME);
  console.log(`Linhas totais na aba: ${rows.length}`);

  // 2. Coletar __id__s da planilha
  const planilhaIds: number[] = [];
  const idToRow = new Map<number, { row: number; assistido: string; autos: string; status: string }>();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => !c?.trim())) continue;
    const idStr = String(r[COL_ID] ?? "").trim();
    if (idStr && !isNaN(Number(idStr))) {
      const id = Number(idStr);
      planilhaIds.push(id);
      idToRow.set(id, {
        row: i + 1, // 1-indexed
        assistido: String(r[COL_ASSISTIDO] ?? "").trim(),
        autos: String(r[COL_AUTOS] ?? "").trim(),
        status: String(r[COL_STATUS] ?? "").trim(),
      });
    }
  }
  console.log(`Linhas com __id__: ${planilhaIds.length}`);

  // 3. Buscar essas demandas no banco (incluindo soft-deleted, de qualquer atribuição)
  const dbRows = await db
    .select({
      id: demandas.id,
      deletedAt: demandas.deletedAt,
      atribuicao: processos.atribuicao,
    })
    .from(demandas)
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .where(inArray(demandas.id, planilhaIds));

  const dbMap = new Map(dbRows.map((d) => [d.id, d]));

  // 4. Classificar
  const toDelete: Array<{ row: number; id: number; reason: string; assistido: string }> = [];
  const ok: number[] = [];

  for (const id of planilhaIds) {
    const meta = idToRow.get(id)!;
    const dbRow = dbMap.get(id);

    if (!dbRow) {
      toDelete.push({ row: meta.row, id, reason: "NÃO EXISTE no banco", assistido: meta.assistido });
    } else if (dbRow.deletedAt) {
      toDelete.push({ row: meta.row, id, reason: "SOFT-DELETED", assistido: meta.assistido });
    } else if (dbRow.atribuicao !== "VVD_CAMACARI") {
      toDelete.push({
        row: meta.row,
        id,
        reason: `OUTRA ATRIBUIÇÃO: ${dbRow.atribuicao}`,
        assistido: meta.assistido,
      });
    } else {
      ok.push(id);
    }
  }

  console.log(`\n  ✓ OK (linhas saudáveis): ${ok.length}`);
  console.log(`  ✗ A REMOVER (zumbis):    ${toDelete.length}\n`);

  if (toDelete.length === 0) {
    console.log("Nada a fazer.");
    return;
  }

  console.log("Linhas que serão removidas:");
  for (const d of toDelete.slice(0, 20)) {
    console.log(`  row=${d.row}  id=${d.id}  ${d.assistido.padEnd(40)} [${d.reason}]`);
  }
  if (toDelete.length > 20) console.log(`  ... e mais ${toDelete.length - 20}`);

  if (DRY_RUN) {
    console.log("\nDRY_RUN=true — nenhuma alteração feita.");
    console.log("Para executar: DRY_RUN=false npx tsx scripts/cleanup-vvd.ts");
    return;
  }

  // 5. Buscar sheetId numérico
  const sheets = await getSheets();
  const sheet = sheets.find((s) => s.title === SHEET_NAME);
  if (!sheet) throw new Error(`Aba '${SHEET_NAME}' não encontrada`);

  // 6. Deletar em ordem reversa (linhas maiores primeiro) — manter índices válidos
  const rowsToDelete = toDelete.map((d) => d.row).sort((a, b) => b - a);

  // batchUpdate com deleteDimension. Sheets API usa índices 0-based para startIndex.
  const requests = rowsToDelete.map((rowNum) => ({
    deleteDimension: {
      range: {
        sheetId: sheet.sheetId,
        dimension: "ROWS",
        startIndex: rowNum - 1, // 0-based
        endIndex: rowNum,
      },
    },
  }));

  const token = await getToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;

  // Executar em chunks de 100 requests para evitar payload gigante
  const CHUNK = 100;
  for (let i = 0; i < requests.length; i += CHUNK) {
    const chunk = requests.slice(i, i + CHUNK);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`batchUpdate falhou (${res.status}): ${body}`);
    }
    console.log(`  Chunk ${i / CHUNK + 1}: ${chunk.length} linhas deletadas`);
  }

  console.log(`\n✓ ${toDelete.length} linhas zumbi removidas da aba "${SHEET_NAME}".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
