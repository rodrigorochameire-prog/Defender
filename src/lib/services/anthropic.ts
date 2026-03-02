/**
 * OMBUDS - Integração Anthropic Claude
 *
 * Serviços de IA usando Claude para:
 * - Claude Sonnet 4.6: Revisão de documentos, coerência, tom jurídico
 * - Claude Opus 4.6: High reasoning sobre dados ESTRUTURADOS (uso restrito)
 *
 * ⚠️ RESTRIÇÕES DO OPUS 4.6:
 * - Apenas para funções superiores de inteligência sobre dados já depurados
 * - NÃO usar para processar PDFs longos ou contextos grandes
 * - Dados devem chegar já estruturados (JSON, tabelas, resumos)
 * - Custo alto — reservar para decisões que exijam raciocínio profundo
 */

import Anthropic from "@anthropic-ai/sdk";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/** Modelos disponíveis (fev/2026) */
export const CLAUDE_MODELS = {
  /** Estado da arte em análise textual. Revisões, coerência, tom jurídico. */
  SONNET: "claude-sonnet-4-20250514",
  /** High reasoning sobre dados estruturados. USO RESTRITO. */
  OPUS: "claude-opus-4-20250514",
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

// Contexto jurídico base para todas as chamadas
const CONTEXTO_JURIDICO_SISTEMA = `Você é um especialista jurídico da Defensoria Pública do Estado da Bahia, atuando em Camaçari.

Suas análises devem:
- Priorizar a defesa do assistido
- Usar linguagem técnica jurídica formal
- Citar artigos de lei, súmulas e jurisprudência quando pertinente
- Considerar a vulnerabilidade social do assistido
- Ser direto e objetivo, sem rodeios`;

// ==========================================
// CLIENTE
// ==========================================

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não está configurada no ambiente");
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
}

export function isAnthropicConfigured(): boolean {
  return !!ANTHROPIC_API_KEY;
}

// ==========================================
// TIPOS
// ==========================================

export interface ClaudeResult {
  conteudo: string;
  modeloUsado: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoEstimado?: number; // USD
}

export interface RevisaoOficioResult extends ClaudeResult {
  score: number; // 0-100
  sugestoes: Array<{
    tipo: "correcao" | "melhoria" | "alerta";
    trecho?: string;
    sugestao: string;
    prioridade: "alta" | "media" | "baixa";
  }>;
  tomAdequado: boolean;
  formalidadeOk: boolean;
  dadosCorretos: boolean;
  conteudoRevisado?: string;
}

export interface InsightEstruturadoResult extends ClaudeResult {
  insights: Array<{
    categoria: string;
    descricao: string;
    confianca: number; // 0-1
    acaoRecomendada?: string;
  }>;
  padroesIdentificados: string[];
  recomendacoes: string[];
}

// ==========================================
// FUNÇÕES — CLAUDE SONNET (Revisão)
// ==========================================

/**
 * Revisa um ofício verificando coerência, tom formal e adequação jurídica
 *
 * Usa Claude Sonnet 4.6 — ideal para revisão textual de alta qualidade
 */
export async function revisarOficio(
  conteudo: string,
  tipoOficio: string,
  destinatario: string,
  contextoAdicional?: string
): Promise<RevisaoOficioResult> {
  const client = getClient();

  const prompt = `## TAREFA
Revise o ofício abaixo com rigor profissional. Avalie cada aspecto e retorne JSON estruturado.

## INFORMAÇÕES DO OFÍCIO
- Tipo: ${tipoOficio}
- Destinatário: ${destinatario}
${contextoAdicional ? `- Contexto adicional: ${contextoAdicional}` : ""}

## CONTEÚDO DO OFÍCIO
${conteudo}

## CRITÉRIOS DE AVALIAÇÃO
1. **Tom formal** — Linguagem adequada ao destinatário e ao tipo de ofício
2. **Coerência textual** — Argumentação lógica, sem contradições
3. **Adequação jurídica** — Termos técnicos corretos, referências a leis/artigos precisas
4. **Dados do assistido** — Nome, CPF, processo corretos e consistentes
5. **Estrutura** — Cabeçalho, saudação, corpo, fechamento, assinatura
6. **Ortografia e gramática** — Erros de português

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido:
{
  "score": 0-100,
  "tomAdequado": true/false,
  "formalidadeOk": true/false,
  "dadosCorretos": true/false,
  "sugestoes": [
    {
      "tipo": "correcao|melhoria|alerta",
      "trecho": "trecho problemático (se aplicável)",
      "sugestao": "o que fazer",
      "prioridade": "alta|media|baixa"
    }
  ],
  "conteudoRevisado": "versão melhorada completa do ofício (se score < 80)"
}`;

  const message = await client.messages.create({
    model: CLAUDE_MODELS.SONNET,
    max_tokens: 4096,
    system: CONTEXTO_JURIDICO_SISTEMA,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON da resposta
  let parsed: {
    score?: number;
    sugestoes?: RevisaoOficioResult["sugestoes"];
    tomAdequado?: boolean;
    formalidadeOk?: boolean;
    dadosCorretos?: boolean;
    conteudoRevisado?: string;
  };
  try {
    let jsonStr = responseText;
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }
    parsed = JSON.parse(jsonStr);
  } catch {
    // Fallback se não conseguir parsear
    parsed = {
      score: 50,
      sugestoes: [
        {
          tipo: "alerta" as const,
          sugestao: "Não foi possível estruturar a revisão automaticamente",
          prioridade: "media" as const,
        },
      ],
    };
  }

  const tokensEntrada = message.usage.input_tokens;
  const tokensSaida = message.usage.output_tokens;

  return {
    conteudo: responseText,
    modeloUsado: CLAUDE_MODELS.SONNET,
    tokensEntrada,
    tokensSaida,
    custoEstimado: estimarCusto(CLAUDE_MODELS.SONNET, tokensEntrada, tokensSaida),
    score: parsed.score ?? 50,
    sugestoes: parsed.sugestoes ?? [],
    tomAdequado: parsed.tomAdequado ?? true,
    formalidadeOk: parsed.formalidadeOk ?? true,
    dadosCorretos: parsed.dadosCorretos ?? true,
    conteudoRevisado: parsed.conteudoRevisado,
  };
}

/**
 * Melhora um texto de ofício com base em instruções específicas
 *
 * Usa Claude Sonnet 4.6
 */
export async function melhorarTexto(
  conteudo: string,
  instrucao: string
): Promise<ClaudeResult> {
  const client = getClient();

  const message = await client.messages.create({
    model: CLAUDE_MODELS.SONNET,
    max_tokens: 4096,
    system: CONTEXTO_JURIDICO_SISTEMA,
    messages: [
      {
        role: "user",
        content: `## TAREFA
Melhore o texto abaixo seguindo esta instrução: "${instrucao}"

## TEXTO ORIGINAL
${conteudo}

## REGRAS
- Mantenha o tom formal jurídico
- Preserve todos os dados do assistido/processo
- Retorne APENAS o texto melhorado, sem explicações`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  return {
    conteudo: responseText,
    modeloUsado: CLAUDE_MODELS.SONNET,
    tokensEntrada: message.usage.input_tokens,
    tokensSaida: message.usage.output_tokens,
    custoEstimado: estimarCusto(
      CLAUDE_MODELS.SONNET,
      message.usage.input_tokens,
      message.usage.output_tokens
    ),
  };
}

// ==========================================
// FUNÇÕES — CLAUDE OPUS (High Reasoning)
// ==========================================

/**
 * Analisa padrões em dados ESTRUTURADOS de ofícios
 *
 * ⚠️ USA OPUS 4.6 — CARO. Apenas para dados já depurados.
 * Input DEVE ser JSON/dados estruturados, NÃO texto livre ou PDFs.
 *
 * @param dadosEstruturados - JSON com dados já classificados/extraídos
 * @param pergunta - O que se quer descobrir nos dados
 */
export async function analisarDadosEstruturados(
  dadosEstruturados: Record<string, unknown>,
  pergunta: string
): Promise<InsightEstruturadoResult> {
  const client = getClient();

  // Guard: verificar tamanho do input para evitar uso abusivo
  const inputSize = JSON.stringify(dadosEstruturados).length;
  if (inputSize > 50000) {
    throw new Error(
      `Input muito grande para Opus (${inputSize} chars). ` +
        `Opus deve receber dados já depurados (max ~50k chars). ` +
        `Use Gemini para processar grandes volumes primeiro.`
    );
  }

  const prompt = `## TAREFA
Analise os dados estruturados abaixo e responda à pergunta com insights profundos.

## PERGUNTA
${pergunta}

## DADOS
${JSON.stringify(dadosEstruturados, null, 2)}

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido:
{
  "insights": [
    {
      "categoria": "nome da categoria",
      "descricao": "descrição detalhada do insight",
      "confianca": 0.0-1.0,
      "acaoRecomendada": "ação sugerida (opcional)"
    }
  ],
  "padroesIdentificados": ["padrão 1", "padrão 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2"]
}`;

  const message = await client.messages.create({
    model: CLAUDE_MODELS.OPUS,
    max_tokens: 4096,
    system: `${CONTEXTO_JURIDICO_SISTEMA}\n\nVocê está analisando dados ESTRUTURADOS. Forneça insights de alto nível com raciocínio profundo.`,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: {
    insights?: InsightEstruturadoResult["insights"];
    padroesIdentificados?: string[];
    recomendacoes?: string[];
  };
  try {
    let jsonStr = responseText;
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = {
      insights: [],
      padroesIdentificados: [],
      recomendacoes: [responseText],
    };
  }

  const tokensEntrada = message.usage.input_tokens;
  const tokensSaida = message.usage.output_tokens;

  return {
    conteudo: responseText,
    modeloUsado: CLAUDE_MODELS.OPUS,
    tokensEntrada,
    tokensSaida,
    custoEstimado: estimarCusto(CLAUDE_MODELS.OPUS, tokensEntrada, tokensSaida),
    insights: parsed.insights ?? [],
    padroesIdentificados: parsed.padroesIdentificados ?? [],
    recomendacoes: parsed.recomendacoes ?? [],
  };
}

// ==========================================
// UTILITÁRIOS
// ==========================================

/**
 * Estima custo em USD baseado nos tokens
 * Preços Anthropic (fev/2026, aproximados):
 * - Sonnet: $3/MTok input, $15/MTok output
 * - Opus: $15/MTok input, $75/MTok output
 */
function estimarCusto(
  modelo: ClaudeModel,
  tokensEntrada: number,
  tokensSaida: number
): number {
  const precos: Record<ClaudeModel, { input: number; output: number }> = {
    [CLAUDE_MODELS.SONNET]: { input: 3, output: 15 },
    [CLAUDE_MODELS.OPUS]: { input: 15, output: 75 },
  };

  const preco = precos[modelo];
  if (!preco) return 0;

  return (
    (tokensEntrada / 1_000_000) * preco.input +
    (tokensSaida / 1_000_000) * preco.output
  );
}
