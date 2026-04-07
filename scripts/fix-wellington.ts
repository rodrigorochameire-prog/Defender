/**
 * Wellington foi adicionado errado em row 2 (quebrou o header).
 * Deletar row 2, e re-adicionar Wellington em row 24 (depois do último dado).
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
  console.log("=== Fix Wellington misplacement ===\n");

  // 1. Verificar que row 2 contém Wellington (em qualquer coluna — append shifted os dados)
  const rows = await readSheet(SHEET);
  const row2 = rows[1];
  const row2joined = (row2 ?? []).join("|");
  if (!row2joined.includes("Wellington")) {
    throw new Error(`Row 2 não contém Wellington: ${JSON.stringify(row2)}`);
  }
  console.log(`✓ confirmado: row 2 contém Wellington (shifted)`);

  // 2. Deletar row 2
  const sheets = await getSheets();
  const sheet = sheets.find((s) => s.title === SHEET);
  if (!sheet) throw new Error(`Aba '${SHEET}' não encontrada`);

  await api("POST", `:batchUpdate`, {
    requests: [{
      deleteDimension: {
        range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 },
      },
    }],
  });
  console.log("✓ row 2 (Wellington misplaced) deletada");

  // 3. Encontrar próxima row vazia depois da última de dados
  const rows2 = await readSheet(SHEET);
  let lastDataRow = 3; // header termina aqui
  for (let i = 3; i < rows2.length; i++) {
    const r = rows2[i];
    if (r && r.some((c) => c?.trim())) lastDataRow = i + 1;
  }
  const targetRow = lastDataRow + 1;
  console.log(`Última row com dados: ${lastDataRow}. Wellington vai para row ${targetRow}`);

  // 4. PUT direto na row alvo
  const wellingtonRow = ["713", "5 - Triagem", "", "", "Wellington Gomes da Silva", "0501529-98.2019.8.05.0039", "Ciência", "", "", ""];
  await api("PUT", `/values/${encodeURIComponent(SHEET)}!A${targetRow}:J${targetRow}?valueInputOption=USER_ENTERED`, { values: [wellingtonRow] });
  console.log(`✓ Wellington adicionado em row ${targetRow}`);

  console.log("\n✓ Fix aplicado.");
}

main().then(() => process.exit(0)).catch((e) => { console.error("ERRO:", e); process.exit(1); });
