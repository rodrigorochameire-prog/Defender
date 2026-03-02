/**
 * PDF Extraction Engine — Google Gemini
 *
 * Extrai dados estruturados de PDFs de processos judiciais:
 * - Dados basicos: numero de autos, vara, comarca, tipo penal, partes
 * - Dados do assistido: CPF, RG, endereco, filiacao
 * - Analise profunda: resumo dos fatos, tipificacao, movimentacoes, datas-chave
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// ==========================================
// CONFIGURACAO
// ==========================================

const GEMINI_API_KEY =
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY;

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key não configurada");
  if (!client) client = new GoogleGenerativeAI(GEMINI_API_KEY);
  return client;
}

export function isPdfExtractionConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ==========================================
// TIPOS
// ==========================================

export interface ProcessoExtraidoBasico {
  numeroAutos: string;
  vara: string;
  comarca: string;
  tipoPenal: string;
  dataDistribuicao?: string;
  parteAutora?: string;
  atribuicaoSugerida?: string; // JURI_CAMACARI, VVD_CAMACARI, etc.
}

export interface AssistidoExtraido {
  cpf?: string;
  rg?: string;
  endereco?: string;
  filiacao?: string;
  dataNascimento?: string;
  naturalidade?: string;
  nomeMae?: string;
  nomePai?: string;
}

export interface AnaliseProf {
  resumoFatos: string;
  tipificacao: string[];
  movimentacoes: Array<{ data: string; tipo: string; descricao: string }>;
  datasChave: Array<{ data: string; evento: string }>;
  fundamentosJuridicos?: string;
  testemunhas?: string[];
  pontosAtencao?: string[];
}

export interface ExtractionResult {
  success: boolean;
  processo: ProcessoExtraidoBasico;
  assistido: AssistidoExtraido;
  confianca: number; // 0-1
  analise?: AnaliseProf; // Only with deep=true
  tokensUsed?: number;
  error?: string;
}

export interface MultiDocumentResult {
  success: boolean;
  documentosAnalisados: number;
  dadosConsolidados: AssistidoExtraido;
  timelineUnificada: Array<{ data: string; evento: string; fonte: string }>;
  resumoGeral: string;
  alertas: string[];
  tokensUsed?: number;
  error?: string;
}

// ==========================================
// PROMPTS
// ==========================================

const BASIC_EXTRACTION_PROMPT = `Analise este documento PDF de um processo judicial brasileiro e extraia os seguintes dados estruturados.

Retorne um JSON com esta estrutura EXATA:
{
  "processo": {
    "numeroAutos": "número do processo (ex: 0001234-56.2024.8.05.0133)",
    "vara": "vara/juízo (ex: 2ª Vara do Tribunal do Júri)",
    "comarca": "comarca (ex: Camaçari)",
    "tipoPenal": "tipo penal/assunto (ex: Homicídio Qualificado - Art. 121, §2º, CP)",
    "dataDistribuicao": "data de distribuição se encontrada (formato: YYYY-MM-DD)",
    "parteAutora": "Ministério Público ou parte autora",
    "atribuicaoSugerida": "uma das opções: JURI_CAMACARI, VVD_CAMACARI, EXECUCAO_PENAL, SUBSTITUICAO, SUBSTITUICAO_CIVEL, GRUPO_JURI (baseado na vara e tipo penal)"
  },
  "assistido": {
    "cpf": "CPF do réu/assistido se encontrado",
    "rg": "RG se encontrado",
    "endereco": "endereço completo se encontrado",
    "filiacao": "filiação (mãe e/ou pai) se encontrada",
    "dataNascimento": "data de nascimento se encontrada (YYYY-MM-DD)",
    "naturalidade": "naturalidade se encontrada",
    "nomeMae": "nome da mãe se encontrado separadamente",
    "nomePai": "nome do pai se encontrado separadamente"
  },
  "confianca": 0.85
}

REGRAS PARA atribuicaoSugerida:
- Se a vara contém "Júri" ou "júri" ou o crime é doloso contra a vida → JURI_CAMACARI
- Se a vara contém "Violência Doméstica" ou é Lei Maria da Penha → VVD_CAMACARI
- Se a vara contém "Execução Penal" ou se trata de execução de pena → EXECUCAO_PENAL
- Se é vara criminal genérica (substituição) → SUBSTITUICAO
- Se é vara cível, família ou fazenda → SUBSTITUICAO_CIVEL
- Para processos do "Grupo Especial do Júri" → GRUPO_JURI

Se um campo não for encontrado no documento, use null.
O campo confianca deve ser um número entre 0 e 1 indicando quão confiável é a extração (baseado na qualidade do PDF e clareza dos dados).

Retorne APENAS o JSON, sem explicações adicionais.`;

const DEEP_ANALYSIS_ADDENDUM = `

ADICIONALMENTE, inclua no JSON o campo "analise" com esta estrutura:
{
  "analise": {
    "resumoFatos": "resumo narrativo dos fatos descritos no documento (máximo 500 palavras)",
    "tipificacao": ["artigos de lei aplicáveis, ex: Art. 121, §2º, I e IV, CP"],
    "movimentacoes": [
      { "data": "YYYY-MM-DD", "tipo": "tipo da movimentação", "descricao": "descrição breve" }
    ],
    "datasChave": [
      { "data": "YYYY-MM-DD", "evento": "descrição do evento (ex: Data do fato, Denúncia, Citação)" }
    ],
    "fundamentosJuridicos": "fundamentos jurídicos identificados no documento",
    "testemunhas": ["nomes de testemunhas mencionadas"],
    "pontosAtencao": ["pontos que merecem atenção do defensor (nulidades, contradições, prazos)"]
  }
}`;

const MULTI_DOCUMENT_PROMPT = `Analise os seguintes documentos de um mesmo assistido da Defensoria Pública e consolide as informações.

Retorne um JSON com:
{
  "documentosAnalisados": <number>,
  "dadosConsolidados": {
    "cpf": "CPF mais confiável encontrado",
    "rg": "RG",
    "endereco": "endereço mais recente",
    "filiacao": "filiação completa",
    "dataNascimento": "YYYY-MM-DD",
    "naturalidade": "...",
    "nomeMae": "...",
    "nomePai": "..."
  },
  "timelineUnificada": [
    { "data": "YYYY-MM-DD", "evento": "descrição", "fonte": "nome do documento" }
  ],
  "resumoGeral": "visão 360° do assistido, seus processos e situação atual (máximo 300 palavras)",
  "alertas": ["inconsistências entre documentos, dados conflitantes, prazos urgentes"]
}

Ordene a timeline por data. Destaque alertas de inconsistências entre documentos (ex: CPF diferente em dois documentos, datas conflitantes, etc.).

Retorne APENAS o JSON.`;

// ==========================================
// HELPERS
// ==========================================

/**
 * Tenta extrair JSON de uma resposta da IA, com fallback para blocos ```json.
 */
function parseJsonResponse(text: string): unknown {
  // Attempt 1: regex to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through to next attempt
    }
  }

  // Attempt 2: extract from ```json code block
  if (text.includes("```json")) {
    const blockContent = text.split("```json")[1]?.split("```")[0]?.trim();
    if (blockContent) {
      try {
        return JSON.parse(blockContent);
      } catch {
        // fall through
      }
    }
  }

  // Attempt 3: extract from generic ``` code block
  if (text.includes("```")) {
    const blockContent = text.split("```")[1]?.split("```")[0]?.trim();
    if (blockContent) {
      try {
        return JSON.parse(blockContent);
      } catch {
        // fall through
      }
    }
  }

  throw new Error("Não foi possível extrair JSON válido da resposta da IA");
}

function makeEmptyProcesso(): ProcessoExtraidoBasico {
  return {
    numeroAutos: "",
    vara: "",
    comarca: "",
    tipoPenal: "",
  };
}

function makeEmptyAssistido(): AssistidoExtraido {
  return {};
}

// ==========================================
// ATRIBUICAO HELPER
// ==========================================

/**
 * Sugere a atribuição com base na vara e tipo penal.
 */
export function suggestAtribuicao(vara: string, tipoPenal: string): string {
  const varaLower = vara.toLowerCase();
  const tipoLower = tipoPenal.toLowerCase();

  // Grupo Especial do Júri (check before generic Júri)
  if (varaLower.includes("grupo especial") && varaLower.includes("júri")) {
    return "GRUPO_JURI";
  }

  // Tribunal do Júri or dolosos contra a vida
  if (
    varaLower.includes("júri") ||
    varaLower.includes("juri") ||
    tipoLower.includes("homicídio") ||
    tipoLower.includes("homicidio") ||
    tipoLower.includes("latrocínio") ||
    tipoLower.includes("latrocinio") ||
    tipoLower.includes("infanticídio") ||
    tipoLower.includes("infanticidio") ||
    tipoLower.includes("aborto")
  ) {
    return "JURI_CAMACARI";
  }

  // Violência Doméstica / Maria da Penha
  if (
    varaLower.includes("violência doméstica") ||
    varaLower.includes("violencia domestica") ||
    varaLower.includes("maria da penha") ||
    tipoLower.includes("maria da penha") ||
    tipoLower.includes("violência doméstica") ||
    tipoLower.includes("violencia domestica")
  ) {
    return "VVD_CAMACARI";
  }

  // Execução Penal
  if (
    varaLower.includes("execução penal") ||
    varaLower.includes("execucao penal") ||
    varaLower.includes("execução") ||
    tipoLower.includes("execução de pena") ||
    tipoLower.includes("execucao de pena")
  ) {
    return "EXECUCAO_PENAL";
  }

  // Cível, Família, Fazenda
  if (
    varaLower.includes("cível") ||
    varaLower.includes("civel") ||
    varaLower.includes("família") ||
    varaLower.includes("familia") ||
    varaLower.includes("fazenda") ||
    varaLower.includes("infância") ||
    varaLower.includes("infancia") ||
    varaLower.includes("sucessões") ||
    varaLower.includes("sucessoes")
  ) {
    return "SUBSTITUICAO_CIVEL";
  }

  // Default: criminal genérica
  return "SUBSTITUICAO";
}

// ==========================================
// FUNCAO PRINCIPAL — EXTRAÇÃO DE PDF ÚNICO
// ==========================================

/**
 * Extrai dados estruturados de um PDF de processo judicial usando Gemini.
 *
 * @param pdfBase64 - PDF codificado em base64
 * @param options.deep - Se true, inclui análise profunda (resumo, tipificação, movimentações)
 */
export async function extractFromPdf(
  pdfBase64: string,
  options: { deep?: boolean } = {}
): Promise<ExtractionResult> {
  try {
    if (!isPdfExtractionConfigured()) {
      return {
        success: false,
        processo: makeEmptyProcesso(),
        assistido: makeEmptyAssistido(),
        confianca: 0,
        error: "Gemini API não configurada",
      };
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: SAFETY_SETTINGS,
    });

    const prompt = options.deep
      ? BASIC_EXTRACTION_PROMPT + DEEP_ANALYSIS_ADDENDUM
      : BASIC_EXTRACTION_PROMPT;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: prompt },
    ]);

    const response = result.response;
    const responseText = response.text();

    const parsed = parseJsonResponse(responseText) as Record<string, unknown>;

    // Build processo
    const rawProcesso = (parsed.processo || {}) as Record<string, unknown>;
    const processo: ProcessoExtraidoBasico = {
      numeroAutos: String(rawProcesso.numeroAutos || ""),
      vara: String(rawProcesso.vara || ""),
      comarca: String(rawProcesso.comarca || ""),
      tipoPenal: String(rawProcesso.tipoPenal || ""),
      dataDistribuicao: rawProcesso.dataDistribuicao
        ? String(rawProcesso.dataDistribuicao)
        : undefined,
      parteAutora: rawProcesso.parteAutora
        ? String(rawProcesso.parteAutora)
        : undefined,
      atribuicaoSugerida: rawProcesso.atribuicaoSugerida
        ? String(rawProcesso.atribuicaoSugerida)
        : suggestAtribuicao(
            String(rawProcesso.vara || ""),
            String(rawProcesso.tipoPenal || "")
          ),
    };

    // Build assistido
    const rawAssistido = (parsed.assistido || {}) as Record<string, unknown>;
    const assistido: AssistidoExtraido = {
      cpf: rawAssistido.cpf ? String(rawAssistido.cpf) : undefined,
      rg: rawAssistido.rg ? String(rawAssistido.rg) : undefined,
      endereco: rawAssistido.endereco
        ? String(rawAssistido.endereco)
        : undefined,
      filiacao: rawAssistido.filiacao
        ? String(rawAssistido.filiacao)
        : undefined,
      dataNascimento: rawAssistido.dataNascimento
        ? String(rawAssistido.dataNascimento)
        : undefined,
      naturalidade: rawAssistido.naturalidade
        ? String(rawAssistido.naturalidade)
        : undefined,
      nomeMae: rawAssistido.nomeMae
        ? String(rawAssistido.nomeMae)
        : undefined,
      nomePai: rawAssistido.nomePai
        ? String(rawAssistido.nomePai)
        : undefined,
    };

    const confianca = Math.min(
      1,
      Math.max(0, Number(parsed.confianca) || 0)
    );

    // Build analise (if deep)
    let analise: AnaliseProf | undefined;
    if (options.deep && parsed.analise) {
      const rawAnalise = parsed.analise as Record<string, unknown>;
      analise = {
        resumoFatos: String(rawAnalise.resumoFatos || ""),
        tipificacao: Array.isArray(rawAnalise.tipificacao)
          ? (rawAnalise.tipificacao as string[])
          : [],
        movimentacoes: Array.isArray(rawAnalise.movimentacoes)
          ? (
              rawAnalise.movimentacoes as Array<Record<string, unknown>>
            ).map((m) => ({
              data: String(m.data || ""),
              tipo: String(m.tipo || ""),
              descricao: String(m.descricao || ""),
            }))
          : [],
        datasChave: Array.isArray(rawAnalise.datasChave)
          ? (rawAnalise.datasChave as Array<Record<string, unknown>>).map(
              (d) => ({
                data: String(d.data || ""),
                evento: String(d.evento || ""),
              })
            )
          : [],
        fundamentosJuridicos: rawAnalise.fundamentosJuridicos
          ? String(rawAnalise.fundamentosJuridicos)
          : undefined,
        testemunhas: Array.isArray(rawAnalise.testemunhas)
          ? (rawAnalise.testemunhas as string[])
          : undefined,
        pontosAtencao: Array.isArray(rawAnalise.pontosAtencao)
          ? (rawAnalise.pontosAtencao as string[])
          : undefined,
      };
    }

    return {
      success: true,
      processo,
      assistido,
      confianca,
      analise,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error("[pdf-extraction] Error:", error);
    return {
      success: false,
      processo: makeEmptyProcesso(),
      assistido: makeEmptyAssistido(),
      confianca: 0,
      error: error instanceof Error ? error.message : "Erro na extração do PDF",
    };
  }
}

// ==========================================
// FUNCAO — ANALISE DE MULTIPLOS DOCUMENTOS
// ==========================================

const MAX_DOCUMENTS = 10;

/**
 * Analisa multiplos documentos de um mesmo assistido e consolida as informacoes.
 *
 * @param documents - Array de documentos com nome, base64 e mimeType
 */
export async function analyzeMultipleDocuments(
  documents: Array<{ name: string; base64: string; mimeType: string }>
): Promise<MultiDocumentResult> {
  try {
    if (!isPdfExtractionConfigured()) {
      return {
        success: false,
        documentosAnalisados: 0,
        dadosConsolidados: makeEmptyAssistido(),
        timelineUnificada: [],
        resumoGeral: "",
        alertas: [],
        error: "Gemini API não configurada",
      };
    }

    if (documents.length === 0) {
      return {
        success: false,
        documentosAnalisados: 0,
        dadosConsolidados: makeEmptyAssistido(),
        timelineUnificada: [],
        resumoGeral: "",
        alertas: [],
        error: "Nenhum documento fornecido",
      };
    }

    // Limit documents
    const docsToProcess = documents.slice(0, MAX_DOCUMENTS);
    const skippedCount = documents.length - docsToProcess.length;

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: SAFETY_SETTINGS,
    });

    // Build multimodal content array: each document as inlineData, then the prompt
    const contentParts: Array<
      | { inlineData: { mimeType: string; data: string } }
      | { text: string }
    > = [];

    for (const doc of docsToProcess) {
      contentParts.push({
        inlineData: {
          mimeType: doc.mimeType,
          data: doc.base64,
        },
      });
      contentParts.push({
        text: `[Documento: ${doc.name}]`,
      });
    }

    contentParts.push({ text: MULTI_DOCUMENT_PROMPT });

    const result = await model.generateContent(contentParts);
    const response = result.response;
    const responseText = response.text();

    const parsed = parseJsonResponse(responseText) as Record<string, unknown>;

    // Build dadosConsolidados
    const rawDados = (parsed.dadosConsolidados || {}) as Record<
      string,
      unknown
    >;
    const dadosConsolidados: AssistidoExtraido = {
      cpf: rawDados.cpf ? String(rawDados.cpf) : undefined,
      rg: rawDados.rg ? String(rawDados.rg) : undefined,
      endereco: rawDados.endereco ? String(rawDados.endereco) : undefined,
      filiacao: rawDados.filiacao ? String(rawDados.filiacao) : undefined,
      dataNascimento: rawDados.dataNascimento
        ? String(rawDados.dataNascimento)
        : undefined,
      naturalidade: rawDados.naturalidade
        ? String(rawDados.naturalidade)
        : undefined,
      nomeMae: rawDados.nomeMae ? String(rawDados.nomeMae) : undefined,
      nomePai: rawDados.nomePai ? String(rawDados.nomePai) : undefined,
    };

    // Build timeline
    const rawTimeline = Array.isArray(parsed.timelineUnificada)
      ? (parsed.timelineUnificada as Array<Record<string, unknown>>)
      : [];
    const timelineUnificada = rawTimeline.map((t) => ({
      data: String(t.data || ""),
      evento: String(t.evento || ""),
      fonte: String(t.fonte || ""),
    }));

    // Build alertas
    const alertas = Array.isArray(parsed.alertas)
      ? (parsed.alertas as string[])
      : [];

    // Add warning if documents were skipped
    if (skippedCount > 0) {
      alertas.push(
        `${skippedCount} documento(s) ignorado(s) — limite de ${MAX_DOCUMENTS} documentos por análise`
      );
    }

    return {
      success: true,
      documentosAnalisados: Number(parsed.documentosAnalisados) || docsToProcess.length,
      dadosConsolidados,
      timelineUnificada,
      resumoGeral: String(parsed.resumoGeral || ""),
      alertas,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error("[pdf-extraction] Multi-document error:", error);
    return {
      success: false,
      documentosAnalisados: 0,
      dadosConsolidados: makeEmptyAssistido(),
      timelineUnificada: [],
      resumoGeral: "",
      alertas: [],
      error:
        error instanceof Error
          ? error.message
          : "Erro na análise de múltiplos documentos",
    };
  }
}
