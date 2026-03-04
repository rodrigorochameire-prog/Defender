/**
 * DefesaHub - Integração Google Gemini
 * 
 * Serviço para análise estratégica de casos jurídicos usando IA.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

// Modelos disponíveis (atualizado fev/2026)
// - gemini-3.1-pro-preview: Reasoning-first, 1M context, agentic workflows
// - gemini-2.5-flash: Stable GA, fast multimodal, great for high volume
// - gemini-2.5-flash-lite: Ultra-cheap classification, reasoning off by default
// - gemini-2.5-pro: Stable GA, deep reasoning for complex tasks
export const GEMINI_MODELS = {
  /** Reasoning-first model. Análises processuais, relatórios, minutas (1M tokens) */
  PRO: "gemini-2.5-pro",
  /** Fast multimodal. Extração, classificação, resumos (alto volume) */
  FLASH: "gemini-2.5-flash",
  /** Ultra-cheap. Classificação simples, triagem (thinking off by default) */
  FLASH_LITE: "gemini-2.5-flash-lite",
  /** Reasoning-first preview. Análises profundas, raciocínio complexo */
  PRO_REASONING: "gemini-3.1-pro-preview",
  /** @deprecated Use PRO or FLASH instead — 1.5 models retired, returns 404 */
  PRO_VISION: "gemini-1.5-pro-vision",
} as const;

// Configuração de segurança para conteúdo jurídico
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

// ==========================================
// CLIENTE GEMINI
// ==========================================

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não está configurada no ambiente");
  }
  
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  
  return geminiClient;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ==========================================
// FUNÇÕES DE ANÁLISE JURÍDICA
// ==========================================

export interface AnaliseResult {
  conteudo: string;
  dadosEstruturados?: Record<string, unknown>;
  tokensUtilizados?: number;
  modeloUsado: string;
}

/**
 * Prompt base para contexto jurídico
 */
const CONTEXTO_JURIDICO = `
Você é um assistente jurídico especializado em Direito Penal brasileiro, 
com foco especial em atuação da Defensoria Pública. 

Suas análises devem:
- Priorizar a defesa do assistido
- Identificar nulidades e vícios processuais
- Sugerir teses defensivas com base na jurisprudência atual
- Considerar a vulnerabilidade social do assistido
- Manter linguagem técnica mas acessível
- Citar artigos de lei e súmulas quando aplicável
`;

/**
 * Analisa a denúncia de um processo
 */
export async function analisarDenuncia(
  conteudoDenuncia: string,
  contextoCaso?: string
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Analise criticamente a denúncia abaixo, identificando:

1. **TIPIFICAÇÃO**: Crimes imputados e adequação típica
2. **AUTORIA E MATERIALIDADE**: Pontos fracos na demonstração
3. **NULIDADES POTENCIAIS**: Vícios formais ou materiais
4. **TESES DEFENSIVAS**: Sugestões para a defesa
5. **PROVAS AUSENTES**: O que deveria existir e não existe
6. **PONTOS DE ATENÇÃO**: Aspectos críticos para o caso

${contextoCaso ? `## CONTEXTO DO CASO\n${contextoCaso}\n` : ""}

## DENÚNCIA
${conteudoDenuncia}

## FORMATO DA RESPOSTA
Responda em formato estruturado com as seções acima.
Seja objetivo e direto, focando no que é estratégico para a defesa.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Gera sugestões de teses defensivas
 */
export async function gerarTesesDefensivas(
  fatos: string,
  provas: string,
  tipificacao: string
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Com base nos dados abaixo, sugira teses defensivas ordenadas por viabilidade:

## FATOS DO CASO
${fatos}

## PROVAS EXISTENTES
${provas}

## TIPIFICAÇÃO ACUSATÓRIA
${tipificacao}

## FORMATO DA RESPOSTA
Para cada tese, inclua:
1. Nome da tese
2. Fundamento jurídico (artigos, súmulas)
3. Argumentação central
4. Provas necessárias
5. Viabilidade (Alta/Média/Baixa)
6. Jurisprudência de apoio

Ordene da mais viável para a menos viável.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Analisa laudo pericial
 */
export async function analisarLaudo(
  conteudoLaudo: string,
  tipoLaudo: string,
  contextoCaso?: string
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Analise o laudo pericial (${tipoLaudo}) abaixo, identificando:

1. **CONCLUSÕES PRINCIPAIS**: O que o laudo conclui
2. **PONTOS FAVORÁVEIS À DEFESA**: Aspectos que ajudam o réu
3. **PONTOS DESFAVORÁVEIS**: Aspectos prejudiciais
4. **INCONSISTÊNCIAS**: Contradições ou falhas metodológicas
5. **PERGUNTAS PARA ESCLARECIMENTO**: Quesitos a serem formulados
6. **IMPUGNAÇÃO**: Argumentos para impugnar o laudo

${contextoCaso ? `## CONTEXTO DO CASO\n${contextoCaso}\n` : ""}

## LAUDO PERICIAL
${conteudoLaudo}

## FORMATO DA RESPOSTA
Responda de forma estruturada, priorizando o que é útil para a defesa.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Gera resumo estratégico do caso
 */
export async function gerarResumoCaso(
  dadosCaso: {
    assistido: string;
    tipificacao: string;
    fatos: string;
    fase: string;
    provas?: string;
    historico?: string;
  }
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.FLASH, // Mais rápido para resumos
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Gere um resumo estratégico conciso do caso:

## DADOS DO CASO
- **Assistido**: ${dadosCaso.assistido}
- **Tipificação**: ${dadosCaso.tipificacao}
- **Fase**: ${dadosCaso.fase}
${dadosCaso.provas ? `- **Provas**: ${dadosCaso.provas}` : ""}

## FATOS
${dadosCaso.fatos}

${dadosCaso.historico ? `## HISTÓRICO\n${dadosCaso.historico}` : ""}

## FORMATO DA RESPOSTA
Forneça:
1. **RESUMO** (2-3 parágrafos)
2. **SITUAÇÃO ATUAL** (1 parágrafo)
3. **PONTOS CRÍTICOS** (lista)
4. **PRÓXIMOS PASSOS** (lista de prioridades)
5. **RISCO GERAL** (Baixo/Médio/Alto/Crítico)
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.FLASH,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Sugere perguntas para testemunha
 */
export async function sugerirPerguntasTestemunha(
  dadosTestemunha: {
    nome: string;
    tipo: string; // 'defesa' | 'acusacao'
    resumoDepoimento?: string;
    contextoCaso: string;
    teseDefensiva: string;
  }
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Sugira perguntas estratégicas para inquirição da testemunha:

## DADOS DA TESTEMUNHA
- **Nome**: ${dadosTestemunha.nome}
- **Tipo**: ${dadosTestemunha.tipo === "defesa" ? "Testemunha de Defesa" : "Testemunha de Acusação"}
${dadosTestemunha.resumoDepoimento ? `- **Depoimento anterior**: ${dadosTestemunha.resumoDepoimento}` : ""}

## CONTEXTO DO CASO
${dadosTestemunha.contextoCaso}

## TESE DA DEFESA
${dadosTestemunha.teseDefensiva}

## FORMATO DA RESPOSTA
Forneça:
1. **OBJETIVO DA INQUIRIÇÃO** (o que buscar com esta testemunha)
2. **PERGUNTAS INICIAIS** (para estabelecer credibilidade/descrédito)
3. **PERGUNTAS CENTRAIS** (para apoiar a tese)
4. **PERGUNTAS DE REFORÇO** (para fixar pontos importantes)
5. **PERGUNTAS DE IMPUGNAÇÃO** (se testemunha de acusação)
6. **ARMADILHAS A EVITAR** (cuidados na inquirição)

Para cada pergunta, explique brevemente o objetivo.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Analisa riscos do caso para o júri
 */
export async function analisarRiscoJuri(
  dadosCaso: {
    fatos: string;
    provas: string;
    tipificacao: string;
    perfisJurados?: string;
    teseDefensiva: string;
  }
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Analise o caso sob a ótica do Tribunal do Júri:

## DADOS DO CASO
### Tipificação
${dadosCaso.tipificacao}

### Fatos
${dadosCaso.fatos}

### Provas
${dadosCaso.provas}

### Tese Defensiva
${dadosCaso.teseDefensiva}

${dadosCaso.perfisJurados ? `### Perfil dos Jurados\n${dadosCaso.perfisJurados}` : ""}

## FORMATO DA RESPOSTA
Forneça:

1. **ANÁLISE DO CENÁRIO**
   - Pontos fortes da acusação
   - Pontos fortes da defesa
   - Aspectos emocionais do caso

2. **SCORE DE RISCO** (0-100)
   - Justificativa do score

3. **ESTRATÉGIA PARA O PLENÁRIO**
   - Narrativa a ser construída
   - Recursos retóricos sugeridos
   - Ordem de argumentos

4. **QUESITAÇÃO**
   - Sugestões de teses a quesilar
   - Ordem estratégica dos quesitos

5. **PERFIL IDEAL DE JURADO**
   - Características desejáveis
   - Perfis a evitar (recusas peremptórias)

6. **ARGUMENTOS FINAIS**
   - Pontos para o discurso final
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Compara casos similares para insights
 */
export async function compararCasos(
  casoAtual: string,
  casosReferencia: Array<{ titulo: string; resumo: string; resultado: string }>
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const casosFormatados = casosReferencia
    .map((c, i) => `### Caso ${i + 1}: ${c.titulo}\n${c.resumo}\n**Resultado**: ${c.resultado}`)
    .join("\n\n");

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Compare o caso atual com casos de referência para extrair insights:

## CASO ATUAL
${casoAtual}

## CASOS DE REFERÊNCIA
${casosFormatados}

## FORMATO DA RESPOSTA
1. **SEMELHANÇAS IDENTIFICADAS**
   - O que os casos têm em comum

2. **DIFERENÇAS RELEVANTES**
   - O que distingue o caso atual

3. **LIÇÕES APRENDIDAS**
   - O que funcionou nos casos anteriores
   - O que não funcionou

4. **APLICAÇÃO AO CASO ATUAL**
   - Estratégias recomendadas
   - Armadilhas a evitar

5. **PROGNÓSTICO**
   - Tendência de resultado
   - Fatores determinantes
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.PRO,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Chat livre para consultas jurídicas
 */
export async function chatJuridico(
  mensagem: string,
  historicoConversa?: Array<{ role: "user" | "model"; content: string }>
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.FLASH,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: CONTEXTO_JURIDICO,
  });

  const chat = model.startChat({
    history: historicoConversa?.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })) || [],
  });

  const result = await chat.sendMessage(mensagem);
  const response = result.response;
  
  return {
    conteudo: response.text(),
    modeloUsado: GEMINI_MODELS.FLASH,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

/**
 * Extrai texto estruturado de documento
 */
export async function extrairDadosDocumento(
  conteudoTexto: string,
  tipoDocumento: string
): Promise<AnaliseResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODELS.FLASH,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `
Analise o documento do tipo "${tipoDocumento}" abaixo e extraia as informações estruturadas em formato JSON:

## DOCUMENTO
${conteudoTexto}

## INSTRUÇÕES
Extraia:
- Tipo do documento
- Data do documento
- Autor/Órgão responsável
- Partes envolvidas
- Resumo do conteúdo (máximo 3 parágrafos)
- Informações específicas conforme o tipo:
  - Para DENÚNCIA: crimes imputados, fatos narrados, pedidos
  - Para SENTENÇA: dispositivo, pena aplicada, fundamentação resumida
  - Para LAUDO: conclusões, metodologia, peritos
  - Para ATA: data da audiência, presentes, resumo

Responda APENAS com o JSON válido, sem texto adicional.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  let dadosEstruturados: Record<string, unknown> | undefined;
  try {
    dadosEstruturados = JSON.parse(response.text());
  } catch {
    // Se não for JSON válido, retorna como texto
  }

  return {
    conteudo: response.text(),
    dadosEstruturados,
    modeloUsado: GEMINI_MODELS.FLASH,
    tokensUtilizados: response.usageMetadata?.totalTokenCount,
  };
}

// ==========================================
// EXTRAÇÃO DE DADOS DE PDF JURÍDICO (Vision)
// ==========================================

// Tipos de processo para distribuição hierárquica
export type TipoProcesso =
  | "AP"        // Ação Penal - principal, agrupa dependentes
  | "IP"        // Inquérito Policial - dependente da AP
  | "APF"       // Auto de Prisão em Flagrante - dependente da AP
  | "CAUTELAR"  // Medidas cautelares - dependente da AP
  | "EP"        // Execução Penal - independente
  | "MPU"       // Medida Protetiva de Urgência - independente
  | "ANPP"      // Acordo de Não Persecução Penal - independente
  | "OUTRO";    // Outros tipos

// Tipos dependentes (vão dentro de uma AP)
export const TIPOS_DEPENDENTES: TipoProcesso[] = ["IP", "APF", "CAUTELAR"];

// Tipos independentes (ficam no nível raiz do assistido)
export const TIPOS_INDEPENDENTES: TipoProcesso[] = ["AP", "EP", "MPU", "ANPP", "OUTRO"];

export interface ExtracaoPdfResult {
  success: boolean;
  numeroProcesso: string | null;
  orgaoJulgador: string | null;
  classeDemanda: string | null;
  assuntos: string | null;
  assistidos: Array<{ nome: string; papel: string }>;
  tipoDocumento: string | null;
  dataDocumento: string | null;
  resumo: string | null;
  // Novos campos para distribuição inteligente
  tipoProcesso: TipoProcesso | null;
  apRelacionada: string | null; // Número da AP relacionada (se IP/APF/Cautelar)
  textoCompleto?: string;
  tokensUtilizados?: number;
  error?: string;
}

/**
 * Extrai dados estruturados de um PDF jurídico usando Gemini Vision
 *
 * @param pdfBase64 - Conteúdo do PDF em base64
 * @param mimeType - Tipo MIME do arquivo (geralmente 'application/pdf')
 * @returns Dados extraídos estruturados
 */
export async function extrairDadosPdfJuridico(
  pdfBase64: string,
  mimeType: string = "application/pdf"
): Promise<ExtracaoPdfResult> {
  try {
    if (!isGeminiConfigured()) {
      return {
        success: false,
        numeroProcesso: null,
        orgaoJulgador: null,
        classeDemanda: null,
        assuntos: null,
        assistidos: [],
        tipoDocumento: null,
        dataDocumento: null,
        resumo: null,
        tipoProcesso: null,
        apRelacionada: null,
        error: "Gemini API não está configurada",
      };
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      safetySettings: SAFETY_SETTINGS,
    });

    const prompt = `
Você é um extrator de dados de documentos jurídicos brasileiros.
Analise o documento PDF abaixo e extraia TODAS as informações estruturadas.

## INSTRUÇÕES DE EXTRAÇÃO

### 1. NÚMERO DO PROCESSO
Busque padrões como:
- "Número: X.XXXXXXX-XX.XXXX.X.XX.XXXX"
- "Processo: X.XXXXXXX-XX.XXXX.X.XX.XXXX"
- "Autos nº X.XXXXXXX-XX.XXXX.X.XX.XXXX"
Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO

### 2. ÓRGÃO JULGADOR
Busque:
- "Órgão julgador: [NOME]"
- "Vara/Juízo: [NOME]"
- Varas criminais, Tribunal do Júri, VVD, Execução Penal, etc.

### 3. CLASSE DA DEMANDA
Busque:
- "Classe: [NOME]"
- Ação Penal, Inquérito Policial, Execução da Pena, etc.

### 4. ASSUNTOS
Busque:
- "Assuntos: [LISTA]"
- "Assunto: [NOME]"
- Tipos penais: Homicídio, Roubo, Tráfico, etc.

### 5. PARTES (ASSISTIDOS)
Busque nomes de réus, investigados, custodiados, promovidos:
- "NOME COMPLETO (RÉU)"
- "NOME COMPLETO (INVESTIGADO)"
- "NOME COMPLETO (CUSTODIADO)"
- "NOME COMPLETO (PROMOVIDO)"
- "NOME COMPLETO (REQUERIDO)"
- "NOME COMPLETO (AUTOR DO FATO)"
- Tipo: "Promovido" ... Nome: "FULANO"

IMPORTANTE:
- NÃO inclua advogados, defensores, promotores ou juízes
- NÃO inclua "MINISTÉRIO PÚBLICO", "DEFENSORIA", "TRIBUNAL"
- APENAS inclua pessoas físicas que são réus/investigados/etc

### 6. TIPO DO DOCUMENTO
Identifique: Denúncia, Sentença, Decisão, Despacho, Intimação, Ata, Laudo, Certidão, etc.

### 7. DATA DO DOCUMENTO
Extraia a data principal do documento no formato DD/MM/YYYY.

### 8. RESUMO
Faça um resumo de 2-3 frases do conteúdo do documento.

### 9. TIPO DO PROCESSO (MUITO IMPORTANTE!)
Classifique o tipo do processo com base na classe da demanda e contexto:

| Tipo | Quando usar |
|------|-------------|
| AP | Ação Penal, Ação Penal Pública, Denúncia |
| IP | Inquérito Policial, Relatório de Inquérito |
| APF | Auto de Prisão em Flagrante |
| CAUTELAR | Prisão Preventiva, Prisão Temporária, Busca e Apreensão, Interceptação, Medidas Cautelares Diversas |
| EP | Execução Penal, Guia de Execução, PEC (Processo de Execução Criminal) |
| MPU | Medida Protetiva de Urgência (Lei Maria da Penha) |
| ANPP | Acordo de Não Persecução Penal |
| OUTRO | Qualquer outro tipo não listado |

### 10. AÇÃO PENAL RELACIONADA (APENAS para IP, APF ou CAUTELAR)
Se o documento for um IP, APF ou CAUTELAR, busque referências a uma Ação Penal relacionada:
- "Referente à Ação Penal nº ..."
- "Autos da AP ..."
- "... originário da Ação Penal ..."
- Menção a número de processo que seja uma AP

Retorne o número da AP relacionada se encontrar, ou null se não encontrar.

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido, sem markdown ou texto adicional:

{
  "numeroProcesso": "string ou null",
  "orgaoJulgador": "string ou null",
  "classeDemanda": "string ou null",
  "assuntos": "string ou null",
  "assistidos": [
    { "nome": "NOME COMPLETO EM MAIÚSCULAS", "papel": "RÉU|INVESTIGADO|CUSTODIADO|PROMOVIDO|REQUERIDO" }
  ],
  "tipoDocumento": "string ou null",
  "dataDocumento": "DD/MM/YYYY ou null",
  "resumo": "string ou null",
  "tipoProcesso": "AP|IP|APF|CAUTELAR|EP|MPU|ANPP|OUTRO",
  "apRelacionada": "número da AP relacionada ou null"
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: pdfBase64,
        },
      },
      { text: prompt },
    ]);

    const response = result.response;
    const responseText = response.text();

    // Tenta extrair JSON da resposta
    let jsonStr = responseText;

    // Remove possíveis marcadores de código
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Validar tipoProcesso
      const tiposValidos: TipoProcesso[] = ["AP", "IP", "APF", "CAUTELAR", "EP", "MPU", "ANPP", "OUTRO"];
      let tipoProcesso: TipoProcesso | null = null;
      if (parsed.tipoProcesso && tiposValidos.includes(parsed.tipoProcesso)) {
        tipoProcesso = parsed.tipoProcesso as TipoProcesso;
      } else if (parsed.classeDemanda) {
        // Tentar inferir do classeDemanda
        const classe = parsed.classeDemanda.toUpperCase();
        if (classe.includes("AÇÃO PENAL") || classe.includes("DENUNCIA") || classe.includes("DENÚNCIA")) {
          tipoProcesso = "AP";
        } else if (classe.includes("INQUÉRITO") || classe.includes("INQUERITO")) {
          tipoProcesso = "IP";
        } else if (classe.includes("FLAGRANTE") || classe.includes("APF")) {
          tipoProcesso = "APF";
        } else if (classe.includes("EXECUÇÃO") || classe.includes("EXECUCAO") || classe.includes("PEC") || classe.includes("GUIA")) {
          tipoProcesso = "EP";
        } else if (classe.includes("PROTETIVA") || classe.includes("MARIA DA PENHA") || classe.includes("MPU")) {
          tipoProcesso = "MPU";
        } else if (classe.includes("ANPP") || classe.includes("NÃO PERSECUÇÃO") || classe.includes("NAO PERSECUCAO")) {
          tipoProcesso = "ANPP";
        } else if (classe.includes("CAUTELAR") || classe.includes("PREVENTIVA") || classe.includes("TEMPORÁRIA") || classe.includes("TEMPORARIA")) {
          tipoProcesso = "CAUTELAR";
        }
      }

      return {
        success: true,
        numeroProcesso: parsed.numeroProcesso || null,
        orgaoJulgador: parsed.orgaoJulgador || null,
        classeDemanda: parsed.classeDemanda || null,
        assuntos: parsed.assuntos || null,
        assistidos: (parsed.assistidos || []).map((a: { nome?: string; papel?: string }) => ({
          nome: a.nome || "",
          papel: a.papel || "RÉU",
        })),
        tipoDocumento: parsed.tipoDocumento || null,
        dataDocumento: parsed.dataDocumento || null,
        resumo: parsed.resumo || null,
        tipoProcesso,
        apRelacionada: parsed.apRelacionada || null,
        tokensUtilizados: response.usageMetadata?.totalTokenCount,
      };
    } catch (parseError) {
      console.error("Erro ao parsear resposta do Gemini:", parseError);
      console.error("Resposta recebida:", responseText);

      return {
        success: false,
        numeroProcesso: null,
        orgaoJulgador: null,
        classeDemanda: null,
        assuntos: null,
        assistidos: [],
        tipoDocumento: null,
        dataDocumento: null,
        resumo: null,
        tipoProcesso: null,
        apRelacionada: null,
        textoCompleto: responseText,
        error: "Não foi possível estruturar a resposta do Gemini",
      };
    }
  } catch (error) {
    console.error("Erro na extração com Gemini:", error);
    return {
      success: false,
      numeroProcesso: null,
      orgaoJulgador: null,
      classeDemanda: null,
      assuntos: null,
      assistidos: [],
      tipoDocumento: null,
      dataDocumento: null,
      resumo: null,
      tipoProcesso: null,
      apRelacionada: null,
      error: error instanceof Error ? error.message : "Erro desconhecido na extração",
    };
  }
}

/**
 * Extrai dados de PDF a partir de URL do Google Drive
 *
 * @param fileId - ID do arquivo no Google Drive
 * @returns Dados extraídos estruturados
 */
export async function extrairDadosPdfDoDrive(
  fileId: string
): Promise<ExtracaoPdfResult> {
  try {
    // Importa a função de download do Drive
    const { downloadFileContent } = await import("./google-drive");

    // Baixa o conteúdo do arquivo
    const fileContent = await downloadFileContent(fileId);

    if (!fileContent) {
      return {
        success: false,
        numeroProcesso: null,
        orgaoJulgador: null,
        classeDemanda: null,
        assuntos: null,
        assistidos: [],
        tipoDocumento: null,
        dataDocumento: null,
        resumo: null,
        tipoProcesso: null,
        apRelacionada: null,
        error: "Não foi possível baixar o arquivo do Drive",
      };
    }

    // Converte para base64
    const base64Content = Buffer.from(fileContent).toString("base64");

    // Processa com Gemini Vision
    return await extrairDadosPdfJuridico(base64Content, "application/pdf");
  } catch (error) {
    console.error("Erro ao extrair PDF do Drive:", error);
    return {
      success: false,
      numeroProcesso: null,
      orgaoJulgador: null,
      classeDemanda: null,
      assuntos: null,
      assistidos: [],
      tipoDocumento: null,
      dataDocumento: null,
      resumo: null,
      tipoProcesso: null,
      apRelacionada: null,
      error: error instanceof Error ? error.message : "Erro ao baixar ou processar arquivo",
    };
  }
}

// ==========================================
// SIMULAÇÃO DE JULGAMENTO (Júri)
// ==========================================

export interface SimulacaoResultado {
  generatedAt: string;
  cenarios: {
    tipo: "melhor" | "pior" | "provavel";
    descricao: string;
    probabilidade: number;
    resultado: string;
    justificativa: string;
  }[];
  tesesAnalise: {
    titulo: string;
    confianca: number;
    argumentosPromotoria: string[];
    contraArgumentos: string[];
    ordemRecomendada: number;
  }[];
  testemunhasResistencia: {
    nome: string;
    tipo: string;
    resistencia: number;
    pontosVulneraveis: string[];
    perguntasCriticas: string[];
  }[];
  resumoEstrategico: string;
}

/**
 * Gera quesitos para o Tribunal do Júri com base no CPP arts. 482-484.
 *
 * Utiliza FLASH para rapidez. Retorna quesitos obrigatórios (materialidade,
 * autoria, absolvição genérica) + específicos conforme o crime e teses.
 */
export async function gerarQuesitosIA(
  classificacaoCrime: string,
  teses: string[],
  fatosRelevantes: string
): Promise<{
  quesitos: Array<{
    numero: number;
    texto: string;
    tipo: string;
    origem: string;
    argumentacaoSim?: string;
    argumentacaoNao?: string;
    dependeDe?: number | null;
    condicaoPai?: string | null;
  }>;
}> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODELS.FLASH,
    safetySettings: SAFETY_SETTINGS,
  });

  const tesesFormatadas = teses.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Gere os quesitos para sessão do Tribunal do Júri seguindo rigorosamente o CPP (arts. 482 a 484).

## CLASSIFICAÇÃO DO CRIME
${classificacaoCrime}

## TESES DA DEFESA
${tesesFormatadas}

## FATOS RELEVANTES
${fatosRelevantes}

## REGRAS DE QUESITAÇÃO (CPP arts. 482-484)
1. **1º Quesito** — Materialidade: Sempre obrigatório. Pergunta se o fato existiu.
2. **2º Quesito** — Autoria/participação: Sempre obrigatório. Pergunta se o réu concorreu para o fato.
3. **3º Quesito** — Absolvição genérica (art. 483, §2º): SEMPRE obrigatório. "O jurado absolve o acusado?"
4. **Quesitos seguintes** — Causas de diminuição de pena (art. 483, §3º, I): Se aplicável ao crime (ex: homicídio privilegiado, art. 121 §1º CP).
5. **Qualificadoras** (art. 483, §3º, II): Cada qualificadora imputada na pronúncia deve ter quesito próprio.
6. **Causas de aumento** (art. 483, §4º): Se houver majorantes.

## DEPENDÊNCIAS
- Qualificadoras e causas de aumento SÓ são quesitadas se materialidade E autoria forem respondidas SIM.
- Se o 3º quesito (absolvição) for SIM, encerra a votação — os quesitos seguintes ficam prejudicados.
- Causas de diminuição são votadas ANTES das qualificadoras.

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido, sem markdown ou texto adicional:

{
  "quesitos": [
    {
      "numero": 1,
      "texto": "Texto completo do quesito",
      "tipo": "materialidade|autoria|absolvicao|diminuicao|qualificadora|aumento|privilegio|especial",
      "origem": "art. 483 CPP|art. 121 §1º CP|pronúncia|defesa",
      "argumentacaoSim": "O que significa uma resposta SIM (para orientação do defensor)",
      "argumentacaoNao": "O que significa uma resposta NÃO (para orientação do defensor)",
      "dependeDe": null,
      "condicaoPai": null
    }
  ]
}

IMPORTANTE:
- Adapte os quesitos ao crime específico (homicídio, latrocínio, etc.)
- Inclua teses da defesa como quesitos quando aplicável
- Mantenha a numeração sequencial
- O campo "dependeDe" indica o número do quesito-pai (null se independente)
- O campo "condicaoPai" indica a resposta necessária do pai ("SIM" ou "NÃO")
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  // Strip markdown code fences if present
  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      quesitos: (parsed.quesitos || []).map((q: any) => ({
        numero: q.numero,
        texto: q.texto || "",
        tipo: q.tipo || "especial",
        origem: q.origem || "",
        argumentacaoSim: q.argumentacaoSim || undefined,
        argumentacaoNao: q.argumentacaoNao || undefined,
        dependeDe: q.dependeDe ?? null,
        condicaoPai: q.condicaoPai ?? null,
      })),
    };
  } catch (parseError) {
    console.error("Erro ao parsear quesitos do Gemini:", parseError);
    console.error("Resposta recebida:", responseText);
    throw new Error("Não foi possível interpretar a resposta da IA para geração de quesitos");
  }
}

/**
 * Simula um julgamento no Tribunal do Júri, gerando cenários, análise de teses,
 * resistência de testemunhas e resumo estratégico.
 *
 * Utiliza PRO para análise profunda e raciocínio complexo.
 */
export async function simularJulgamentoIA(contexto: {
  fatos: string;
  teses: Array<{ titulo: string; descricao: string; tipo: string }>;
  testemunhas: Array<{ nome: string; tipo: string; depoimento: string; contradicoes?: string }>;
  provas: string;
  juizPerfil?: string;
  promotorPerfil?: string;
  classificacaoCrime: string;
}): Promise<SimulacaoResultado> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODELS.PRO,
    safetySettings: SAFETY_SETTINGS,
  });

  const tesesFormatadas = contexto.teses
    .map((t, i) => `${i + 1}. **${t.titulo}** (${t.tipo}): ${t.descricao}`)
    .join("\n");

  const testemunhasFormatadas = contexto.testemunhas
    .map(
      (t, i) =>
        `${i + 1}. **${t.nome}** (${t.tipo})\n   Depoimento: ${t.depoimento}${t.contradicoes ? `\n   Contradições: ${t.contradicoes}` : ""}`,
    )
    .join("\n\n");

  const prompt = `
${CONTEXTO_JURIDICO}

## TAREFA
Realize uma simulação completa de julgamento no Tribunal do Júri. Analise todos os dados abaixo e produza uma análise estratégica detalhada para a defesa.

## DADOS DO CASO

### Classificação do Crime
${contexto.classificacaoCrime}

### Fatos
${contexto.fatos}

### Provas
${contexto.provas}

### Teses da Defesa
${tesesFormatadas}

### Testemunhas
${testemunhasFormatadas}

${contexto.juizPerfil ? `### Perfil do Juiz-Presidente\n${contexto.juizPerfil}` : ""}
${contexto.promotorPerfil ? `### Perfil do Promotor\n${contexto.promotorPerfil}` : ""}

## ANÁLISE SOLICITADA

Produza uma análise completa contendo:

1. **CENÁRIOS** — Três cenários (melhor, pior, mais provável) com probabilidades realistas que somem aproximadamente 100%.

2. **ANÁLISE DE TESES** — Para cada tese da defesa:
   - Nível de confiança (0-100)
   - Argumentos prováveis da promotoria contra a tese
   - Contra-argumentos sugeridos para a defesa
   - Ordem recomendada de apresentação (1 = apresentar primeiro)

3. **RESISTÊNCIA DE TESTEMUNHAS** — Para cada testemunha:
   - Nível de resistência ao cross-examination (0-100, onde 100 = muito resistente)
   - Pontos vulneráveis no depoimento
   - Perguntas críticas que a defesa deve fazer

4. **RESUMO ESTRATÉGICO** — Texto consolidado com a estratégia recomendada para o plenário.

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido, sem markdown ou texto adicional:

{
  "generatedAt": "ISO 8601 timestamp",
  "cenarios": [
    {
      "tipo": "melhor|pior|provavel",
      "descricao": "Descrição detalhada do cenário",
      "probabilidade": 30,
      "resultado": "Resultado provável (ex: Absolvição, Condenação simples, Desclassificação)",
      "justificativa": "Fundamentação detalhada"
    }
  ],
  "tesesAnalise": [
    {
      "titulo": "Nome da tese",
      "confianca": 75,
      "argumentosPromotoria": ["Argumento 1", "Argumento 2"],
      "contraArgumentos": ["Contra-argumento 1", "Contra-argumento 2"],
      "ordemRecomendada": 1
    }
  ],
  "testemunhasResistencia": [
    {
      "nome": "Nome",
      "tipo": "acusação|defesa|informante",
      "resistencia": 60,
      "pontosVulneraveis": ["Ponto 1", "Ponto 2"],
      "perguntasCriticas": ["Pergunta 1?", "Pergunta 2?"]
    }
  ],
  "resumoEstrategico": "Texto com a estratégia consolidada para o plenário"
}

IMPORTANTE:
- Seja realista nas probabilidades e confiança
- Priorize a perspectiva da defesa, mas considere os argumentos da acusação
- As perguntas críticas devem ser formuladas de forma estratégica
- O resumo estratégico deve ser acionável e direto
- Se não houver testemunhas, retorne array vazio para testemunhasResistencia
- Use a data atual como generatedAt
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  // Strip markdown code fences if present
  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      cenarios: (parsed.cenarios || []).map((c: any) => ({
        tipo: c.tipo || "provavel",
        descricao: c.descricao || "",
        probabilidade: typeof c.probabilidade === "number" ? c.probabilidade : 0,
        resultado: c.resultado || "",
        justificativa: c.justificativa || "",
      })),
      tesesAnalise: (parsed.tesesAnalise || []).map((t: any) => ({
        titulo: t.titulo || "",
        confianca: typeof t.confianca === "number" ? t.confianca : 0,
        argumentosPromotoria: Array.isArray(t.argumentosPromotoria) ? t.argumentosPromotoria : [],
        contraArgumentos: Array.isArray(t.contraArgumentos) ? t.contraArgumentos : [],
        ordemRecomendada: typeof t.ordemRecomendada === "number" ? t.ordemRecomendada : 0,
      })),
      testemunhasResistencia: (parsed.testemunhasResistencia || []).map((w: any) => ({
        nome: w.nome || "",
        tipo: w.tipo || "",
        resistencia: typeof w.resistencia === "number" ? w.resistencia : 0,
        pontosVulneraveis: Array.isArray(w.pontosVulneraveis) ? w.pontosVulneraveis : [],
        perguntasCriticas: Array.isArray(w.perguntasCriticas) ? w.perguntasCriticas : [],
      })),
      resumoEstrategico: parsed.resumoEstrategico || "",
    };
  } catch (parseError) {
    console.error("Erro ao parsear simulação do Gemini:", parseError);
    console.error("Resposta recebida:", responseText);
    throw new Error("Não foi possível interpretar a resposta da IA para simulação de julgamento");
  }
}
