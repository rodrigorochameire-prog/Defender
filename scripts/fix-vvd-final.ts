/**
 * Fix definitivo da aba VVD baseado em estado lido via Sheets API.
 *
 * Corrige __id__s, statuses, adiciona Wellington (713 — desaparecido)
 * e remove duplicata stale do Danilo.
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

async function put(range: string, values: string[][]) {
  return api("PUT", `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { values });
}

async function main() {
  console.log("=== Fix VVD final ===\n");

  // Verificar estado antes de mexer
  const rows = await readSheet(SHEET);
  const safetyChecks = [
    { row: 11, expectAssistido: "José Maria", desc: "José Maria" },
    { row: 12, expectAssistido: "Filipe", desc: "Filipe" },
    { row: 13, expectAssistido: "Lourivaldo", desc: "Lourivaldo" },
    { row: 14, expectAssistido: "Ivanildo", desc: "Ivanildo" },
    { row: 16, expectAssistido: "Welson", desc: "Welson" },
    { row: 17, expectAssistido: "Francisco de Jesus", desc: "Francisco" },
    { row: 18, expectAssistido: "George", desc: "George" },
    { row: 19, expectAssistido: "Danilo Conceição", desc: "Danilo correto" },
    { row: 21, expectAssistido: "Noel", desc: "Noel" },
    { row: 23, expectAssistido: "Danilo Conceição", desc: "Danilo stale" },
  ];
  for (const c of safetyChecks) {
    const r = rows[c.row - 1];
    const got = String(r?.[4] ?? "");
    if (!got.includes(c.expectAssistido)) {
      throw new Error(`Safety check FAIL: row ${c.row} esperava '${c.expectAssistido}' mas tem '${got}'`);
    }
  }
  console.log("✓ safety checks OK\n");

  // 1. Corrigir __id__s e status
  await put(`${SHEET}!A11`, [["589"]]);  console.log("  ✓ row 11 (José Maria): __id__ → 589");
  await put(`${SHEET}!B12`, [["4 - Amanda"]]);  console.log("  ✓ row 12 (Filipe): status → 4 - Amanda");
  await put(`${SHEET}!B13`, [["4 - Amanda"]]);  console.log("  ✓ row 13 (Lourivaldo): status → 4 - Amanda");
  await put(`${SHEET}!B14`, [["4 - Amanda"]]);  console.log("  ✓ row 14 (Ivanildo): status → 4 - Amanda");
  await put(`${SHEET}!B16`, [["5 - Triagem"]]); console.log("  ✓ row 16 (Welson): status → 5 - Triagem");
  await put(`${SHEET}!B17`, [["5 - Triagem"]]); console.log("  ✓ row 17 (Francisco): status → 5 - Triagem");
  await put(`${SHEET}!B18`, [["5 - Triagem"]]); console.log("  ✓ row 18 (George): status → 5 - Triagem");
  await put(`${SHEET}!A19`, [["580"]]);          console.log("  ✓ row 19 (Danilo correto): __id__ → 580");
  await put(`${SHEET}!B21`, [["7 - Resolvido"]]); console.log("  ✓ row 21 (Noel): status → 7 - Resolvido");

  // 2. Append Wellington (id 713) — está faltando
  // Layout: __id__, Status, Prisão, Data, Assistido, Autos, Ato, Prazo, Providências, Delegado
  const wellingtonRow = ["713", "5 - Triagem", "", "", "Wellington Gomes da Silva", "0501529-98.2019.8.05.0039", "Ciência", "", "", ""];
  await api("POST", `/values/${encodeURIComponent(SHEET)}!A1:J1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { values: [wellingtonRow] });
  console.log("  ✓ Wellington (713) adicionado ao final");

  // 3. Deletar row 23 (Danilo stale) — agora o append vai para row 24, então row 23 ainda é Danilo stale
  // Re-ler para confirmar a posição (mais seguro)
  const rows2 = await readSheet(SHEET);
  let danitoStaleRow = -1;
  for (let i = 0; i < rows2.length; i++) {
    const r = rows2[i];
    if (!r) continue;
    if (r[0] === "580" && String(r[5] ?? "").includes("Revogação de medida protetiva")) {
      danitoStaleRow = i + 1;
      break;
    }
  }
  if (danitoStaleRow > 0) {
    const sheets = await getSheets();
    const sheet = sheets.find((s) => s.title === SHEET);
    if (!sheet) throw new Error(`Aba '${SHEET}' não encontrada`);

    await api("POST", `:batchUpdate`, {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: danitoStaleRow - 1, endIndex: danitoStaleRow },
          },
        },
      ],
    });
    console.log(`  ✓ row ${danitoStaleRow} (Danilo stale duplicada) deletada`);
  } else {
    console.log("  ! Danilo stale não encontrado — pulando delete");
  }

  console.log("\n✓ Fix completo.");
}

main().then(() => process.exit(0)).catch((e) => { console.error("ERRO:", e); process.exit(1); });
