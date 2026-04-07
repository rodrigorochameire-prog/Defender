/**
 * Deleta da planilha as 2 linhas residuais sem __id__:
 *  - Jailson Rufino Santos de Santana (sem autos)
 *  - Carlos Geilson Silva Santana (sem autos, "Alegações finais")
 *
 * Ambas correspondem a demandas que foram soft-deleted no banco hoje
 * (pertenciam aos 23 processos corrompidos sem autos válidos).
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { getSheets, readSheet } from "@/lib/services/google-sheets";
import { GoogleAuth } from "google-auth-library";

const SHEET = "Violência Doméstica";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

async function getToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  let credentials;
  try { credentials = JSON.parse(keyJson); }
  catch { credentials = JSON.parse(Buffer.from(keyJson, "base64").toString("utf-8")); }
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const c = await auth.getClient();
  return (await c.getAccessToken()).token!;
}

async function api(method: string, path: string, body?: unknown) {
  const t = await getToken();
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

async function main() {
  const rows = await readSheet(SHEET);

  // Encontrar linhas pelo nome (sem assumir posição fixa)
  let jailsonRow = -1;
  let carlosRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const nome = String(r[4] ?? "");
    const id = String(r[0] ?? "").trim();
    if (id) continue; // só rows sem __id__
    if (nome.includes("Jailson Rufino")) jailsonRow = i + 1;
    if (nome.includes("Carlos Geilson")) carlosRow = i + 1;
  }
  if (jailsonRow < 0 || carlosRow < 0) {
    throw new Error(`Não encontrou: jailson=${jailsonRow} carlos=${carlosRow}`);
  }
  console.log(`Jailson em row ${jailsonRow}, Carlos Geilson em row ${carlosRow}`);

  // Deletar em ordem reversa
  const sheets = await getSheets();
  const sheet = sheets.find((s) => s.title === SHEET);
  if (!sheet) throw new Error("Aba não encontrada");

  const toDelete = [jailsonRow, carlosRow].sort((a, b) => b - a);
  const requests = toDelete.map((rowNum) => ({
    deleteDimension: {
      range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: rowNum - 1, endIndex: rowNum },
    },
  }));

  await api("POST", `:batchUpdate`, { requests });
  console.log(`✓ ${toDelete.length} linhas deletadas (rows ${toDelete.join(", ")})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("ERRO:", e); process.exit(1); });
