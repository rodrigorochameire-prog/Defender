import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { jurisprudenciaJulgados } from "@/lib/db/schema";
import { eq, sql, desc, and, or, ilike } from "drizzle-orm";

// ==========================================
// CONFIGURAÇÃO DO GEMINI
// ==========================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Modelo para processamento de texto
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Modelo para embeddings (busca semântica)
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// ==========================================
// TIPOS
// ==========================================

interface ProcessamentoResult {
  resumo: string;
  pontosChave: string[];
  argumentos: {
    favoraveis: string[];
    desfavoraveis: string[];
  };
  palavrasChave: string[];
  embedding: number[];
  citacao?: string;
}

interface BuscaResult {
  id: number;
  tribunal: string;
  numeroProcesso: string | null;
  ementa: string | null;
  ementaResumo: string | null;
  dataJulgamento: string | null;
  relator: string | null;
  citacaoFormatada: string | null;
  score: number;
}

interface RespostaIA {
  resposta: string;
  julgadosCitados: number[];
  precedentesFormatados: Array<{
    id: number;
    citacao: string;
    trechoRelevante: string;
  }>;
}

// ==========================================
// PROCESSAMENTO DE JULGADOS
// ==========================================

/**
 * Processa um julgado com IA para extrair informações relevantes
 */
export async function processJulgadoWithAI(julgado: {
  id: number;
  tribunal: string;
  tipoDecisao: string;
  numeroProcesso: string | null;
  ementa: string | null;
  decisao: string | null;
  textoIntegral: string | null;
}): Promise<ProcessamentoResult> {
  // Montar o texto para análise
  const texto = [
    julgado.ementa,
    julgado.decisao,
    julgado.textoIntegral,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!texto || texto.length < 50) {
    throw new Error("Texto insuficiente para processamento");
  }

  // Limitar tamanho do texto
  const textoLimitado = texto.substring(0, 30000);

  // Prompt para análise
  const prompt = `Você é um assistente jurídico especializado em análise de jurisprudência criminal e defensoria pública.

Analise o seguinte julgado do ${julgado.tribunal} e extraia as informações solicitadas:

---
${textoLimitado}
---

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com a seguinte estrutura:

{
  "resumo": "Resumo objetivo do julgado em 2-3 frases, focando na tese central e decisão",
  "pontosChave": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "argumentosFavoraveisDefesa": ["Argumento favorável à defesa 1", "Argumento favorável 2"],
  "argumentosDesfavoraveisDefesa": ["Argumento desfavorável à defesa 1"],
  "palavrasChave": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"]
}

Foque em:
- Teses que podem ser usadas pela DEFESA
- Precedentes importantes
- Entendimentos consolidados
- Questões processuais relevantes`;

  try {
    const result = await textModel.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON da resposta
    let parsed;
    try {
      // Remover possíveis markers de markdown
      const cleanResponse = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleanResponse);
    } catch {
      console.error("Erro ao parsear resposta da IA:", response);
      // Tentar extrair JSON do texto
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Resposta inválida da IA");
      }
    }

    // Gerar embedding para busca semântica
    const embeddingResult = await embeddingModel.embedContent(
      `${julgado.tribunal} ${julgado.numeroProcesso || ""} ${parsed.resumo} ${parsed.pontosChave?.join(" ") || ""}`
    );
    const embedding = embeddingResult.embedding.values;

    return {
      resumo: parsed.resumo || "",
      pontosChave: parsed.pontosChave || [],
      argumentos: {
        favoraveis: parsed.argumentosFavoraveisDefesa || [],
        desfavoraveis: parsed.argumentosDesfavoraveisDefesa || [],
      },
      palavrasChave: parsed.palavrasChave || [],
      embedding,
    };
  } catch (error) {
    console.error("Erro ao processar julgado com IA:", error);
    throw error;
  }
}

// ==========================================
// BUSCA SEMÂNTICA
// ==========================================

/**
 * Busca julgados semanticamente similares usando embeddings
 */
export async function searchJulgadosWithAI(
  query: string,
  options?: {
    tribunal?: string;
    temaId?: number;
    limit?: number;
  }
): Promise<BuscaResult[]> {
  const { tribunal, temaId, limit = 10 } = options || {};

  try {
    // Gerar embedding da query
    const embeddingResult = await embeddingModel.embedContent(query);
    const queryEmbedding = embeddingResult.embedding.values;

    // Buscar julgados com embedding
    const conditions = [];

    if (tribunal) {
      conditions.push(eq(jurisprudenciaJulgados.tribunal, tribunal as any));
    }

    if (temaId) {
      conditions.push(eq(jurisprudenciaJulgados.temaId, temaId));
    }

    // Buscar julgados processados
    conditions.push(eq(jurisprudenciaJulgados.processadoPorIA, true));

    const julgados = await db
      .select({
        id: jurisprudenciaJulgados.id,
        tribunal: jurisprudenciaJulgados.tribunal,
        numeroProcesso: jurisprudenciaJulgados.numeroProcesso,
        ementa: jurisprudenciaJulgados.ementa,
        ementaResumo: jurisprudenciaJulgados.ementaResumo,
        dataJulgamento: jurisprudenciaJulgados.dataJulgamento,
        relator: jurisprudenciaJulgados.relator,
        citacaoFormatada: jurisprudenciaJulgados.citacaoFormatada,
        embedding: jurisprudenciaJulgados.embedding,
      })
      .from(jurisprudenciaJulgados)
      .where(and(...conditions))
      .limit(100); // Buscar mais para depois filtrar por similaridade

    // Calcular similaridade de cosseno
    const resultadosComScore = julgados
      .filter((j) => j.embedding && Array.isArray(j.embedding))
      .map((j) => {
        const score = cosineSimilarity(queryEmbedding, j.embedding as number[]);
        return { ...j, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return resultadosComScore.map((r) => ({
      id: r.id,
      tribunal: r.tribunal,
      numeroProcesso: r.numeroProcesso,
      ementa: r.ementa,
      ementaResumo: r.ementaResumo,
      dataJulgamento: r.dataJulgamento,
      relator: r.relator,
      citacaoFormatada: r.citacaoFormatada,
      score: r.score,
    }));
  } catch (error) {
    console.error("Erro na busca semântica:", error);

    // Fallback para busca textual simples
    const julgados = await db
      .select({
        id: jurisprudenciaJulgados.id,
        tribunal: jurisprudenciaJulgados.tribunal,
        numeroProcesso: jurisprudenciaJulgados.numeroProcesso,
        ementa: jurisprudenciaJulgados.ementa,
        ementaResumo: jurisprudenciaJulgados.ementaResumo,
        dataJulgamento: jurisprudenciaJulgados.dataJulgamento,
        relator: jurisprudenciaJulgados.relator,
        citacaoFormatada: jurisprudenciaJulgados.citacaoFormatada,
      })
      .from(jurisprudenciaJulgados)
      .where(
        or(
          ilike(jurisprudenciaJulgados.ementa, `%${query}%`),
          ilike(jurisprudenciaJulgados.ementaResumo, `%${query}%`)
        )
      )
      .limit(limit);

    return julgados.map((j) => ({ ...j, score: 0.5 }));
  }
}

// ==========================================
// CHAT COM IA SOBRE JURISPRUDÊNCIA
// ==========================================

/**
 * Responde perguntas sobre jurisprudência usando os julgados do banco
 */
export async function askJurisprudenciaAI(
  pergunta: string,
  contexto?: {
    tribunal?: string;
    temaId?: number;
    julgadosIds?: number[];
  }
): Promise<RespostaIA> {
  // Buscar julgados relevantes
  let julgadosRelevantes;

  if (contexto?.julgadosIds && contexto.julgadosIds.length > 0) {
    // Usar julgados específicos
    julgadosRelevantes = await db
      .select()
      .from(jurisprudenciaJulgados)
      .where(sql`${jurisprudenciaJulgados.id} = ANY(${contexto.julgadosIds})`);
  } else {
    // Buscar semanticamente
    const resultados = await searchJulgadosWithAI(pergunta, {
      tribunal: contexto?.tribunal,
      temaId: contexto?.temaId,
      limit: 5,
    });

    if (resultados.length === 0) {
      // Busca textual como fallback
      julgadosRelevantes = await db
        .select()
        .from(jurisprudenciaJulgados)
        .where(
          or(
            ilike(jurisprudenciaJulgados.ementa, `%${pergunta.split(" ").slice(0, 3).join("%")}%`),
            ilike(jurisprudenciaJulgados.ementaResumo, `%${pergunta.split(" ").slice(0, 3).join("%")}%`)
          )
        )
        .limit(5);
    } else {
      const ids = resultados.map((r) => r.id);
      julgadosRelevantes = await db
        .select()
        .from(jurisprudenciaJulgados)
        .where(sql`${jurisprudenciaJulgados.id} = ANY(${ids})`);
    }
  }

  // Montar contexto para a IA
  const contextoPrecedentes = julgadosRelevantes
    .map((j, i) => {
      return `
PRECEDENTE ${i + 1}:
- Tribunal: ${j.tribunal}
- Processo: ${j.numeroProcesso || "N/A"}
- Relator: ${j.relator || "N/A"}
- Data: ${j.dataJulgamento || "N/A"}
- Citação: ${j.citacaoFormatada || "N/A"}
- Resumo: ${j.ementaResumo || j.ementa?.substring(0, 500) || "N/A"}
${j.iaPontosChave ? `- Pontos-chave: ${(j.iaPontosChave as string[]).join("; ")}` : ""}
`;
    })
    .join("\n---\n");

  const prompt = `Você é um assistente jurídico especializado em jurisprudência criminal e defensoria pública.

Com base nos seguintes precedentes do banco de jurisprudência:

${contextoPrecedentes}

Responda à seguinte pergunta do defensor:

"${pergunta}"

Instruções:
1. Responda de forma objetiva e técnica
2. CITE os precedentes relevantes usando o formato de citação fornecido
3. Indique se a jurisprudência é favorável ou desfavorável à defesa
4. Se houver divergência, mencione
5. Forneça trechos que possam ser usados diretamente em peças processuais

Formato da resposta:
- Comece com uma resposta direta à pergunta
- Cite os precedentes relevantes
- Forneça sugestões de como usar na prática

Retorne sua resposta em texto normal (não JSON).`;

  try {
    const result = await textModel.generateContent(prompt);
    const resposta = result.response.text();

    // Formatar precedentes para copiar/colar
    const precedentesFormatados = julgadosRelevantes.map((j) => ({
      id: j.id,
      citacao: j.citacaoFormatada || `${j.tribunal}, ${j.numeroProcesso || ""}`,
      trechoRelevante: j.ementaResumo || j.ementa?.substring(0, 300) || "",
    }));

    return {
      resposta,
      julgadosCitados: julgadosRelevantes.map((j) => j.id),
      precedentesFormatados,
    };
  } catch (error) {
    console.error("Erro ao gerar resposta da IA:", error);
    throw new Error("Erro ao processar pergunta com IA");
  }
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Calcula similaridade de cosseno entre dois vetores
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Extrai texto de um PDF usando a API do Gemini
 */
export async function extractTextFromPDF(
  fileBuffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<string> {
  try {
    const base64Data = fileBuffer.toString("base64");

    const result = await textModel.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      "Extraia todo o texto deste documento PDF de forma organizada. Mantenha a estrutura original (títulos, parágrafos, etc). Retorne apenas o texto extraído, sem comentários.",
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    throw error;
  }
}

/**
 * Analisa automaticamente um PDF de julgado e extrai metadados
 */
export async function analyzeJulgadoPDF(
  fileBuffer: Buffer,
  fileName: string
): Promise<{
  tribunal: string;
  tipoDecisao: string;
  numeroProcesso: string;
  relator: string;
  orgaoJulgador: string;
  dataJulgamento: string;
  ementa: string;
  textoIntegral: string;
}> {
  // Primeiro extrair o texto
  const texto = await extractTextFromPDF(fileBuffer);

  // Analisar com IA para extrair metadados
  const prompt = `Analise este documento jurídico e extraia as informações solicitadas.

DOCUMENTO:
${texto.substring(0, 25000)}

Retorne APENAS um JSON válido (sem markdown) com:
{
  "tribunal": "STF" | "STJ" | "TJBA" | "TRF1" | "TRF3" | "OUTRO",
  "tipoDecisao": "ACORDAO" | "DECISAO_MONOCRATICA" | "SUMULA" | "SUMULA_VINCULANTE" | "REPERCUSSAO_GERAL" | "RECURSO_REPETITIVO" | "INFORMATIVO" | "OUTRO",
  "numeroProcesso": "número do processo/recurso",
  "relator": "nome do relator",
  "orgaoJulgador": "turma/câmara/pleno",
  "dataJulgamento": "YYYY-MM-DD",
  "ementa": "texto da ementa"
}

Se algum campo não for encontrado, use null.`;

  try {
    const result = await textModel.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON
    const cleanResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanResponse);

    return {
      tribunal: parsed.tribunal || "OUTRO",
      tipoDecisao: parsed.tipoDecisao || "OUTRO",
      numeroProcesso: parsed.numeroProcesso || "",
      relator: parsed.relator || "",
      orgaoJulgador: parsed.orgaoJulgador || "",
      dataJulgamento: parsed.dataJulgamento || "",
      ementa: parsed.ementa || "",
      textoIntegral: texto,
    };
  } catch (error) {
    console.error("Erro ao analisar PDF:", error);

    // Retornar com valores padrão
    return {
      tribunal: "OUTRO",
      tipoDecisao: "OUTRO",
      numeroProcesso: "",
      relator: "",
      orgaoJulgador: "",
      dataJulgamento: "",
      ementa: "",
      textoIntegral: texto,
    };
  }
}
