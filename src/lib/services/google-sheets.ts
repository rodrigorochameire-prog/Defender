/**
 * Serviço de Sincronização Bidirecional com Google Sheets
 *
 * Sincroniza demandas ↔ Google Sheets.
 * App tem precedência em conflitos.
 *
 * Autenticação: Service Account (GOOGLE_SERVICE_ACCOUNT_KEY)
 * Planilha: GOOGLE_SHEETS_SPREADSHEET_ID
 */

import { GoogleAuth } from "google-auth-library";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Linha do cabeçalho (1-indexed)
const HEADER_ROW = 1;
// Primeira linha de dados
const DATA_START_ROW = 2;

// Colunas (1-indexed para Sheets API)
export const COL = {
  ID: 1,         // A — oculto, chave de ligação
  STATUS: 2,     // B
  PRESO: 3,      // C — data de prisão ou checkbox
  DATA: 4,       // D — dataEntrada
  ASSISTIDO: 5,  // E
  AUTOS: 6,      // F
  ATO: 7,        // G
  PRAZO: 8,      // H
  PROVIDENCIAS: 9, // I
  DELEGADO: 10,  // J
} as const;

// Nomes das colunas para o cabeçalho
const HEADERS = [
  "__id__",
  "Status",
  "Prisão",
  "Data",
  "Assistido",
  "Autos",
  "Ato",
  "Prazo",
  "Providências",
  "Delegado Para",
];

// Mapeamento atribuição DB → nome da aba na planilha
export const ATRIBUICAO_TO_SHEET: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Substituição criminal",
  SUBSTITUICAO_CIVEL: "Substituição criminal",
  GRUPO_JURI: "Plenários",
};

// ==========================================
// TIPOS
// ==========================================

export interface DemandaParaSync {
  id: number;
  status: string | null;
  reuPreso: boolean | null;
  dataEntrada: string | null; // date string YYYY-MM-DD
  assistidoNome: string;
  numeroAutos: string;
  ato: string | null;
  prazo: string | null; // date string YYYY-MM-DD
  providencias: string | null;
  delegadoNome: string | null;
  atribuicao: string; // valor do enum
}

export interface SyncStats {
  inserted: number;
  updated: number;
  removed: number;
  errors: string[];
}

// ==========================================
// AUTENTICAÇÃO — reusa padrão do google-drive.ts
// ==========================================

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    console.error("[Sheets] GOOGLE_SERVICE_ACCOUNT_KEY não configurada");
    return null;
  }

  try {
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
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse?.token;

    if (!token) return null;

    cachedToken = { token, expiresAt: Date.now() + 3500 * 1000 };
    return token;
  } catch (err) {
    console.error("[Sheets] Erro de autenticação:", err);
    return null;
  }
}

// ==========================================
// HELPERS DE API
// ==========================================

async function sheetsGet(path: string): Promise<unknown> {
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");

  const res = await fetch(`${SHEETS_API_BASE}/${SPREADSHEET_ID}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets GET ${path} → ${res.status}: ${body}`);
  }

  return res.json();
}

async function sheetsPost(path: string, body: unknown): Promise<unknown> {
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");

  const res = await fetch(`${SHEETS_API_BASE}/${SPREADSHEET_ID}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const respBody = await res.text();
    throw new Error(`Sheets POST ${path} → ${res.status}: ${respBody}`);
  }

  return res.json();
}

async function sheetsPut(path: string, body: unknown): Promise<unknown> {
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");

  const res = await fetch(`${SHEETS_API_BASE}/${SPREADSHEET_ID}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const respBody = await res.text();
    throw new Error(`Sheets PUT ${path} → ${res.status}: ${respBody}`);
  }

  return res.json();
}

// ==========================================
// UTILITÁRIOS DE PLANILHA
// ==========================================

/**
 * Converte número de coluna (1-indexed) para letra (A, B, ..., Z, AA, ...)
 */
function colToLetter(col: number): string {
  let letter = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * Retorna a lista de abas da planilha
 */
async function getSheets(): Promise<Array<{ sheetId: number; title: string }>> {
  const data = await sheetsGet("?fields=sheets.properties") as {
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };
  return data.sheets.map((s) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
  }));
}

/**
 * Cria uma aba se não existir. Retorna o sheetId.
 */
async function ensureSheet(title: string): Promise<number> {
  const sheets = await getSheets();
  const existing = sheets.find((s) => s.title === title);
  if (existing) return existing.sheetId;

  const result = await sheetsPost(":batchUpdate", {
    requests: [
      {
        addSheet: {
          properties: { title },
        },
      },
    ],
  }) as { replies: Array<{ addSheet: { properties: { sheetId: number } } }> };

  const sheetId = result.replies[0].addSheet.properties.sheetId;

  // Escreve cabeçalho e oculta coluna A (__id__)
  await sheetsPut(
    `/values/${encodeURIComponent(title)}!A1:${colToLetter(HEADERS.length)}1?valueInputOption=RAW`,
    { values: [HEADERS] }
  );

  await sheetsPost(":batchUpdate", {
    requests: [
      {
        // Oculta coluna A (índice 0)
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
          properties: { hiddenByUser: true },
          fields: "hiddenByUser",
        },
      },
      {
        // Congela linha 1 (cabeçalho)
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
    ],
  });

  return sheetId;
}

/**
 * Lê todos os dados de uma aba. Retorna array de linhas (cada linha = array de strings).
 */
async function readSheet(title: string): Promise<string[][]> {
  try {
    const data = await sheetsGet(
      `/values/${encodeURIComponent(title)}?majorDimension=ROWS`
    ) as { values?: string[][] };
    return data.values ?? [];
  } catch {
    return [];
  }
}

/**
 * Encontra a linha de uma demanda pelo ID. Retorna índice 1-based ou null.
 */
function findRowById(rows: string[][], id: number): number | null {
  for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
    if (String(rows[i]?.[COL.ID - 1]) === String(id)) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

/**
 * Converte uma demanda para linha da planilha
 */
function demandaToRow(d: DemandaParaSync): string[] {
  return [
    String(d.id),
    d.status ?? "",
    d.reuPreso ? (d.dataEntrada ?? "Preso") : "",
    d.dataEntrada ?? "",
    d.assistidoNome,
    d.numeroAutos,
    d.ato ?? "",
    d.prazo ?? "",
    d.providencias ?? "",
    d.delegadoNome ?? "",
  ];
}

/**
 * Resolve o nome da aba para uma atribuição. Fallback: usa a atribuição como nome.
 */
export function getSheetName(atribuicao: string): string {
  return ATRIBUICAO_TO_SHEET[atribuicao] ?? atribuicao;
}

// ==========================================
// API PÚBLICA
// ==========================================

/**
 * Insere ou atualiza uma demanda na planilha.
 * Cria a aba se não existir.
 */
export async function pushDemanda(demanda: DemandaParaSync): Promise<void> {
  if (!SPREADSHEET_ID) {
    console.warn("[Sheets] GOOGLE_SHEETS_SPREADSHEET_ID não configurado — sync ignorado");
    return;
  }

  const sheetName = getSheetName(demanda.atribuicao);

  try {
    await ensureSheet(sheetName);
    const rows = await readSheet(sheetName);
    const rowIndex = findRowById(rows, demanda.id);
    const rowData = demandaToRow(demanda);
    const range = `${sheetName}!A${rowIndex ?? rows.length + 1}:${colToLetter(HEADERS.length)}${rowIndex ?? rows.length + 1}`;

    await sheetsPut(
      `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values: [rowData] }
    );
  } catch (err) {
    console.error(`[Sheets] Erro ao sincronizar demanda ${demanda.id}:`, err);
  }
}

/**
 * Remove a linha de uma demanda da planilha.
 */
export async function removeDemanda(
  demandaId: number,
  atribuicao: string
): Promise<void> {
  if (!SPREADSHEET_ID) return;

  const sheetName = getSheetName(atribuicao);

  try {
    const sheets = await getSheets();
    const sheet = sheets.find((s) => s.title === sheetName);
    if (!sheet) return;

    const rows = await readSheet(sheetName);
    const rowIndex = findRowById(rows, demandaId);
    if (!rowIndex) return;

    // Limpa a linha (não apaga a linha para manter a estrutura)
    await sheetsPut(
      `/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${colToLetter(HEADERS.length)}${rowIndex}?valueInputOption=RAW`,
      { values: [Array(HEADERS.length).fill("")] }
    );
  } catch (err) {
    console.error(`[Sheets] Erro ao remover demanda ${demandaId}:`, err);
  }
}

/**
 * Move uma demanda de aba (quando atribuição muda).
 */
export async function moveDemanda(
  demanda: DemandaParaSync,
  atribuicaoAntiga: string
): Promise<void> {
  if (!SPREADSHEET_ID) return;
  await removeDemanda(demanda.id, atribuicaoAntiga);
  await pushDemanda(demanda);
}

/**
 * Sincroniza todas as demandas de uma lista para a planilha.
 * Usado para sync inicial ou re-sync completo.
 */
export async function syncAll(demandas: DemandaParaSync[]): Promise<SyncStats> {
  const stats: SyncStats = { inserted: 0, updated: 0, removed: 0, errors: [] };

  if (!SPREADSHEET_ID) {
    stats.errors.push("GOOGLE_SHEETS_SPREADSHEET_ID não configurado");
    return stats;
  }

  // Agrupa por aba
  const bySheet = new Map<string, DemandaParaSync[]>();
  for (const d of demandas) {
    const name = getSheetName(d.atribuicao);
    if (!bySheet.has(name)) bySheet.set(name, []);
    bySheet.get(name)!.push(d);
  }

  for (const [sheetName, items] of bySheet) {
    try {
      await ensureSheet(sheetName);
      const rows = await readSheet(sheetName);

      // IDs já presentes na aba
      const existingIds = new Set<string>();
      for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
        const id = rows[i]?.[COL.ID - 1];
        if (id) existingIds.add(id);
      }

      // Prepara todas as linhas de dados (ordenadas por prazo)
      const sorted = [...items].sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });

      const newValues = [HEADERS, ...sorted.map(demandaToRow)];

      await sheetsPut(
        `/values/${encodeURIComponent(sheetName)}!A1:${colToLetter(HEADERS.length)}${newValues.length}?valueInputOption=USER_ENTERED`,
        { values: newValues }
      );

      for (const d of items) {
        if (existingIds.has(String(d.id))) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`${sheetName}: ${msg}`);
    }
  }

  return stats;
}

/**
 * Verifica se a integração está configurada e acessível.
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string; sheets?: string[] }> {
  if (!SPREADSHEET_ID) {
    return { ok: false, error: "GOOGLE_SHEETS_SPREADSHEET_ID não configurado" };
  }

  try {
    const sheets = await getSheets();
    return { ok: true, sheets: sheets.map((s) => s.title) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
