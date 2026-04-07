/**
 * Corrige problemas residuais na aba VVD após cleanup + push:
 *  - Atualiza status stale (rows 17,18,19): Monitorar → Amanda
 *  - Linka __id__=580 em row 12 (Danilo correto sem id)
 *  - Deleta row 20 (Danilo com dados stale)
 *  - Deleta row 5 (Leandro duplicado sem id)
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { getSheets } from "@/lib/services/google-sheets";
import { GoogleAuth } from "google-auth-library";

const SHEET_NAME = "Violência Doméstica";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

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

async function sheetsRequest(method: string, path: string, body?: unknown) {
  const token = await getToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log("=== Fix VVD residuals ===\n");

  // 1. Atualizar status stale: rows 17, 18, 19 → "4 - Amanda" (B é a coluna Status)
  const statusUpdates = [
    { row: 17, name: "Filipe Costa Santos" },
    { row: 18, name: "Lourivaldo Francisco Candido de Lima" },
    { row: 19, name: "Ivanildo dos Santos Frias" },
  ];
  for (const u of statusUpdates) {
    await sheetsRequest(
      "PUT",
      `/values/${encodeURIComponent(SHEET_NAME)}!B${u.row}?valueInputOption=USER_ENTERED`,
      { values: [["4 - Amanda"]] }
    );
    console.log(`  ✓ row ${u.row} (${u.name}): status → "4 - Amanda"`);
  }

  // 2. Linkar row 12 (Danilo correto) — escrever 580 na coluna A
  await sheetsRequest(
    "PUT",
    `/values/${encodeURIComponent(SHEET_NAME)}!A12?valueInputOption=USER_ENTERED`,
    { values: [["580"]] }
  );
  console.log(`  ✓ row 12 (Danilo): __id__ → 580`);

  // 3. Deletar rows 20 e 5 (em ordem reversa)
  const sheets = await getSheets();
  const sheet = sheets.find((s) => s.title === SHEET_NAME);
  if (!sheet) throw new Error(`Aba '${SHEET_NAME}' não encontrada`);

  const requests = [
    {
      deleteDimension: {
        range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: 19, endIndex: 20 },
      },
    },
    {
      deleteDimension: {
        range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: 4, endIndex: 5 },
      },
    },
  ];

  await sheetsRequest("POST", `:batchUpdate`, { requests });
  console.log(`  ✓ row 20 deletada (Danilo stale)`);
  console.log(`  ✓ row 5 deletada (Leandro duplicado)`);

  console.log("\n✓ Correções aplicadas.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
