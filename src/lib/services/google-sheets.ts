/**
 * Serviço de Sincronização Bidirecional com Google Sheets
 *
 * Sincroniza demandas ↔ Google Sheets.
 * App tem precedência em conflitos.
 *
 * Autenticação padrão: Service Account (GOOGLE_SERVICE_ACCOUNT_KEY)
 * Planilha padrão: GOOGLE_SHEETS_SPREADSHEET_ID
 *
 * Multi-tenant: use `withSheetsAuth({ getToken, spreadsheetId }, async () => { ... })`
 * para rodar operações contra a planilha de outro usuário (OAuth per-user).
 * O contexto é isolado por execução via AsyncLocalStorage — seguro para
 * chamadas concorrentes no mesmo processo.
 */

import { GoogleAuth } from "google-auth-library";
import { AsyncLocalStorage } from "node:async_hooks";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

/** Lazy — garante que o env já foi carregado pelo Next.js antes de ler */
function getSpreadsheetId(): string {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "").trim();
}
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ==========================================
// AUTH CONTEXT — multi-tenant via AsyncLocalStorage
// ==========================================

export interface SheetsAuthContext {
  /** Retorna um access token válido (OAuth user ou service account). */
  getToken: () => Promise<string | null>;
  /** ID da planilha alvo. */
  spreadsheetId: string;
}

const authStorage = new AsyncLocalStorage<SheetsAuthContext>();

/**
 * Executa `fn` com um contexto de auth alternativo. Qualquer chamada interna
 * a sheetsGet/Post/Put, ensureSheet, formatSheet, pushDemanda, reorderSheet
 * etc. dentro do callback usa esse contexto em vez do service account padrão.
 *
 * Thread-safe: AsyncLocalStorage isola por execução, seguro para N usuários
 * simultâneos no mesmo processo.
 */
export async function withSheetsAuth<T>(
  ctx: SheetsAuthContext,
  fn: () => Promise<T>,
): Promise<T> {
  return authStorage.run(ctx, fn);
}

/** Resolve o contexto de auth — user override ou fallback service account. */
function getAuthContext(): SheetsAuthContext {
  const userCtx = authStorage.getStore();
  if (userCtx) return userCtx;
  return {
    getToken: getServiceAccountToken,
    spreadsheetId: getSpreadsheetId(),
  };
}

// Layout VVD:
// Row 1: Título (ex: "Demandas - Tribunal do Júri")
// Row 2: Separador cinza
// Row 3: Cabeçalho (headers)
// Row 4+: Dados
const TITLE_ROW = 1;
const HEADER_ROW = 3;
// Primeira linha de dados
const DATA_START_ROW = 4;

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

// ==========================================
// PLENÁRIOS - Layout específico
// ==========================================

const PLENARIOS_SHEET = "Plenários";
const PLENARIOS_HEADERS = ["__id__", "Data", "Réu", "Processo", "Defensor", "Status", "Obs"];

export interface PlenarioParaSync {
  id: number;
  dataSessao: string; // ISO date or formatted
  assistidoNome: string;
  numeroAutos: string;
  defensorNome: string | null;
  status: string;
  observacoes: string | null;
}

function plenarioToRow(p: PlenarioParaSync): string[] {
  // Format date as DD/MM/YYYY
  let dataFormatada = "";
  if (p.dataSessao) {
    try {
      const d = new Date(p.dataSessao);
      if (!isNaN(d.getTime())) {
        dataFormatada = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      }
    } catch { /* ignore */ }
  }

  return [
    String(p.id),
    dataFormatada,
    p.assistidoNome || "",
    p.numeroAutos || "",
    p.defensorNome || "",
    p.status || "",
    p.observacoes || "",
  ];
}

// Título decorativo por aba (row 1)
const SHEET_TITLE_TEXT: Record<string, string> = {
  "Júri": "    Demandas - Tribunal do Júri",
  "Violência Doméstica": "    Intimações - Paz em casa",
  "EP": "    Demandas - Execução Penal",
  "Substituição criminal": "    Demandas - Substituição Criminal",
  "Curadoria": "    Demandas - Curadoria",
  "Plenários": "    Demandas - Plenários",
  "Protocolo integrado": "    Demandas - Protocolo Integrado",
  "Liberdade": "    Demandas - Liberdade",
  "Candeias": "    Demandas - Candeias",
};

// Mapeamento atribuição DB → nome da aba na planilha
export const ATRIBUICAO_TO_SHEET: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Substituição criminal",
  SUBSTITUICAO_CIVEL: "Substituição criminal",
  GRUPO_JURI: "Plenários",
};

/**
 * Abas manuais: têm layout diferente (Status na col A, sem __id__).
 * formatSheet() NÃO deve ocultar col A nem aplicar formato automático.
 */
const MANUAL_SHEETS = new Set<string>(); // Nenhuma aba manual — todas sincronizadas

// ==========================================
// TIPOS
// ==========================================

export interface DemandaParaSync {
  id: number;
  status: string | null;
  substatus: string | null;
  reuPreso: boolean | null;
  dataEntrada: string | null; // date string YYYY-MM-DD
  dataExpedicao?: string | null; // date string YYYY-MM-DD — preferido na coluna "Data"
  assistidoNome: string;
  numeroAutos: string;
  ato: string | null;
  prazo: string | null; // date string YYYY-MM-DD
  providencias: string | null;
  delegadoNome: string | null;
  atribuicao: string; // valor do enum
  defensorId?: number | null; // usado para filtrar por owner quando ENV está configurada
}

/**
 * Filtro de ownership na planilha global. Quando
 * `OMBUDS_SHEETS_OWNER_DEFENSOR_ID` está setado no ambiente, apenas demandas
 * desse defensor são empurradas/reordenadas na planilha compartilhada.
 *
 * Contexto: enquanto o multi-tenant per-user (withSheetsAuth) não está
 * configurado para todos, múltiplos defensores da mesma comarca escrevem na
 * mesma planilha global e misturam lançamentos. Esse filtro evita o
 * "vazamento" de demandas de outros defensores na planilha do owner.
 */
function getOwnerDefensorId(): number | null {
  const raw = (process.env.OMBUDS_SHEETS_OWNER_DEFENSOR_ID ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function demandaPertenceAoOwner(defensorId: number | null | undefined): boolean {
  const owner = getOwnerDefensorId();
  if (owner === null) return true;
  return defensorId === owner;
}

// Labels válidos da planilha (dropdown de status)
export const VALID_SHEET_LABELS = new Set([
  "1 - Urgente",
  "2 - Relatório", "2 - Analisar", "2 - Atender", "2 - Buscar",
  "2 - Diligenciar", "2 - Investigar", "2 - Elaborar", "2 - Elaborando",
  "2 - Revisar", "2 - Revisando",
  "3 - Protocolar",
  "4 - Amanda", "4 - Estágio - Taissa", "4 - Emilly", "4 - Monitorar",
  "5 - Triagem", "5 - Suspensa",
  "6 - Documentos", "6 - Testemunhas",
  "7 - Protocolado", "7 - Peticionamento intermediário", "7 - Sigad",
  "7 - Ciência", "7 - Constituiu advogado", "7 - Sem atuação", "7 - Resolvido",
  "7 - Excluído",
]);

// Mapeamento DB status → label padrão da planilha
const STATUS_TO_LABEL: Record<string, string> = {
  URGENTE: "1 - Urgente",
  "2_ATENDER": "2 - Atender",
  "4_MONITORAR": "4 - Monitorar",
  "5_TRIAGEM": "5 - Triagem",
  "7_PROTOCOLADO": "7 - Protocolado",
  "7_CIENCIA": "7 - Ciência",
  "7_SEM_ATUACAO": "7 - Sem atuação",
  CONCLUIDO: "7 - Resolvido",
  ARQUIVADO: "7 - Resolvido",
};

/**
 * Mapeamento para substatus "sujos" salvos sem prefixo numérico.
 * Ex: "elaborar" → "2 - Elaborar", "protocolado" → "7 - Protocolado"
 */
const SUBSTATUS_NORMALIZE: Record<string, string> = {
  urgente: "1 - Urgente",
  relatório: "2 - Relatório", relatorio: "2 - Relatório",
  analisar: "2 - Analisar",
  atender: "2 - Atender",
  buscar: "2 - Buscar",
  diligenciar: "2 - Diligenciar",
  investigar: "2 - Investigar",
  elaborar: "2 - Elaborar",
  elaborando: "2 - Elaborando",
  revisar: "2 - Revisar",
  revisando: "2 - Revisando",
  protocolar: "3 - Protocolar",
  amanda: "4 - Amanda",
  emilly: "4 - Emilly",
  monitorar: "4 - Monitorar",
  triagem: "5 - Triagem",
  fila: "5 - Triagem",
  suspensa: "5 - Suspensa",
  suspenso: "5 - Suspensa",
  documentos: "6 - Documentos",
  testemunhas: "6 - Testemunhas",
  protocolado: "7 - Protocolado",
  sigad: "7 - Sigad",
  ciência: "7 - Ciência", ciencia: "7 - Ciência",
  resolvido: "7 - Resolvido",
};

/** Converte status+substatus do banco para o label da planilha */
export function statusParaLabel(status: string | null, substatus: string | null): string {
  if (substatus) {
    // Já no formato correto?
    if (VALID_SHEET_LABELS.has(substatus)) return substatus;
    // Tentar normalizar substatus "sujo" (ex: "elaborar" → "2 - Elaborar")
    const normalized = SUBSTATUS_NORMALIZE[substatus.toLowerCase().trim()];
    if (normalized) return normalized;
  }
  return STATUS_TO_LABEL[status ?? ""] ?? status ?? "";
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

async function getServiceAccountToken(): Promise<string | null> {
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
  const { getToken, spreadsheetId } = getAuthContext();
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");
  if (!spreadsheetId) throw new Error("Sem spreadsheetId no contexto");

  const res = await fetchWithRetry(`${SHEETS_API_BASE}/${spreadsheetId}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets GET ${path} → ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Executa fetch com retry em 429 (rate limit) e 5xx (transient).
 * Backoff exponencial + jitter: 500ms, 1s, 2s, 4s.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const MAX_RETRIES = 4;
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    // Retry apenas em 429 e 5xx
    if (res.status !== 429 && res.status < 500) return res;
    lastRes = res;
    if (attempt < MAX_RETRIES) {
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return lastRes!;
}

async function sheetsPost(path: string, body: unknown): Promise<unknown> {
  const { getToken, spreadsheetId } = getAuthContext();
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");
  if (!spreadsheetId) throw new Error("Sem spreadsheetId no contexto");

  const res = await fetchWithRetry(`${SHEETS_API_BASE}/${spreadsheetId}${path}`, {
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
  const { getToken, spreadsheetId } = getAuthContext();
  const token = await getToken();
  if (!token) throw new Error("Sem token de autenticação");
  if (!spreadsheetId) throw new Error("Sem spreadsheetId no contexto");

  const res = await fetchWithRetry(`${SHEETS_API_BASE}/${spreadsheetId}${path}`, {
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
export async function getSheets(): Promise<Array<{ sheetId: number; title: string }>> {
  const data = await sheetsGet("?fields=sheets.properties") as {
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };
  return data.sheets.map((s) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
  }));
}

// Cache de abas por spreadsheetId — evita hitar getSheets() a cada pushDemanda.
// TTL curto (60s) para ainda pegar abas criadas externamente em resync longo.
// Chave por spreadsheetId para isolar corretamente entre usuários em contexto multi-tenant.
const sheetsCacheByFile = new Map<string, { data: Array<{ sheetId: number; title: string }>; expiresAt: number }>();
async function getSheetsCached(): Promise<Array<{ sheetId: number; title: string }>> {
  const { spreadsheetId } = getAuthContext();
  const cached = sheetsCacheByFile.get(spreadsheetId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await getSheets();
  sheetsCacheByFile.set(spreadsheetId, { data, expiresAt: Date.now() + 60_000 });
  return data;
}
function invalidateSheetsCache() {
  const { spreadsheetId } = getAuthContext();
  sheetsCacheByFile.delete(spreadsheetId);
}

/**
 * Cria uma aba se não existir. Retorna o sheetId.
 */
export async function ensureSheet(title: string): Promise<number> {
  const sheets = await getSheetsCached();
  const existing = sheets.find((s) => s.title === title);
  if (existing) return existing.sheetId;
  // Vai criar — invalida cache antes da próxima chamada
  invalidateSheetsCache();

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

  // Escreve layout VVD: título (row 1), separador (row 2), headers (row 3)
  const titleText = SHEET_TITLE_TEXT[title] ?? `    Demandas - ${title}`;
  const titleRow = Array(HEADERS.length).fill("");
  titleRow[1] = titleText; // Col B (visível)
  await sheetsPut(
    `/values/${encodeURIComponent(title)}!A1:${colToLetter(HEADERS.length)}${HEADER_ROW}?valueInputOption=RAW`,
    { values: [titleRow, Array(HEADERS.length).fill(""), HEADERS] }
  );

  await formatSheet(sheetId, title);
  return sheetId;
}

// ==========================================
// CORES PARA FORMATAÇÃO CONDICIONAL
// ==========================================

type RGBColor = { red: number; green: number; blue: number };

/**
 * Cores dos status — paleta alinhada com os grupos do kanban OMBUDS:
 *   - Triagem: cinza pastel
 *   - Preparação: amber pastel (gradação analisar → revisar)
 *   - Diligências: azul pastel (gradação atender → investigar)
 *   - Saída: laranja pastel
 *   - Acompanhar: lilás pastel
 *   - Concluída: verde-menta pastel
 *   - Arquivado: cinza escuro
 *
 * Mantém gradação sutil dentro de cada grupo pra diferenciar substatus.
 */
const STATUS_COLORS: Record<string, RGBColor> = {
  // ── 1 · Urgente — rosa-claro (pastel, não agressivo) ──
  "1 - Urgente":            { red: 0.976, green: 0.800, blue: 0.800 },

  // ── 2 · PREPARAÇÃO — amber pastel (creme → pêssego suave) ──
  "2 - Analisar":           { red: 1.0,   green: 0.965, blue: 0.850 },
  "2 - Relatório":          { red: 1.0,   green: 0.945, blue: 0.810 },
  "2 - Elaborar":           { red: 1.0,   green: 0.920, blue: 0.760 },
  "2 - Elaborando":         { red: 1.0,   green: 0.905, blue: 0.730 },
  "2 - Revisar":            { red: 1.0,   green: 0.885, blue: 0.690 },
  "2 - Revisando":          { red: 1.0,   green: 0.870, blue: 0.660 },

  // ── 2 · DILIGÊNCIAS — azul-gelo pastel (gradação atender → investigar) ──
  "2 - Atender":            { red: 0.893, green: 0.945, blue: 0.972 },
  "2 - Buscar":             { red: 0.865, green: 0.930, blue: 0.965 },
  "2 - Diligenciar":        { red: 0.838, green: 0.918, blue: 0.958 },
  "2 - Investigar":         { red: 0.810, green: 0.905, blue: 0.950 },

  // ── 3 · SAÍDA — laranja pastel ──
  "3 - Protocolar":         { red: 0.996, green: 0.840, blue: 0.620 },

  // ── 4 · ACOMPANHAR — lilás pastel (monitorar + delegações) ──
  "4 - Monitorar":          { red: 0.940, green: 0.920, blue: 0.988 },
  "4 - Estágio - Taissa":   { red: 0.925, green: 0.900, blue: 0.982 },
  "4 - Amanda":             { red: 0.910, green: 0.878, blue: 0.975 },
  "4 - Emilly":             { red: 0.893, green: 0.855, blue: 0.968 },

  // ── 5 · Triagem / Suspensa — cinza muito claro ──
  "5 - Triagem":             { red: 0.935, green: 0.935, blue: 0.935 },
  "5 - Suspensa":            { red: 0.880, green: 0.880, blue: 0.880 },

  // ── 6 · DILIGÊNCIAS (continuação) — azul-gelo pastel ──
  "6 - Documentos":         { red: 0.878, green: 0.937, blue: 0.965 },
  "6 - Testemunhas":        { red: 0.898, green: 0.949, blue: 0.975 },

  // ── 7 · Concluído — menta-pastel com gradação ──
  //    Mais suave (ciência/sem atuação): quase branco-esverdeado
  "7 - Ciência":            { red: 0.840, green: 0.940, blue: 0.840 },
  "7 - Sem atuação":        { red: 0.860, green: 0.945, blue: 0.860 },
  "7 - Constituiu advogado":{ red: 0.850, green: 0.942, blue: 0.850 },
  //    Mais definido (protocolado/resolvido): menta mais presente
  "7 - Protocolado":        { red: 0.790, green: 0.920, blue: 0.790 },
  "7 - Sigad":              { red: 0.760, green: 0.905, blue: 0.760 },
  "7 - Resolvido":          { red: 0.730, green: 0.890, blue: 0.730 },
  //    Excluído: cinza pastel — distingue visualmente de "resolvido positivo"
  "7 - Excluído":           { red: 0.870, green: 0.870, blue: 0.870 },
};

/** Cores dos atos por categoria — paleta pastel muito suave */
const _GREEN_DARK:  RGBColor = { red: 0.760, green: 0.905, blue: 0.760 }; // peças urgentes
const _GREEN_MED:   RGBColor = { red: 0.820, green: 0.930, blue: 0.820 }; // recursos
const _GREEN_LIGHT: RGBColor = { red: 0.875, green: 0.950, blue: 0.875 }; // intermediários
const _YELLOW:      RGBColor = { red: 1.0,   green: 0.945, blue: 0.810 }; // liberdade/prisão
const _ORANGE:      RGBColor = { red: 1.0,   green: 0.910, blue: 0.740 }; // HC/MS
const _BLUE_LIGHT:  RGBColor = { red: 0.878, green: 0.937, blue: 0.965 }; // ciências
const _GRAY:        RGBColor = { red: 0.935, green: 0.935, blue: 0.935 }; // outros

const ATO_COLORS: Record<string, RGBColor> = {
  // Peças urgentes
  "Resposta à Acusação": _GREEN_DARK, "Alegações finais": _GREEN_DARK,
  "Memoriais": _GREEN_DARK, "Contestação": _GREEN_DARK,
  // Recursos
  "Apelação": _GREEN_MED, "Razões de apelação": _GREEN_MED,
  "Contrarrazões de apelação": _GREEN_MED,
  "RESE": _GREEN_MED, "Razões de RESE": _GREEN_MED,
  "Contrarrazões de RESE": _GREEN_MED, "Contrarrazões de ED": _GREEN_MED,
  "Embargos de Declaração": _GREEN_MED, "Agravo em Execução": _GREEN_MED,
  // Liberdade/prisão
  "Habeas Corpus": _ORANGE, "Mandado de Segurança": _ORANGE,
  "Revogação da prisão preventiva": _YELLOW,
  "Relaxamento da prisão preventiva": _YELLOW,
  "Relaxamento e revogação de prisão": _YELLOW,
  "Revogação de medida protetiva": _YELLOW, "Modulação de MPU": _YELLOW,
  "Revogação do monitoramento": _YELLOW, "Revogação de monitoramento": _YELLOW,
  // Intermediários
  "Diligências do 422": _GREEN_LIGHT, "Incidente de insanidade": _GREEN_LIGHT,
  "Petição intermediária": _GREEN_LIGHT, "Prosseguimento do feito": _GREEN_LIGHT,
  "Atualização de endereço": _GREEN_LIGHT, "Juntada de documentos": _GREEN_LIGHT,
  "Ofício": _GREEN_LIGHT, "Quesitos": _GREEN_LIGHT,
  "Requerimento de progressão": _GREEN_LIGHT,
  "Requerimento de produção probatória": _GREEN_LIGHT,
  "Requerimento audiência de justificação": _GREEN_LIGHT,
  // Ciências
  "Ciência": _BLUE_LIGHT, "Ciência habilitação DPE": _BLUE_LIGHT,
  "Ciência habilitação dpe": _BLUE_LIGHT, "Ciência de decisão": _BLUE_LIGHT,
  "Ciência absolvição": _BLUE_LIGHT, "Ciência condenação": _BLUE_LIGHT,
  "Ciência da pronúncia": _BLUE_LIGHT, "Ciência da impronúncia": _BLUE_LIGHT,
  "Ciência da absolvição": _BLUE_LIGHT, "Ciência desclassificação": _BLUE_LIGHT,
  "Ciência acórdão": _BLUE_LIGHT, "Ciência de sentença favorável": _BLUE_LIGHT,
  "Ciência condenação parcial": _BLUE_LIGHT,
  "Ciência de extinção da punibilidade": _BLUE_LIGHT,
  "Ciência de extinção processual": _BLUE_LIGHT,
  "Ciência de sentença": _BLUE_LIGHT, "Ciência de prescrição": _BLUE_LIGHT,
  // Outros
  "Outro": _GRAY,
};

/**
 * Aplica formatação padrão VVD: oculta coluna A, dropdowns Status/Ato, cores condicionais.
 * Idempotente — seguro chamar em abas já formatadas.
 * @param dataRowCount Número de linhas de dados (para range dos dropdowns/filtros). Mínimo 2000.
 */
export async function formatSheet(sheetId: number, title: string, dataRowCount = 2000): Promise<void> {
  // Abas manuais (ex: VVD) têm layout próprio — não aplicar formatação automática
  if (MANUAL_SHEETS.has(title)) return;

  // Garantir cobertura mínima de 2000 linhas para dropdowns, filtros e cores
  const endRow = DATA_START_ROW - 1 + Math.max(dataRowCount, 2000); // index 0-based: row 3 + N dados

  // Primeiro: remover formatação condicional existente (evitar duplicatas)
  const clearRequests: unknown[] = [];
  try {
    const meta = await sheetsGet(`?fields=sheets(properties.sheetId,conditionalFormats)`) as {
      sheets: Array<{ properties: { sheetId: number }; conditionalFormats?: unknown[] }>;
    };
    const sheet = meta.sheets.find(s => s.properties.sheetId === sheetId);
    if (sheet?.conditionalFormats?.length) {
      // Deletar de trás para frente para não mudar os índices
      for (let i = sheet.conditionalFormats.length - 1; i >= 0; i--) {
        clearRequests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
      }
    }
  } catch {
    // Se falhar a leitura, segue sem limpar
  }

  const requests: unknown[] = [
    ...clearRequests,
    // Oculta coluna A (índice 0) — __id__
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
    // Congela as 3 primeiras linhas (título + separador + header)
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: DATA_START_ROW - 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Limpar filtro existente antes de criar novo (evita erro de duplicata)
    {
      clearBasicFilter: { sheetId },
    },
    // BasicFilter cobrindo header + todas as linhas de dados (até 2000)
    // Permite ordenar/filtrar pelo menu do header
    {
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: DATA_START_ROW - 2, // header row (0-indexed)
            endRowIndex: DATA_START_ROW - 1 + 2000, // cobrir até 2000 linhas de dados
            startColumnIndex: 0,
            endColumnIndex: HEADERS.length,
          },
        },
      },
    },
    // Dropdown: Status (col B = index 1)
    {
      setDataValidation: {
        range: { sheetId, startRowIndex: DATA_START_ROW - 1, endRowIndex: endRow, startColumnIndex: COL.STATUS - 1, endColumnIndex: COL.STATUS },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: [...VALID_SHEET_LABELS].map(v => ({ userEnteredValue: v })),
          },
          showCustomUi: true,
          strict: true,
        },
      },
    },
    // Dropdown: Ato (col G = index 6)
    {
      setDataValidation: {
        range: { sheetId, startRowIndex: DATA_START_ROW - 1, endRowIndex: endRow, startColumnIndex: COL.ATO - 1, endColumnIndex: COL.ATO },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: [
              "Resposta à Acusação", "Alegações finais", "Memoriais", "Apelação",
              "Razões de apelação", "Contrarrazões de apelação",
              "RESE", "Razões de RESE", "Contrarrazões de RESE",
              "Contrarrazões de ED", "Embargos de Declaração",
              "Diligências do 422", "Incidente de insanidade",
              "Revogação da prisão preventiva", "Relaxamento da prisão preventiva",
              "Relaxamento e revogação de prisão", "Revogação do monitoramento",
              "Revogação de medida protetiva", "Modulação de MPU",
              "Habeas Corpus", "Mandado de Segurança",
              "Requerimento de progressão", "Agravo em Execução",
              "Ofício", "Petição intermediária", "Prosseguimento do feito",
              "Atualização de endereço", "Juntada de documentos",
              "Ciência habilitação DPE", "Ciência de decisão", "Ciência",
              "Outro",
            ].map(v => ({ userEnteredValue: v })),
          },
          showCustomUi: true,
          strict: true,
        },
      },
    },
  ];

  // Cores condicionais: Status (col B)
  for (const [label, color] of Object.entries(STATUS_COLORS)) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: DATA_START_ROW - 1, endRowIndex: endRow, startColumnIndex: COL.STATUS - 1, endColumnIndex: COL.STATUS }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: label }] },
            format: { backgroundColor: color },
          },
        },
        index: 0,
      },
    });
  }

  // Nota: Ato (col G) NÃO usa formatação condicional de fundo.
  // O dropdown UI-nativo (criado manualmente) já fornece chips visuais.
  // Cores de chip só podem ser configuradas pela UI do Google Sheets.

  await sheetsPost(":batchUpdate", { requests });
}

/**
 * Lê todos os dados de uma aba. Retorna array de linhas (cada linha = array de strings).
 */
export async function readSheet(title: string): Promise<string[][]> {
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
export function findRowById(rows: string[][], id: number, numeroAutos?: string): number | null {
  // 1. Busca exata por __id__ (coluna A)
  for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
    if (String(rows[i]?.[COL.ID - 1]) === String(id)) {
      const row = i + 1; // 1-indexed
      return row >= DATA_START_ROW ? row : null;
    }
  }
  // 2. Fallback: busca por número de autos (coluna F) — para planilhas criadas manualmente
  if (numeroAutos) {
    const autosNorm = numeroAutos.replace(/\s/g, "");
    for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
      const cellAutos = (rows[i]?.[COL.AUTOS - 1] ?? "").replace(/\s/g, "");
      if (cellAutos && cellAutos === autosNorm) {
        const row = i + 1;
        if (row >= DATA_START_ROW) {
          // Preencher o __id__ para futuras buscas
          rows[i][COL.ID - 1] = String(id);
          return row;
        }
      }
    }
  }
  return null;
}

/**
 * Converte uma demanda para linha da planilha
 */
function demandaToRow(d: DemandaParaSync): string[] {
  // Coluna "Data" representa a data de EXPEDIÇÃO da intimação (PJe). Usa
  // dataExpedicao; fallback para dataEntrada por compatibilidade com linhas
  // antigas cujo campo ainda não foi migrado.
  const dataCol = d.dataExpedicao ?? d.dataEntrada ?? "";
  return [
    String(d.id),
    statusParaLabel(d.status, d.substatus),
    d.reuPreso ? (dataCol || "Preso") : "",
    dataCol,
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
 * Pula abas manuais (VVD) — essas são mantidas pelo usuário.
 * Verifica conflitos antes de sobrescrever: se o status na planilha difere do banco,
 * registra o conflito via sync-engine e NÃO sobrescreve.
 */
export async function pushDemanda(demanda: DemandaParaSync): Promise<{ pushed: boolean; conflict: boolean }> {
  if (!getAuthContext().spreadsheetId) {
    console.warn("[Sheets] GOOGLE_SHEETS_SPREADSHEET_ID não configurado — sync ignorado");
    return { pushed: false, conflict: false };
  }

  if (!demandaPertenceAoOwner(demanda.defensorId)) {
    // Filtro de ownership: outra pessoa atua no mesmo deploy/planilha e essa
    // demanda não é do owner configurado. Não empurra pra evitar vazamento.
    return { pushed: false, conflict: false };
  }

  const sheetName = getSheetName(demanda.atribuicao);
  if (MANUAL_SHEETS.has(sheetName)) return { pushed: false, conflict: false };

  try {
    await ensureSheet(sheetName);
    const rows = await readSheet(sheetName);
    const rowIndex = findRowById(rows, demanda.id, demanda.numeroAutos);

    // Regra: OMBUDS é a fonte da verdade. pushDemanda SEMPRE sobrescreve
    // o que estiver na planilha. A detecção de conflito aqui estava bloqueando
    // updates legítimos do usuário quando a planilha tinha valor antigo
    // (conflitos ficavam órfãos em sync_log, resolvido_em NULL).
    // A detecção bidirecional (quando ambos mudaram) permanece no poller
    // Inngest (src/lib/inngest/functions.ts), que é o lugar correto para ela.
    const rowData = demandaToRow(demanda);
    const targetRow = rowIndex ?? Math.max(rows.length + 1, DATA_START_ROW);
    const range = `${sheetName}!A${targetRow}:${colToLetter(HEADERS.length)}${targetRow}`;

    await sheetsPut(
      `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values: [rowData] }
    );

    return { pushed: true, conflict: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Sheets] FAIL push demanda id=${demanda.id} sheet="${sheetName}" autos="${demanda.numeroAutos}" → ${msg}`);
    return { pushed: false, conflict: false };
  }
}

/**
 * Reescreve uma aba inteira com as demandas já ordenadas pelo caller.
 * Usado pelo /api/sheets/reorder para reordenar bloco-a-bloco por status.
 *
 * Estratégia:
 * 1. Limpa todas as linhas de dados (DATA_START_ROW em diante)
 * 2. Escreve todas as demandas em um único PUT (batch)
 *
 * Não toca no título, separador e header (rows 1-3).
 */
export async function reorderSheet(
  sheetName: string,
  sortedDemandas: DemandaParaSync[],
): Promise<{ written: number }> {
  if (!getAuthContext().spreadsheetId) {
    console.warn("[Sheets] reorderSheet: GOOGLE_SHEETS_SPREADSHEET_ID não configurado");
    return { written: 0 };
  }
  if (MANUAL_SHEETS.has(sheetName)) return { written: 0 };

  await ensureSheet(sheetName);

  // Filtro de ownership: ao reordenar, descarta demandas de outros defensores
  // (mantém apenas as do owner). Sem isso a planilha global é reescrita com
  // dados de todos misturados.
  const demandasFiltradas = sortedDemandas.filter(d => demandaPertenceAoOwner(d.defensorId));

  const lastCol = colToLetter(HEADERS.length);
  // 1. Clear data rows (keep title + separator + headers intactos)
  const clearRange = `${sheetName}!A${DATA_START_ROW}:${lastCol}`;
  await sheetsPost(`/values/${encodeURIComponent(clearRange)}:clear`, {});

  if (demandasFiltradas.length === 0) return { written: 0 };

  // 2. Write all rows em um único PUT
  const values = demandasFiltradas.map(demandaToRow);
  const endRow = DATA_START_ROW + values.length - 1;
  const writeRange = `${sheetName}!A${DATA_START_ROW}:${lastCol}${endRow}`;
  await sheetsPut(
    `/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    { values },
  );

  return { written: values.length };
}

/**
 * Remove a linha de uma demanda da planilha.
 */
export async function removeDemanda(
  demandaId: number,
  atribuicao: string
): Promise<void> {
  if (!getAuthContext().spreadsheetId) return;

  const sheetName = getSheetName(atribuicao);
  if (MANUAL_SHEETS.has(sheetName)) return; // VVD é manual

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
 * Insere ou atualiza uma sessão de plenário na aba "Plenários".
 */
export async function pushPlenario(plenario: PlenarioParaSync): Promise<void> {
  if (!getAuthContext().spreadsheetId) {
    console.warn("[Sheets] GOOGLE_SHEETS_SPREADSHEET_ID não configurado — sync plenário ignorado");
    return;
  }

  try {
    await ensureSheet(PLENARIOS_SHEET);
    const rows = await readSheet(PLENARIOS_SHEET);

    // Check if headers match — if not, rewrite header row
    const headerRow = rows[HEADER_ROW - 1];
    if (!headerRow || headerRow[0] !== PLENARIOS_HEADERS[0]) {
      // Write title
      await sheetsPut(
        `/values/${encodeURIComponent(PLENARIOS_SHEET)}!A${TITLE_ROW}:A${TITLE_ROW}?valueInputOption=USER_ENTERED`,
        { values: [["    Distribuição de Plenários"]] }
      );
      // Write headers
      await sheetsPut(
        `/values/${encodeURIComponent(PLENARIOS_SHEET)}!A${HEADER_ROW}:${colToLetter(PLENARIOS_HEADERS.length)}${HEADER_ROW}?valueInputOption=USER_ENTERED`,
        { values: [PLENARIOS_HEADERS] }
      );
    }

    const rowIndex = findRowById(rows, plenario.id);
    const rowData = plenarioToRow(plenario);
    const targetRow = rowIndex ?? Math.max(rows.length + 1, DATA_START_ROW);
    const range = `${PLENARIOS_SHEET}!A${targetRow}:${colToLetter(PLENARIOS_HEADERS.length)}${targetRow}`;

    await sheetsPut(
      `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values: [rowData] }
    );
  } catch (err) {
    console.error(`[Sheets] Erro ao sincronizar plenário ${plenario.id}:`, err);
  }
}

/**
 * Sincroniza todas as sessões de plenário para a aba "Plenários".
 * Reescreve toda a aba com dados atuais.
 */
export async function syncAllPlenarios(plenarios: PlenarioParaSync[]): Promise<{ synced: number; errors: string[] }> {
  if (!getAuthContext().spreadsheetId) {
    return { synced: 0, errors: ["GOOGLE_SHEETS_SPREADSHEET_ID não configurado"] };
  }

  const errors: string[] = [];

  try {
    await ensureSheet(PLENARIOS_SHEET);

    // Clear existing data (keep title and header)
    const rows = await readSheet(PLENARIOS_SHEET);
    if (rows.length > HEADER_ROW) {
      const sheets = await getSheets();
      const sheet = sheets.find(s => s.title === PLENARIOS_SHEET);
      if (sheet) {
        // Clear data rows
        const clearRange = `${PLENARIOS_SHEET}!A${DATA_START_ROW}:${colToLetter(PLENARIOS_HEADERS.length)}${Math.max(rows.length, DATA_START_ROW)}`;
        await sheetsPut(
          `/values/${encodeURIComponent(clearRange)}?valueInputOption=USER_ENTERED`,
          { values: Array(Math.max(rows.length - HEADER_ROW, 0)).fill(PLENARIOS_HEADERS.map(() => "")) }
        );
      }
    }

    // Write title
    await sheetsPut(
      `/values/${encodeURIComponent(PLENARIOS_SHEET)}!A${TITLE_ROW}:A${TITLE_ROW}?valueInputOption=USER_ENTERED`,
      { values: [["    Distribuição de Plenários"]] }
    );

    // Write headers
    await sheetsPut(
      `/values/${encodeURIComponent(PLENARIOS_SHEET)}!A${HEADER_ROW}:${colToLetter(PLENARIOS_HEADERS.length)}${HEADER_ROW}?valueInputOption=USER_ENTERED`,
      { values: [PLENARIOS_HEADERS] }
    );

    // Write all data rows at once
    if (plenarios.length > 0) {
      const allRows = plenarios.map(plenarioToRow);
      const range = `${PLENARIOS_SHEET}!A${DATA_START_ROW}:${colToLetter(PLENARIOS_HEADERS.length)}${DATA_START_ROW + allRows.length - 1}`;
      await sheetsPut(
        `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { values: allRows }
      );
    }

    return { synced: plenarios.length, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    console.error("[Sheets] Erro no syncAllPlenarios:", err);
    return { synced: 0, errors };
  }
}

/**
 * Move uma demanda de aba (quando atribuição muda).
 */
export async function moveDemanda(
  demanda: DemandaParaSync,
  atribuicaoAntiga: string
): Promise<void> {
  if (!getAuthContext().spreadsheetId) return;
  await removeDemanda(demanda.id, atribuicaoAntiga);
  await pushDemanda(demanda);
}

/**
 * @deprecated Use pushDemanda() individualmente em vez desta função.
 * syncAll é destrutivo — apaga e reescreve a planilha inteira.
 * Mantido apenas para emergência.
 */
export async function syncAll_DEPRECATED(demandas: DemandaParaSync[]): Promise<SyncStats> {
  console.warn("[Sheets] ⚠️ syncAll_DEPRECATED chamado! Use pushDemanda() individualmente.");
  const stats: SyncStats = { inserted: 0, updated: 0, removed: 0, errors: [] };

  if (!getAuthContext().spreadsheetId) {
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
    // Pular abas manuais (VVD) — mantidas pelo usuário
    if (MANUAL_SHEETS.has(sheetName)) continue;

    try {
      const sheetId = await ensureSheet(sheetName);
      const rows = await readSheet(sheetName);

      // IDs já presentes na aba (dados começam na DATA_START_ROW, 1-indexed → index 3)
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

      // Layout VVD: título (row 1) + separador (row 2) + headers (row 3) + dados (row 4+)
      const titleText = SHEET_TITLE_TEXT[sheetName] ?? `    Demandas - ${sheetName}`;
      const titleRow = Array(HEADERS.length).fill("");
      titleRow[1] = titleText;
      const newValues = [titleRow, Array(HEADERS.length).fill(""), HEADERS, ...sorted.map(demandaToRow)];

      await sheetsPut(
        `/values/${encodeURIComponent(sheetName)}!A1:${colToLetter(HEADERS.length)}${newValues.length}?valueInputOption=USER_ENTERED`,
        { values: newValues }
      );

      // Aplicar formatação + dropdowns após escrever dados
      await formatSheet(sheetId, sheetName, sorted.length);

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
  if (!getAuthContext().spreadsheetId) {
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
