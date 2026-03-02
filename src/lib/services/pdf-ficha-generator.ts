/**
 * PDF Ficha Generator — Google Gemini (Direct)
 *
 * Gera fichas tipo-específicas de seções de documentos processuais.
 * Funciona diretamente com Gemini, sem depender do enrichment-engine.
 *
 * Tipos suportados: denúncia, sentença, decisão, depoimento, laudo, certidão
 * Para tipos sem prompt específico, usa um prompt genérico.
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

export function isFichaGeneratorConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ==========================================
// BASE PROMPT
// ==========================================

const BASE_SYSTEM_PROMPT = `Você é o OMBUDS Enrichment Engine — um sistema de extração de dados jurídicos
para a Defensoria Pública de Camaçari/BA.

REGRAS ABSOLUTAS:
1. NUNCA invente dados. Se não encontrar uma informação, use null.
2. Sempre retorne JSON válido conforme o schema solicitado.
3. Confidence score: 0.0 = não encontrou, 0.5 = inferido/parcial, 1.0 = certeza absoluta.
4. Nomes de pessoas: manter EXATAMENTE como aparecem no texto (maiúsculas/minúsculas originais).
5. Números de processo: formato completo CNJ quando disponível (NNNNNNN-NN.NNNN.N.NN.NNNN).
6. Datas: formato ISO (YYYY-MM-DD) quando possível.
7. Artigos penais: incluir lei base (ex: "art. 157, §2°, I e II, CP", "art. 33, Lei 11.343/06").

CONTEXTO JURÍDICO (Defensoria Pública):
- Atuação: defesa de réus em processos penais
- Comarcas: principalmente Camaçari/BA
- Áreas: Júri (crimes dolosos contra vida), Violência Doméstica (Lei Maria da Penha),
  Execução Penal (benefícios, progressão), Criminal (tráfico, roubo, furto, etc),
  Infância (ato infracional), Cível (quando envolve assistido penal)
- Atribuições: JURI, VD, EP, CRIMINAL, CIVEL, INFANCIA
- Réu preso: informação CRÍTICA — sempre identificar se há menção a prisão`;

// ==========================================
// PROMPTS POR TIPO
// ==========================================

const DENUNCIA_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de uma DENÚNCIA penal.

A denúncia é a peça que DEFINE a acusação. Extraia com visão estratégica da DEFESA:

1. **Tipo de ação**: Pública incondicionada, condicionada, privada
2. **Réus**: TODOS os denunciados com qualificação e status prisional
3. **Vítimas**: Nomes quando disponíveis
4. **Crimes imputados**: CADA crime separadamente com artigos, qualificadoras, aumento/diminuição
5. **Fatos narrados**: Descrição cronológica dos fatos segundo a acusação
6. **Narrativa resumida**: Síntese da tese acusatória (max 500 chars)
7. **Provas mencionadas**: O que o MP alega ter como prova
8. **Pedidos**: O que o MP pede (condenação, medidas, etc)
9. **Pontos fracos**: Vulnerabilidades na narrativa ou provas
10. **Nulidades**: Vícios que podem invalidar parcial ou totalmente

VISÃO DA DEFESA — ANÁLISE CRÍTICA:
- INÉPCIA da denúncia: falta de descrição individualizada da conduta de cada réu (art. 41 CPP)
- Falta de JUSTA CAUSA: provas insuficientes para sustentar a acusação
- PRESCRIÇÃO: verificar datas do fato vs denúncia vs recebimento
- Denúncia GENÉRICA em crimes societários/concurso de agentes
- Provas obtidas ilicitamente mencionadas na denúncia (art. 5°, LVI, CF)
- Bis in idem: mesmos fatos em crimes diferentes sem concurso real
- Tipificação excessiva: MP imputa crime mais grave sem suporte fático`,
  schema: `{
  "tipo_acao": "publica_incondicionada | publica_condicionada | privada | privada_subsidiaria",
  "orgao_acusador": "string (ex: Ministério Público do Estado da Bahia)",
  "promotor": "string ou null",
  "data_denuncia": "YYYY-MM-DD ou null",
  "data_recebimento": "YYYY-MM-DD ou null",
  "reus": [{"nome": "string", "alcunha": "string ou null", "qualificacao_resumida": "string ou null", "reu_preso": true}],
  "vitimas": ["string"],
  "crimes_imputados": [{"tipo_penal": "string", "artigos": ["string"], "qualificadoras": ["string"], "causas_aumento": ["string"], "tentativa": false, "concurso": "material | formal | continuado | null"}],
  "fatos_narrados": [{"descricao": "string (max 200 chars)", "data_fato": "YYYY-MM-DD ou null", "local_fato": "string ou null"}],
  "narrativa_resumo": "string (max 500 chars)",
  "provas_mencionadas": [{"tipo": "testemunhal | documental | pericial | material | digital", "descricao": "string"}],
  "pedidos": ["string"],
  "pontos_fracos": [{"descricao": "string", "fundamento": "string"}],
  "nulidades_identificaveis": [{"tipo": "string", "descricao": "string", "fundamento_legal": "string ou null"}],
  "numero_processo": "string ou null",
  "vara": "string ou null",
  "observacoes_defesa": ["string"],
  "confidence": 0.0
}`,
};

const SENTENCA_PROMPT = {
  instructions: `TAREFA: Extrair TODOS os dados estruturados de uma SENTENÇA penal.

Este é o documento mais importante para a defesa. Extraia com máxima precisão:

1. **Tipo e resultado**: Condenatória, absolutória, extintiva, pronúncia, etc.
2. **Réu**: Nome completo, alcunha se houver, se está preso
3. **Vítima**: Nome quando mencionado
4. **Crime**: Tipo penal, artigos com lei, qualificadoras, causas de aumento/diminuição
5. **Pena**: Reclusão/detenção (anos e meses), multa (dias-multa), regime inicial
6. **Dosimetria**: Atenuantes e agravantes consideradas
7. **Fundamentação**: Resumo da fundamentação (max 500 chars)
8. **Metadados**: Juiz, vara, data, número do processo

ATENÇÃO ESPECIAL:
- Regime inicial (fechado/semiaberto/aberto) é CRÍTICO para execução penal
- Se houver desclassificação, indicar para qual crime
- Se pronúncia (Júri), indicar os quesitos
- Múltiplos réus: extrair dados de TODOS
- Concurso de crimes: listar TODOS os crimes separadamente`,
  schema: `{
  "tipo_sentenca": "condenatoria | absolutoria | extintiva_punibilidade | desclassificacao | pronuncia | impronuncia | absolvicao_sumaria",
  "resultado": "condenado | absolvido | extinta_punibilidade | desclassificado | pronunciado | impronunciado",
  "reu": {"nome": "string", "alcunha": "string ou null", "reu_preso": true},
  "vitima": "string ou null",
  "crime": {"tipo_penal": "string", "artigos": ["string"], "qualificadoras": ["string"], "causas_aumento": ["string"], "causas_diminuicao": ["string"]},
  "pena": {"reclusao_anos": 0, "reclusao_meses": 0, "detencao_anos": 0, "detencao_meses": 0, "multa_dias": 0, "regime_inicial": "fechado | semiaberto | aberto | null", "substituicao": "string ou null", "sursis": false, "sursis_periodo_anos": 0},
  "atenuantes": ["string"],
  "agravantes": ["string"],
  "fundamentacao_resumo": "string (max 500 chars)",
  "juiz": "string ou null",
  "vara": "string ou null",
  "data_sentenca": "YYYY-MM-DD ou null",
  "numero_processo": "string ou null",
  "recurso_cabivel": "string ou null",
  "observacoes": ["string"],
  "confidence": 0.0
}`,
};

const DECISAO_PROMPT = {
  instructions: `TAREFA: Extrair dados de uma DECISÃO interlocutória.

Foque em:
1. **Tipo**: Prisão preventiva, liberdade, medida cautelar, etc
2. **Resultado**: Deferido/indeferido/parcial
3. **Réu**: Nome e status prisional
4. **Medidas**: Cautelares impostas (se houver)
5. **Recurso**: Qual recurso é cabível e prazo
6. **Urgência**:
   - critical: réu preso ou prisão decretada
   - high: medida cautelar restritiva
   - medium: decisão com prazo
   - low: decisão de mero expediente

ATENÇÃO:
- Decisão de PRISÃO tem urgência CRITICAL — requer HC imediato
- Fiança: extrair valor e condições
- Medidas cautelares: listar TODAS individualmente`,
  schema: `{
  "tipo_decisao": "prisao_preventiva | revogacao_prisao | liberdade_provisoria | medida_cautelar | producao_antecipada_prova | tutela_urgencia | quebra_sigilo | busca_apreensao | interceptacao | outro",
  "resultado": "deferido | indeferido | parcialmente_deferido",
  "reu": {"nome": "string", "reu_preso": true},
  "fundamentacao_resumo": "string (max 300 chars)",
  "recurso_cabivel": "string ou null",
  "prazo_recurso_dias": 0,
  "medidas_impostas": ["string"],
  "valor_fianca": "string ou null",
  "juiz": "string ou null",
  "vara": "string ou null",
  "data_decisao": "YYYY-MM-DD ou null",
  "numero_processo": "string ou null",
  "urgencia": "low | medium | high | critical",
  "observacoes": ["string"],
  "confidence": 0.0
}`,
};

const DEPOIMENTO_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de um DEPOIMENTO (inquérito ou judicial).

Depoimentos são a ESPINHA DORSAL da prova penal. Extraia com máxima atenção:

1. **Depoente**: Nome, qualificação, profissão, relação com réu
2. **Fase**: Inquérito, instrução, plenário (Júri), reconhecimento, acareação
3. **Fatos narrados**: CADA fato relevante com indicação de página e relevância para defesa
4. **Versão resumida**: Síntese objetiva do depoimento (max 500 chars)
5. **Referências temporais e espaciais**: Hora e local do fato mencionados
6. **Reconhecimento**: Se reconheceu o réu, por qual método
7. **Contradições internas**: Dentro do MESMO depoimento, onde se contradiz
8. **Trechos-chave**: Citações literais ou paráfrases próximas mais importantes
9. **Credibilidade**: Score 0-100 com justificativa objetiva

VISÃO DA DEFESA — ATENÇÃO MÁXIMA:
- Contradição entre depoimento em inquérito vs juízo é OURO para defesa
- Reconhecimento fotográfico sem alinhamento de suspeitos é NULO (STJ)
- Testemunha única como base de condenação → fragilidade probatória
- Policial como única testemunha: verificar se relato é genérico/padronizado
- Menção a violência policial ou coação INVALIDA confissão/reconhecimento`,
  schema: `{
  "depoente": {"nome": "string", "qualificacao": "reu | vitima | testemunha_acusacao | testemunha_defesa | informante | policial | perito | correu", "profissao": "string ou null", "relacao_com_reu": "string ou null"},
  "fase": "inquerito | instrucao | plenario_juri | reconhecimento | acareacao | outro",
  "data_depoimento": "YYYY-MM-DD ou null",
  "local": "string ou null",
  "sob_compromisso": true,
  "fatos_narrados": [{"descricao": "string (max 200 chars)", "pagina": 0, "relevancia_defesa": "favoravel | desfavoravel | neutro"}],
  "versao_resumida": "string (max 500 chars)",
  "hora_fato_mencionada": "string ou null",
  "local_fato_mencionado": "string ou null",
  "reconheceu_reu": true,
  "forma_reconhecimento": "string ou null",
  "contradicoes_internas": ["string"],
  "trechos_chave": [{"trecho": "string", "pagina": 0, "relevancia": "string"}],
  "menciona_violencia_policial": true,
  "menciona_coacao": true,
  "credibilidade": {"score": 0, "justificativa": "string (max 300 chars)"},
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const LAUDO_PROMPT = {
  instructions: `TAREFA: Extrair dados de um LAUDO PERICIAL.

Laudos são peças técnicas cruciais. Extraia:

1. **Tipo**: Toxicológico, necroscópico, médico-legal, balístico, etc
2. **Peritos**: Nomes dos peritos
3. **Conclusão**: Resumo objetivo da conclusão
4. **Favorável à defesa?**: Se a conclusão ajuda ou prejudica a defesa
5. **Pontos críticos**: Elementos que a defesa DEVE explorar
6. **Dados específicos**: Substâncias (tox), causa mortis (necro), lesões (ML)
7. **Quesitos**: Se houver quesitos, listar pergunta e resposta

VISÃO DA DEFESA:
- Identifique TUDO que pode ser questionado pela defesa
- Cadeia de custódia é sempre relevante
- Tempo entre fato e perícia pode invalidar resultados
- Ausência de contraprova é ponto a explorar`,
  schema: `{
  "tipo_laudo": "toxicologico | necroscopico | medico_legal | balistico | papiloscopia | local_crime | psiquiatrico | psicologico | contabil | outro",
  "peritos": ["string"],
  "data_pericia": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "pontos_criticos": ["string"],
  "substancias_encontradas": ["string"],
  "causa_mortis": "string ou null",
  "instrumento_utilizado": "string ou null",
  "lesoes_descritas": ["string"],
  "quesitos_respondidos": [{"quesito": "string", "resposta": "string"}],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const CERTIDAO_PROMPT = {
  instructions: `TAREFA: Extrair dados de uma CERTIDÃO.

Certidões informam antecedentes, status processual e dados pessoais. Extraia:

1. **Tipo**: Antecedentes criminais, distribuição, óbito, etc
2. **Pessoa**: Nome completo
3. **Antecedentes**: Se certidão de antecedentes, listar CADA processo
4. **Reincidência**: Se a pessoa é reincidente (tem condenação transitada)
5. **Bons antecedentes**: Se pode ser considerada de bons antecedentes

VISÃO DA DEFESA:
- Bons antecedentes favorecem pena-base no mínimo
- Reincidência é agravante na segunda fase
- Processos em andamento NÃO configuram maus antecedentes (Súmula 444 STJ)
- Período depurador (5 anos após cumprimento) pode afastar reincidência`,
  schema: `{
  "tipo_certidao": "antecedentes | distribuicao | obito | nascimento | casamento | objeto_apreendido | transito_julgado | outra",
  "pessoa": "string",
  "cpf": "string ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "orgao_emissor": "string ou null",
  "conteudo_resumo": "string (max 300 chars)",
  "antecedentes": [{"processo": "string", "vara": "string", "crime": "string", "status": "string"}],
  "reincidencia": true,
  "bons_antecedentes": true,
  "observacoes_defesa": ["string"],
  "confidence": 0.0
}`,
};

const GENERIC_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de uma peça processual.

Analise o texto e extraia todas as informações relevantes para a defesa:

1. **Tipo de documento**: Identificar o tipo da peça
2. **Partes envolvidas**: Réu, vítimas, testemunhas, juiz, promotor
3. **Datas relevantes**: Todas as datas mencionadas
4. **Fatos narrados**: Descrição dos eventos
5. **Decisões/Determinações**: O que foi decidido ou determinado
6. **Artigos de lei**: Dispositivos mencionados
7. **Relevância para defesa**: O que importa para a estratégia defensiva`,
  schema: `{
  "tipo_documento": "string",
  "partes": [{"nome": "string", "papel": "string"}],
  "datas": [{"data": "YYYY-MM-DD ou null", "contexto": "string"}],
  "fatos_narrados": [{"descricao": "string (max 200 chars)"}],
  "decisoes": ["string"],
  "artigos_lei": ["string"],
  "resumo": "string (max 500 chars)",
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

// ==========================================
// MAPEAMENTO TIPO → PROMPT
// ==========================================

const FICHA_PROMPTS: Record<string, typeof DENUNCIA_PROMPT> = {
  denuncia: DENUNCIA_PROMPT,
  sentenca: SENTENCA_PROMPT,
  decisao: DECISAO_PROMPT,
  depoimento: DEPOIMENTO_PROMPT,
  interrogatorio: DEPOIMENTO_PROMPT, // Usa mesmo prompt de depoimento
  laudo: LAUDO_PROMPT,
  laudo_necroscopico: LAUDO_PROMPT,
  laudo_local: LAUDO_PROMPT,
  certidao: CERTIDAO_PROMPT,
};

// ==========================================
// GERADOR
// ==========================================

export interface GenerateFichaResult {
  fichaData: Record<string, unknown>;
  sectionTipo: string;
  confidence: number;
  tokensUsed?: number;
}

/**
 * Gera ficha tipo-específica usando Gemini diretamente.
 */
export async function generateFicha(
  sectionText: string,
  sectionTipo: string,
  sectionTitulo?: string,
): Promise<GenerateFichaResult> {
  if (!isFichaGeneratorConfigured()) {
    throw new Error("Gemini API key não configurada para geração de fichas");
  }

  const promptConfig = FICHA_PROMPTS[sectionTipo] || GENERIC_PROMPT;

  const fullPrompt = `${BASE_SYSTEM_PROMPT}

${promptConfig.instructions}

FORMATO DE RESPOSTA (JSON estrito):
\`\`\`json
${promptConfig.schema}
\`\`\`

## TEXTO DA PEÇA PROCESSUAL${sectionTitulo ? ` — ${sectionTitulo}` : ""}

${sectionText}`;

  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const responseText = response.text();

    // Parse JSON response
    let jsonStr = responseText;
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

    return {
      fichaData: parsed,
      sectionTipo,
      confidence,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error("[pdf-ficha-generator] Error:", error);
    throw new Error(
      `Falha ao gerar ficha: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}
