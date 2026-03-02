/**
 * PDF Section Classifier — Google Gemini
 *
 * Recebe texto extraido de um bloco de paginas e identifica
 * pecas processuais com taxonomia refinada para defesa criminal.
 *
 * v2 — Nova taxonomia com relevancia defensiva, dados estruturados
 *       (pessoas, cronologia, teses) e filtro de burocracia.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ==========================================
// CONFIGURACAO
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
  if (!GEMINI_API_KEY) throw new Error("Gemini API key nao configurada");
  if (!client) client = new GoogleGenerativeAI(GEMINI_API_KEY);
  return client;
}

export function isClassifierConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ==========================================
// TIPOS — TAXONOMIA v2 (relevancia defensiva)
// ==========================================

export const SECTION_TIPOS = [
  // === CRITICO (vermelho) — impacto direto na defesa ===
  "denuncia",
  "sentenca",
  "depoimento_vitima",
  "depoimento_testemunha",
  "depoimento_investigado",

  // === ALTO (laranja/amarelo) — analise obrigatoria ===
  "decisao",
  "pronuncia",
  "laudo_pericial",
  "laudo_necroscopico",
  "laudo_local",
  "ata_audiencia",
  "interrogatorio",
  "alegacoes_mp",
  "alegacoes_defesa",
  "resposta_acusacao",
  "recurso",
  "habeas_corpus",

  // === MEDIO (azul) — contexto investigativo ===
  "boletim_ocorrencia",
  "portaria_ip",
  "relatorio_policial",
  "auto_prisao",
  "certidao_relevante",
  "diligencias_422",
  "alegacoes",

  // === BAIXO (cinza) — referencia ===
  "documento_identidade",
  "outros",

  // === OCULTO — burocracia sem valor defensivo ===
  "burocracia",
] as const;

export type SectionTipo = (typeof SECTION_TIPOS)[number];

/** Nivel de relevancia para a defesa */
export type RelevanciaDefensiva = "critico" | "alto" | "medio" | "baixo" | "oculto";

/** Mapa tipo -> relevancia */
export const TIPO_RELEVANCIA: Record<SectionTipo, RelevanciaDefensiva> = {
  denuncia: "critico",
  sentenca: "critico",
  depoimento_vitima: "critico",
  depoimento_testemunha: "critico",
  depoimento_investigado: "critico",

  decisao: "alto",
  pronuncia: "alto",
  laudo_pericial: "alto",
  laudo_necroscopico: "alto",
  laudo_local: "alto",
  ata_audiencia: "alto",
  interrogatorio: "alto",
  alegacoes_mp: "alto",
  alegacoes_defesa: "alto",
  resposta_acusacao: "alto",
  recurso: "alto",
  habeas_corpus: "alto",

  boletim_ocorrencia: "medio",
  portaria_ip: "medio",
  relatorio_policial: "medio",
  auto_prisao: "medio",
  certidao_relevante: "medio",
  diligencias_422: "medio",
  alegacoes: "medio",

  documento_identidade: "baixo",
  outros: "baixo",

  burocracia: "oculto",
};

// ==========================================
// GRUPOS SEMANTICOS — Agrupamento hierarquico
// ==========================================

export const SECTION_GROUPS = {
  depoimentos: {
    label: "Depoimentos e Interrogatórios",
    icon: "Users",
    color: "#3b82f6",
    tipos: ["depoimento_vitima", "depoimento_testemunha", "depoimento_investigado", "interrogatorio"] as const,
  },
  laudos: {
    label: "Laudos e Perícias",
    icon: "Microscope",
    color: "#ec4899",
    tipos: ["laudo_pericial", "laudo_necroscopico", "laudo_local"] as const,
  },
  decisoes: {
    label: "Decisões Judiciais",
    icon: "Gavel",
    color: "#8b5cf6",
    tipos: ["decisao", "sentenca", "pronuncia"] as const,
  },
  defesa: {
    label: "Manifestações da Defesa",
    icon: "ShieldCheck",
    color: "#10b981",
    tipos: ["alegacoes_defesa", "resposta_acusacao", "recurso", "habeas_corpus"] as const,
  },
  mp: {
    label: "Manifestações do MP",
    icon: "BookMarked",
    color: "#ef4444",
    tipos: ["denuncia", "alegacoes_mp", "alegacoes"] as const,
  },
  investigacao: {
    label: "Investigação Policial",
    icon: "Shield",
    color: "#f97316",
    tipos: ["relatorio_policial", "portaria_ip", "auto_prisao", "boletim_ocorrencia", "diligencias_422"] as const,
  },
  audiencias: {
    label: "Audiências",
    icon: "CalendarDays",
    color: "#4f46e5",
    tipos: ["ata_audiencia"] as const,
  },
  documentos: {
    label: "Documentos e Certidões",
    icon: "FileCheck",
    color: "#22c55e",
    tipos: ["certidao_relevante", "documento_identidade"] as const,
  },
  outros: {
    label: "Outros",
    icon: "HelpCircle",
    color: "#71717a",
    tipos: ["outros"] as const,
  },
  burocracia: {
    label: "Burocracia",
    icon: "Ban",
    color: "#d4d4d8",
    tipos: ["burocracia"] as const,
  },
} as const;

export type SectionGroupKey = keyof typeof SECTION_GROUPS;

/** Mapa reverso: tipo -> grupo */
export const TIPO_TO_GROUP: Record<string, SectionGroupKey> = Object.entries(SECTION_GROUPS).reduce(
  (acc, [groupKey, group]) => {
    for (const tipo of group.tipos) {
      acc[tipo] = groupKey as SectionGroupKey;
    }
    return acc;
  },
  {} as Record<string, SectionGroupKey>
);

// ==========================================
// INTERFACES — Dados Estruturados v2
// ==========================================

/** Pessoa mencionada no documento com papel e contexto */
export interface PessoaExtraida {
  nome: string;
  papel: "vitima" | "investigado" | "testemunha" | "juiz" | "promotor" | "delegado" | "perito" | "defensor" | "outro";
  descricao?: string; // Ex: "vizinho do acusado", "policial militar que atendeu a ocorrencia"
}

/** Evento cronologico extraido */
export interface EventoCronologia {
  data: string; // formato ISO ou dd/mm/yyyy
  descricao: string;
  fonte?: string; // "depoimento de FULANO", "laudo pericial", etc.
}

/** Tese defensiva identificada */
export interface TeseDefensiva {
  tipo: "nulidade" | "prescricao" | "excludente" | "atenuante" | "desclassificacao" | "absolvicao" | "procedimento" | "prova_ilicita" | "outra";
  descricao: string;
  fundamentacao?: string; // artigos de lei, jurisprudencia
  confianca: number; // 0-100
}

export interface ClassifiedSection {
  tipo: SectionTipo;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string;
  confianca: number; // 0-100
  relevancia: RelevanciaDefensiva;
  metadata: {
    // Dados estruturados v2
    pessoas?: PessoaExtraida[];
    cronologia?: EventoCronologia[];
    tesesDefensivas?: TeseDefensiva[];

    // Campos legados (mantidos para backward compatibility)
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;

    // Novos campos contextuais
    contradicoes?: string[]; // contradicoes detectadas com outros depoimentos/pecas
    pontosCriticos?: string[]; // pontos que merecem atencao da defesa
  };
}

export interface ClassificationResult {
  success: boolean;
  sections: ClassifiedSection[];
  tokensUsed?: number;
  error?: string;
}

// ==========================================
// CLASSIFICACAO — Prompt v2
// ==========================================

const CLASSIFICATION_PROMPT = `Analisador de processos criminais brasileiros (foco: DEFESA).
Identifique TODAS as pecas processuais no texto. Use EXATAMENTE estes valores para "tipo":

TIPOS VALIDOS:
denuncia, sentenca, depoimento_vitima, depoimento_testemunha, depoimento_investigado,
decisao, pronuncia, laudo_pericial, laudo_necroscopico, laudo_local,
ata_audiencia, interrogatorio, alegacoes_mp, alegacoes_defesa, resposta_acusacao,
recurso, habeas_corpus, boletim_ocorrencia, portaria_ip, relatorio_policial,
auto_prisao, certidao_relevante, diligencias_422, alegacoes,
documento_identidade, outros, burocracia

REGRAS CRITICAS — IDENTIFICACAO DE DEPOIMENTOS E INTERROGATORIOS:

MARCADORES TEXTUAIS — procure EXATAMENTE estas expressoes no texto:
1. "TERMO DE DEPOIMENTO" → depoimento_testemunha ou depoimento_vitima
2. "TERMO DE DECLARAÇÕES" ou "TERMO DE DECLARACAO" → depoimento_testemunha ou depoimento_vitima
3. "TERMO DE QUALIFICAÇÃO E INTERROGATÓRIO" → interrogatorio
4. "AUTO DE QUALIFICAÇÃO E INTERROGATÓRIO" → interrogatorio

ESTRUTURA FORMAL de um depoimento/interrogatorio (TODOS estes elementos estao presentes):
- Cabecalho: delegacia + tipo do termo (ex: "TERMO DE DEPOIMENTO")
- Referencia: "IP N°" ou "BO N°" + numero
- Data/hora: "As HH:MM do dia DD do mes de MMMM do ano de AAAA"
- Autoridade: "sob a presidencia do(a) Delegado(a) de Policia, NOME"
- Escrivao: "comigo NOME, Escrivao(a) de Policia"
- Pessoa ouvida: "compareceu o(a) DEPOENTE:" ou "DECLARANTE:" ou "INTERROGADO(A):" seguido de NOME, CPF, dados pessoais
- Conteudo: "INQUIRIDO(A) acerca do(s) fato(s)..." ou "as perguntas RESPONDEU:"
- Encerramento: "Nada mais disse e nem lhe foi perguntado"

CADA pessoa ouvida com Termo formal = 1 secao separada. Se ha 3 Termos de Depoimento no texto, sao 3 secoes.
Titulo: "Depoimento de NOME COMPLETO (papel)" — ex: "Depoimento de Miralva Santos de Oliveira (mae da vitima)"
Para interrogatorio: "Interrogatorio de NOME COMPLETO"

CLASSIFICACAO DO PAPEL:
- Se o depoente e vitima ou familiar da vitima → depoimento_vitima
- Se o depoente e testemunha, vizinho, conhecido → depoimento_testemunha
- Se e "TERMO DE QUALIFICACAO E INTERROGATORIO" com INTERROGADO(A)/CONDUZIDO → interrogatorio
- Se o texto menciona "na qualidade de suposto(a) autor(a)" ou "investigado" → interrogatorio

RELATORIO POLICIAL vs DEPOIMENTO:
- relatorio_policial = documento NARRATIVO do delegado. Contem: "Relatam os autos", "Relatorio Final", "Relatorio de Investigacao", resumo dos fatos, conclusoes. MESMO QUE mencione o que testemunhas disseram, e relatorio_policial. Um relatorio pode ter muitas paginas — UMA unica secao.
- Se o texto NAO tem a estrutura formal acima (Termo + compareceu + INQUIRIDO + Nada mais disse), NAO e depoimento — e relatorio_policial ou outra peca.
- Trechos como "conforme declarou a testemunha X..." dentro de narrativa = relatorio_policial (nao depoimento).

REGRAS GERAIS:
- Autuacao, juntada, verificacao autenticidade, certidao publicacao, remessa, vista MP, conclusao, ato ordinatorio, termo abertura/encerramento = burocracia
- Certidao com conteudo relevante (antecedentes, comparecimento) = certidao_relevante. Mera certidao burocracia = burocracia
- Auto de Prisao em Flagrante (AUTUACAO do flagrante) = auto_prisao
- Sumario/capa PJe = burocracia
- Requisicao de Exame Pericial = outros
- Missao Policial / Ordem de Missao = diligencias_422
- Representacao por Prisao Preventiva = outros

RESPONDA APENAS JSON (sem markdown). Exemplo com MULTIPLAS secoes:
{"sections":[
  {"tipo":"relatorio_policial","titulo":"Relatorio Final do Inquerito Policial","paginaInicio":5,"paginaFim":15,"resumo":"Relatorio narrativo do delegado...","confianca":95,"metadata":{"pessoas":[{"nome":"Anderson Carvalho","papel":"delegado"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":[],"partesmencionadas":[],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"depoimento_vitima","titulo":"Depoimento de Maria da Silva (mae da vitima)","paginaInicio":16,"paginaFim":17,"resumo":"Mae relata ultima vez que viu o filho...","confianca":98,"metadata":{"pessoas":[{"nome":"Maria da Silva","papel":"vitima","descricao":"mae da vitima"}],"cronologia":[{"data":"07/06/2024","descricao":"Data do depoimento"}],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":["Contradiz horario do BO"],"partesmencionadas":["Maria da Silva"],"datasExtraidas":["07/06/2024"],"artigosLei":[]}},
  {"tipo":"depoimento_testemunha","titulo":"Depoimento de Joao Santos (vizinho)","paginaInicio":18,"paginaFim":19,"resumo":"Vizinho ouviu gritos na noite dos fatos...","confianca":95,"metadata":{"pessoas":[{"nome":"Joao Santos","papel":"testemunha","descricao":"vizinho"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":[],"partesmencionadas":["Joao Santos"],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"interrogatorio","titulo":"Interrogatorio de Fulano de Tal","paginaInicio":20,"paginaFim":22,"resumo":"Investigado nega participacao...","confianca":98,"metadata":{"pessoas":[{"nome":"Fulano de Tal","papel":"investigado"}],"cronologia":[],"tesesDefensivas":[{"tipo":"absolvicao","descricao":"Nega autoria","confianca":40}],"contradicoes":[],"pontosCriticos":["Exerceu direito ao silencio parcial"],"partesmencionadas":["Fulano de Tal"],"datasExtraidas":[],"artigosLei":[]}}
]}

Campos metadata.pessoas[].papel: vitima|investigado|testemunha|juiz|promotor|delegado|perito|defensor|outro
Campos metadata.tesesDefensivas[].tipo: nulidade|prescricao|excludente|atenuante|desclassificacao|absolvicao|procedimento|prova_ilicita|outra
Se nenhuma peca encontrada: {"sections":[]}
IMPORTANTE: Use SOMENTE os tipos listados acima. Nao invente tipos novos.
NOTA: Este bloco pode ter overlap de paginas com blocos adjacentes. Identifique TODAS as secoes que iniciam ou estao completamente dentro deste bloco normalmente. O sistema fara deduplicacao automatica de secoes repetidas.`;

/**
 * Classifica secoes dentro de um bloco de paginas extraidas.
 *
 * @param pageText - Texto concatenado de um bloco de paginas (com marcadores [PAGINA N])
 * @param startPage - Primeira pagina do bloco (para ajustar offsets)
 * @param endPage - Ultima pagina do bloco
 */
export async function classifyPageChunk(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  try {
    if (!isClassifierConfigured()) {
      return { success: false, sections: [], error: "Gemini API nao configurada" };
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: SAFETY_SETTINGS,
    });

    const prompt = `${CLASSIFICATION_PROMPT}

## TEXTO DO PROCESSO (paginas ${startPage} a ${endPage})

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
      (s: Record<string, unknown>) => {
        const tipo = SECTION_TIPOS.includes(s.tipo as SectionTipo)
          ? (s.tipo as SectionTipo)
          : mapLegacyTipo(s.tipo as string);

        const meta = (s.metadata as Record<string, unknown>) || {};

        return {
          tipo,
          titulo: String(s.titulo || "Secao nao identificada"),
          paginaInicio: Number(s.paginaInicio) || startPage,
          paginaFim: Number(s.paginaFim) || endPage,
          resumo: String(s.resumo || ""),
          confianca: Math.min(100, Math.max(0, Number(s.confianca) || 50)),
          relevancia: TIPO_RELEVANCIA[tipo] || "baixo",
          metadata: {
            // Dados estruturados v2
            pessoas: Array.isArray(meta.pessoas) ? (meta.pessoas as PessoaExtraida[]) : [],
            cronologia: Array.isArray(meta.cronologia) ? (meta.cronologia as EventoCronologia[]) : [],
            tesesDefensivas: Array.isArray(meta.tesesDefensivas) ? (meta.tesesDefensivas as TeseDefensiva[]) : [],
            contradicoes: Array.isArray(meta.contradicoes) ? (meta.contradicoes as string[]) : [],
            pontosCriticos: Array.isArray(meta.pontosCriticos) ? (meta.pontosCriticos as string[]) : [],

            // Campos legados
            partesmencionadas: Array.isArray(meta.partesmencionadas)
              ? (meta.partesmencionadas as string[])
              : extractPartesFromPessoas(meta.pessoas),
            datasExtraidas: Array.isArray(meta.datasExtraidas)
              ? (meta.datasExtraidas as string[])
              : extractDatasFromCronologia(meta.cronologia),
            artigosLei: Array.isArray(meta.artigosLei) ? (meta.artigosLei as string[]) : [],
            juiz: (meta.juiz as string) || extractPessoaByPapel(meta.pessoas, "juiz"),
            promotor: (meta.promotor as string) || extractPessoaByPapel(meta.pessoas, "promotor"),
          },
        };
      }
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

// ==========================================
// HELPERS
// ==========================================

/**
 * Mapeia tipos legados (da taxonomia v1) para a v2.
 * Usado quando o Gemini retorna um tipo antigo.
 */
function mapLegacyTipo(tipo: string): SectionTipo {
  const legacyMap: Record<string, SectionTipo> = {
    depoimento: "depoimento_testemunha", // fallback generico → testemunha
    laudo: "laudo_pericial",
    inquerito: "relatorio_policial",
    termo_inquerito: "depoimento_investigado", // termos do IP geralmente sao do investigado
    certidao: "certidao_relevante",
  };
  return legacyMap[tipo] || "outros";
}

/** Extrai nomes de PessoaExtraida[] para campo legado partesmencionadas */
function extractPartesFromPessoas(pessoas: unknown): string[] {
  if (!Array.isArray(pessoas)) return [];
  return pessoas
    .filter((p: Record<string, unknown>) => p && typeof p.nome === "string")
    .map((p: Record<string, unknown>) => p.nome as string);
}

/** Extrai datas de EventoCronologia[] para campo legado datasExtraidas */
function extractDatasFromCronologia(cronologia: unknown): string[] {
  if (!Array.isArray(cronologia)) return [];
  return cronologia
    .filter((e: Record<string, unknown>) => e && typeof e.data === "string")
    .map((e: Record<string, unknown>) => e.data as string);
}

/** Busca primeira pessoa com papel especifico */
function extractPessoaByPapel(pessoas: unknown, papel: string): string | undefined {
  if (!Array.isArray(pessoas)) return undefined;
  const found = pessoas.find(
    (p: Record<string, unknown>) => p && p.papel === papel && typeof p.nome === "string"
  );
  return found ? (found as Record<string, unknown>).nome as string : undefined;
}

// ==========================================
// DEDUPLICACAO (para chunks com overlap)
// ==========================================

/**
 * Simple string similarity — ratio of matching chars (case-insensitive).
 * Returns 0..1 where 1 = identical.
 */
function titleSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  if (!la || !lb) return 0;

  // Use longest common substring ratio as a quick similarity measure
  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length > lb.length ? la : lb;
  let maxMatch = 0;
  for (let i = 0; i < shorter.length; i++) {
    for (let j = i + 1; j <= shorter.length; j++) {
      const sub = shorter.slice(i, j);
      if (longer.includes(sub) && sub.length > maxMatch) {
        maxMatch = sub.length;
      }
    }
  }
  return maxMatch / longer.length;
}

/**
 * Checks if two page ranges overlap.
 */
function pagesOverlap(a: ClassifiedSection, b: ClassifiedSection): boolean {
  return a.paginaInicio <= b.paginaFim && b.paginaInicio <= a.paginaFim;
}

/**
 * Deduplicates sections detected across overlapping chunks.
 * When two sections of the same tipo with similar titles overlap in page ranges,
 * keeps the one with higher confidence (or merges metadata).
 */
export function deduplicateSections(sections: ClassifiedSection[]): ClassifiedSection[] {
  if (sections.length <= 1) return sections;

  // Sort by paginaInicio, then by confianca DESC
  const sorted = [...sections].sort((a, b) =>
    a.paginaInicio !== b.paginaInicio
      ? a.paginaInicio - b.paginaInicio
      : b.confianca - a.confianca
  );

  const kept: ClassifiedSection[] = [];
  const removed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (removed.has(i)) continue;

    const current = sorted[i];

    // Look ahead for duplicates (same tipo, overlapping pages, similar title)
    for (let j = i + 1; j < sorted.length; j++) {
      if (removed.has(j)) continue;

      const candidate = sorted[j];

      // Stop looking if candidate starts too far ahead
      if (candidate.paginaInicio > current.paginaFim + 2) break;

      if (
        current.tipo === candidate.tipo &&
        pagesOverlap(current, candidate) &&
        titleSimilarity(current.titulo, candidate.titulo) > 0.5
      ) {
        // Keep current (higher confianca due to sort), remove candidate
        // Merge page range to be the widest
        current.paginaInicio = Math.min(current.paginaInicio, candidate.paginaInicio);
        current.paginaFim = Math.max(current.paginaFim, candidate.paginaFim);
        removed.add(j);
      }
    }

    kept.push(current);
  }

  if (removed.size > 0) {
    console.log(`[pdf-classifier] Deduplication: removed ${removed.size} duplicate sections from ${sections.length} total`);
  }

  return kept;
}

// ==========================================
// CLASSIFICACAO EM LOTE
// ==========================================

/**
 * Classifica um PDF inteiro processando em blocos.
 * Retorna todas as secoes encontradas em todos os blocos, deduplicated.
 */
export async function classifyFullDocument(
  chunks: Array<{ startPage: number; endPage: number; text: string }>
): Promise<ClassificationResult> {
  const allSections: ClassifiedSection[] = [];
  let totalTokens = 0;
  let successfulChunks = 0;
  let lastError: string | undefined;

  for (const chunk of chunks) {
    const result = await classifyPageChunk(chunk.text, chunk.startPage, chunk.endPage);

    if (!result.success) {
      console.warn(
        `[pdf-classifier] Chunk ${chunk.startPage}-${chunk.endPage} failed: ${result.error}`
      );
      lastError = result.error;
      continue; // Skip failed chunks, process the rest
    }

    successfulChunks++;
    allSections.push(...result.sections);
    totalTokens += result.tokensUsed || 0;
  }

  // If ALL chunks failed, propagate the error
  if (successfulChunks === 0 && chunks.length > 0) {
    return {
      success: false,
      sections: [],
      tokensUsed: totalTokens,
      error: lastError || "Todos os blocos falharam na classificacao",
    };
  }

  // Deduplicate sections from overlapping chunks
  const deduplicated = deduplicateSections(allSections);

  // Success = at least one chunk was processed (even if 0 sections found)
  return {
    success: true,
    sections: deduplicated,
    tokensUsed: totalTokens,
  };
}
