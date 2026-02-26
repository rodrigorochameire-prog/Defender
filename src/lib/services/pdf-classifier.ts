/**
 * PDF Section Classifier — Google Gemini
 *
 * Recebe texto extraído de um bloco de páginas e identifica
 * peças processuais (denúncia, sentença, depoimentos, etc.).
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY;

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key não configurada");
  if (!client) client = new GoogleGenerativeAI(GEMINI_API_KEY);
  return client;
}

export function isClassifierConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ==========================================
// TIPOS
// ==========================================

export const SECTION_TIPOS = [
  "denuncia",
  "sentenca",
  "decisao",
  "depoimento",
  "alegacoes",
  "certidao",
  "laudo",
  "inquerito",
  "recurso",
  "outros",
] as const;

export type SectionTipo = (typeof SECTION_TIPOS)[number];

export interface ClassifiedSection {
  tipo: SectionTipo;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string;
  confianca: number; // 0-100
  metadata: {
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;
  };
}

export interface ClassificationResult {
  success: boolean;
  sections: ClassifiedSection[];
  tokensUsed?: number;
  error?: string;
}

// ==========================================
// CLASSIFICAÇÃO
// ==========================================

const CLASSIFICATION_PROMPT = `
Você é um analisador de processos judiciais brasileiros.
Dado o texto extraído de um bloco de páginas de um PDF processual, identifique TODAS as peças processuais presentes.

## TIPOS DE PEÇAS (use exatamente estes valores)
| tipo | Padrões de Detecção |
|------|---------------------|
| denuncia | "O MINISTÉRIO PÚBLICO...", "DENÚNCIA", "EXORDIAL ACUSATÓRIA" |
| sentenca | "SENTENÇA", "VISTOS...", "Julgo procedente", "DISPOSITIVO" |
| decisao | "DECISÃO", "DECIDO", "Decisão interlocutória", "DETERMINO" |
| depoimento | "TERMO DE DEPOIMENTO", "OITIVA", "TERMO DE DECLARAÇÕES", "INQUIRIÇÃO" |
| alegacoes | "ALEGAÇÕES FINAIS", "MEMORIAIS", "RAZÕES FINAIS" |
| certidao | "CERTIDÃO", "CERTIFICO E DOU FÉ" |
| laudo | "LAUDO PERICIAL", "EXAME DE CORPO DE DELITO", "RELATÓRIO PERICIAL" |
| inquerito | "INQUÉRITO POLICIAL", "RELATÓRIO POLICIAL", "PORTARIA" |
| recurso | "APELAÇÃO", "RECURSO", "EMBARGOS", "AGRAVO" |
| outros | Seções não classificáveis nos tipos acima |

## INSTRUÇÕES
1. Identifique CADA peça processual no texto
2. Para cada peça, determine a página de início e fim
3. Gere um título descritivo (ex: "Depoimento de FULANO DE TAL")
4. Faça um resumo de 2-3 frases
5. Extraia metadados: partes mencionadas, datas, artigos de lei, juiz, promotor
6. Atribua uma confiança de 0-100 na classificação

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido, sem markdown:

{
  "sections": [
    {
      "tipo": "denuncia",
      "titulo": "Denúncia - Homicídio Qualificado",
      "paginaInicio": 1,
      "paginaFim": 5,
      "resumo": "O MP ofereceu denúncia contra FULANO por homicídio qualificado...",
      "confianca": 95,
      "metadata": {
        "partesmencionadas": ["FULANO DE TAL", "CICRANO"],
        "datasExtraidas": ["12/03/2024"],
        "artigosLei": ["Art. 121 §2º CP"],
        "juiz": null,
        "promotor": "Dr. Fulano"
      }
    }
  ]
}

Se não encontrar nenhuma peça processual, retorne: { "sections": [] }
`;

/**
 * Classifica seções dentro de um bloco de páginas extraídas.
 *
 * @param pageText - Texto concatenado de um bloco de páginas (com marcadores [PÁGINA N])
 * @param startPage - Primeira página do bloco (para ajustar offsets)
 * @param endPage - Última página do bloco
 */
export async function classifyPageChunk(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  try {
    if (!isClassifierConfigured()) {
      return { success: false, sections: [], error: "Gemini API não configurada" };
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: SAFETY_SETTINGS,
    });

    const prompt = `${CLASSIFICATION_PROMPT}

## TEXTO DO PROCESSO (páginas ${startPage} a ${endPage})

${pageText}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // Parse JSON response
    let jsonStr = responseText;
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const sections: ClassifiedSection[] = (parsed.sections || []).map(
      (s: Record<string, unknown>) => ({
        tipo: SECTION_TIPOS.includes(s.tipo as SectionTipo)
          ? (s.tipo as SectionTipo)
          : "outros",
        titulo: String(s.titulo || "Seção não identificada"),
        paginaInicio: Number(s.paginaInicio) || startPage,
        paginaFim: Number(s.paginaFim) || endPage,
        resumo: String(s.resumo || ""),
        confianca: Math.min(100, Math.max(0, Number(s.confianca) || 50)),
        metadata: {
          partesmencionadas: Array.isArray((s.metadata as Record<string, unknown>)?.partesmencionadas)
            ? (s.metadata as Record<string, unknown>).partesmencionadas as string[]
            : [],
          datasExtraidas: Array.isArray((s.metadata as Record<string, unknown>)?.datasExtraidas)
            ? (s.metadata as Record<string, unknown>).datasExtraidas as string[]
            : [],
          artigosLei: Array.isArray((s.metadata as Record<string, unknown>)?.artigosLei)
            ? (s.metadata as Record<string, unknown>).artigosLei as string[]
            : [],
          juiz: ((s.metadata as Record<string, unknown>)?.juiz as string) || undefined,
          promotor: ((s.metadata as Record<string, unknown>)?.promotor as string) || undefined,
        },
      })
    );

    return {
      success: true,
      sections,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error("[pdf-classifier] Error:", error);
    return {
      success: false,
      sections: [],
      error: error instanceof Error ? error.message : "Classification error",
    };
  }
}

/**
 * Classifica um PDF inteiro processando em blocos.
 * Retorna todas as seções encontradas em todos os blocos.
 */
export async function classifyFullDocument(
  chunks: Array<{ startPage: number; endPage: number; text: string }>
): Promise<ClassificationResult> {
  const allSections: ClassifiedSection[] = [];
  let totalTokens = 0;

  for (const chunk of chunks) {
    const result = await classifyPageChunk(chunk.text, chunk.startPage, chunk.endPage);

    if (!result.success) {
      console.warn(
        `[pdf-classifier] Chunk ${chunk.startPage}-${chunk.endPage} failed: ${result.error}`
      );
      continue; // Skip failed chunks, process the rest
    }

    allSections.push(...result.sections);
    totalTokens += result.tokensUsed || 0;
  }

  return {
    success: allSections.length > 0,
    sections: allSections,
    tokensUsed: totalTokens,
  };
}
