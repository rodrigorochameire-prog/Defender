import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { withSheetsAuth, ensureSheet, type SheetsAuthContext } from "./google-sheets";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Mapeia as áreas principais do usuário (area enum) para o nome de aba
 * usado pela planilha master. Mantém consistência entre master e per-user.
 */
const AREA_TO_SHEET_NAME: Record<string, string> = {
  JURI: "Júri",
  EXECUCAO_PENAL: "EP",
  VIOLENCIA_DOMESTICA: "Violência Doméstica",
  CRIMINAL: "Substituição criminal",
  CIVEL: "Substituição cível",
  FAMILIA: "Família",
  FAZENDA_PUBLICA: "Fazenda Pública",
  INFANCIA_JUVENTUDE: "Infância e Juventude",
  CURADORIA: "Curadoria",
};

async function refreshAccessToken(refreshToken: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  return data.access_token;
}

/**
 * Cria um getToken que cacheia o access token OAuth do usuário por
 * ~55 minutos (tokens Google expiram em 1h). Refresh automático.
 */
function makeUserTokenGetter(refreshToken: string): () => Promise<string | null> {
  let cached: { token: string; expiresAt: number } | null = null;
  return async () => {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const token = await refreshAccessToken(refreshToken);
    cached = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return token;
  };
}

// ──────────────────────────────────────────────────────────────────────
// Contexto de auth per-user para sincronização contínua
// ──────────────────────────────────────────────────────────────────────

/**
 * Cache de contextos por usuário (TTL 5 min). Reaproveita o token getter
 * (que cacheia o access token por ~55 min) entre pushes na mesma instância,
 * e evita um round-trip ao banco a cada push. Cacheia também o negativo
 * (usuário sem sync ativo) para não consultar o banco em vão.
 */
const ctxCache = new Map<number, { ctx: SheetsAuthContext | null; expiresAt: number }>();
const CTX_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve o contexto de auth da planilha pessoal de um defensor.
 * Retorna null quando o usuário não vinculou o Google, não criou planilha
 * ou desativou o sync — caso em que o caller simplesmente pula o push.
 */
export async function getUserSheetsContext(userId: number): Promise<SheetsAuthContext | null> {
  const cached = ctxCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.ctx;

  let ctx: SheetsAuthContext | null = null;
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user?.sheetsSyncEnabled && user.sheetsSpreadsheetId) {
      const tokenRow = await db.query.userGoogleTokens.findFirst({
        where: eq(userGoogleTokens.userId, userId),
      });
      if (tokenRow) {
        ctx = {
          getToken: makeUserTokenGetter(tokenRow.refreshToken),
          spreadsheetId: user.sheetsSpreadsheetId,
          ownerDefensorId: userId,
        };
      }
    }
  } catch (err) {
    console.error(`[peruser] Falha ao resolver contexto Sheets do usuário ${userId}:`, err);
  }

  ctxCache.set(userId, { ctx, expiresAt: Date.now() + CTX_CACHE_TTL_MS });
  return ctx;
}

/** Invalida o cache de contexto (ex.: após unlink/criação de planilha). */
export function invalidateUserSheetsContext(userId: number): void {
  ctxCache.delete(userId);
}

/**
 * Cria uma planilha no Google Drive do usuário com o MESMO layout,
 * cores, dropdowns e formatação da planilha master — usando ensureSheet()
 * + formatSheet() compartilhados via contexto SheetsAuthContext.
 *
 * Fluxo:
 * 1. Cria spreadsheet vazia via OAuth do usuário
 * 2. Deleta a aba default "Sheet1"/"Página1" criada automaticamente
 * 3. Para cada área de atuação do usuário, chama ensureSheet() que cria
 *    a aba com headers, layout e formatação condicional via formatSheet()
 * 4. Salva spreadsheetId + url no banco e ativa sheets_sync_enabled
 */
export async function createUserSpreadsheet(userId: number): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabsCreated: string[];
}> {
  const tokenRow = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (!tokenRow) throw new Error("Google não vinculado");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  // 1. Cria getToken OAuth per-user com cache
  const getToken = makeUserTokenGetter(tokenRow.refreshToken);
  const initialToken = await getToken();
  if (!initialToken) throw new Error("Falha ao obter access token OAuth");

  // 2. Resolve comarca para título da planilha
  const comarcaResult = await db.execute(sql`SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`);
  const comarcaNome = (comarcaResult[0] as { nome?: string })?.nome ?? "Comarca";

  // 3. Determina abas a criar com base em areasPrincipais do usuário
  const areas = user.areasPrincipais ?? ["CRIMINAL"];
  const sheetNames = areas
    .map((area) => AREA_TO_SHEET_NAME[area])
    .filter((name): name is string => Boolean(name));
  if (sheetNames.length === 0) sheetNames.push("Demandas");

  // 4. Cria spreadsheet vazia via OAuth direto (sem auth context ainda — não temos spreadsheetId)
  const createRes = await fetch(SHEETS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${initialToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `OMBUDS — ${user.name} — ${comarcaNome}` },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Sheets API create error: ${err}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId as string;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl as string;
  const defaultSheetId = spreadsheet.sheets?.[0]?.properties?.sheetId as number | undefined;

  // 5. Agora com spreadsheetId em mãos, executa tudo dentro do contexto per-user.
  //    ensureSheet() internamente chama formatSheet() que aplica cores, dropdowns,
  //    layout title/separator/headers — tudo igual à master.
  const ctx: SheetsAuthContext = { getToken, spreadsheetId };

  await withSheetsAuth(ctx, async () => {
    const tabsCreated: string[] = [];
    for (const sheetName of sheetNames) {
      await ensureSheet(sheetName);
      tabsCreated.push(sheetName);
    }

    // 6. Deleta a aba default "Sheet1"/"Página1" (se existir e não for uma das nossas)
    if (defaultSheetId !== undefined && sheetNames.length > 0) {
      try {
        await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [{ deleteSheet: { sheetId: defaultSheetId } }],
          }),
        });
      } catch (err) {
        console.warn("[peruser] Falha ao deletar aba default (não crítico):", err);
      }
    }
  });

  // 7. Persiste no banco
  await db.execute(sql`
    UPDATE users SET
      sheets_spreadsheet_id = ${spreadsheetId},
      sheets_spreadsheet_url = ${spreadsheetUrl},
      sheets_sync_enabled = true
    WHERE id = ${userId}
  `);
  invalidateUserSheetsContext(userId);

  return { spreadsheetId, spreadsheetUrl, tabsCreated: sheetNames };
}
