import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const AREA_TAB_MAP: Record<string, string> = {
  CRIMINAL: "Demandas Criminal",
  JURI: "Demandas Júri",
  EXECUCAO_PENAL: "Demandas EP",
  VIOLENCIA_DOMESTICA: "Demandas VVD",
  INFANCIA_JUVENTUDE: "Demandas Infância",
  CIVEL: "Demandas Cível",
  FAMILIA: "Demandas Família",
  FAZENDA_PUBLICA: "Demandas Fazenda Pública",
};

const HEADERS = [
  "__id__", "Status", "Prisão", "Data", "Assistido",
  "Autos", "Ato", "Prazo", "Providências", "Delegado Para",
];

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

export async function createUserSpreadsheet(userId: number): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (!token) throw new Error("Google não vinculado");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  const accessToken = await getAccessToken(token.refreshToken);
  const comarcaResult = await db.execute(sql`SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`);
  const comarcaNome = (comarcaResult[0] as any)?.nome ?? "Comarca";

  const areas = user.areasPrincipais ?? ["CRIMINAL"];
  const tabs = areas.map(area => AREA_TAB_MAP[area]).filter(Boolean);
  if (tabs.length === 0) tabs.push("Demandas");

  const createRes = await fetch(SHEETS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `OMBUDS — ${user.name} — ${comarcaNome}` },
      sheets: tabs.map((title, i) => ({
        properties: { sheetId: i, title, index: i },
      })),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Sheets API error: ${err}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  const requests = tabs.map((tabName, i) => ({
    updateCells: {
      range: { sheetId: i, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
      rows: [{
        values: HEADERS.map(h => ({
          userEnteredValue: { stringValue: h },
          userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.15, green: 0.15, blue: 0.17 } },
        })),
      }],
      fields: "userEnteredValue,userEnteredFormat",
    },
  }));

  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  await db.execute(sql`
    UPDATE users SET
      sheets_spreadsheet_id = ${spreadsheetId},
      sheets_spreadsheet_url = ${spreadsheetUrl},
      sheets_sync_enabled = true
    WHERE id = ${userId}
  `);

  return { spreadsheetId, spreadsheetUrl };
}
