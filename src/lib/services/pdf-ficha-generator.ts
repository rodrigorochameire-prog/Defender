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

// ─────────────────────────────────────────────
// DEPOIMENTOS — Prompts diferenciados por papel
// ─────────────────────────────────────────────

/**
 * DEPOIMENTO DE TESTEMUNHA (acusação ou defesa)
 * Foco: condições de percepção, hearsay vs presencial, motivação,
 * reconhecimento, contradições, fragilidades probatórias.
 */
const DEPOIMENTO_TESTEMUNHA_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de um DEPOIMENTO DE TESTEMUNHA.

Depoimentos de testemunha são a ESPINHA DORSAL da prova penal. A QUALIDADE da percepção
e a CREDIBILIDADE da testemunha definem condenações ou absolvições. Extraia TUDO:

## IDENTIFICAÇÃO
1. Nome, profissão, relação com réu e vítima
2. Fase processual: inquérito policial, instrução criminal, plenário do Júri
3. Se prestou compromisso legal (art. 203 CPP) — informantes NÃO prestam
4. Se é testemunha da acusação ou da defesa

## PERCEPÇÃO DOS FATOS (DECISIVO)
5. **Tipo de conhecimento** — para CADA fato narrado, classificar:
   - PRESENCIAL: viu/ouviu diretamente os fatos
   - OUVIR-DIZER com FONTE: soube por pessoa identificável ("Fulano me contou")
   - OUVIR-DIZER genérico/BOATO: "o pessoal fala", "todo mundo sabe" (INADMISSÍVEL como prova)
   - INFERÊNCIA: dedução própria sem observação direta ("deve ter sido ele porque...")
6. **Condições de percepção** — CRUCIAIS para impugnar:
   - Iluminação no momento dos fatos (dia/noite/artificial/precária)
   - Distância estimada do fato observado
   - Obstáculos visuais (muros, veículos, vegetação)
   - Tempo de exposição (viu por segundos, minutos, horas?)
   - Estado emocional durante os fatos (medo, pânico, choque)
   - Uso de álcool/drogas no momento dos fatos
   - Tempo decorrido entre o fato e o depoimento (memória degrada)

## RECONHECIMENTO DO RÉU (SE HOUVER)
7. **Método**: show-up, álbum fotográfico, alinhamento presencial, espontâneo
8. **Validade legal**: Se seguiu art. 226 CPP (descrição prévia, alinhamento com semelhantes)
9. **Vício**: Reconhecimento fotográfico SEM alinhamento = NULO (STJ, HC 598.886)
10. **Indução**: Se autoridade sugeriu ou induziu ("é esse aqui?", foto isolada)
11. **Descrição física prévia**: O que disse ANTES de reconhecer (compatível?)

## ANÁLISE PARA A DEFESA
12. **Fatos narrados**: CADA fato relevante com classificação de percepção e relevância
13. **Contradições internas**: Dentro do MESMO depoimento
14. **Trechos-chave**: Citações literais mais importantes (favoráveis E desfavoráveis)
15. **Motivação/interesse**: Animosidade, interesse no resultado, relação com vítima
16. **Fragilidades probatórias**:
    - Testemunha única = fragilidade (princípio da corroboração)
    - Policial como única testemunha com relato genérico/padronizado
    - Contradição inquérito vs juízo = OURO para defesa
    - Hearsay como base da acusação = impugnável
17. **Providências sugeridas**: Ações concretas para o defensor

## PARA CASOS DE JÚRI (se aplicável)
18. Elementos de legítima defesa mencionados
19. Violenta emoção / injusta provocação da vítima
20. Dolo eventual vs culpa consciente (como descreve a intenção do réu?)
21. Participação de menor importância (art. 29 §1° CP)

## PARA VIOLÊNCIA DOMÉSTICA (se aplicável)
22. Tipo de relação com o réu (cônjuge, companheiro, namoro, ex-)
23. Episódios anteriores mencionados
24. Medidas protetivas existentes
25. Indicadores de retratação da vítima (mudança de versão, minimização)`,
  schema: `{
  "depoente": {
    "nome": "string",
    "qualificacao": "testemunha_acusacao | testemunha_defesa | informante | policial_militar | policial_civil | perito | vizinho | familiar_vitima | familiar_reu | outro",
    "profissao": "string ou null",
    "relacao_com_reu": "string ou null",
    "relacao_com_vitima": "string ou null",
    "sob_compromisso": true
  },
  "fase": "inquerito | instrucao | plenario_juri | reconhecimento | acareacao | outro",
  "data_depoimento": "YYYY-MM-DD ou null",
  "local": "string ou null",
  "percepcao": {
    "tipo_predominante": "presencial | ouvir_dizer_fonte | ouvir_dizer_boato | inferencia | misto",
    "iluminacao": "diurna | noturna | artificial | precaria | boa | null",
    "distancia_estimada": "string ou null",
    "obstaculos_visuais": "string ou null",
    "tempo_exposicao": "string ou null",
    "estado_emocional": "string ou null",
    "uso_alcool_drogas": "string ou null",
    "tempo_fato_ao_depoimento": "string ou null"
  },
  "fatos_narrados": [{
    "descricao": "string (max 200 chars)",
    "tipo_percepcao": "presencial | ouvir_dizer_fonte | ouvir_dizer_boato | inferencia",
    "fonte_ouvir_dizer": "string ou null (nome de quem contou)",
    "pagina": 0,
    "relevancia_defesa": "favoravel | desfavoravel | neutro"
  }],
  "versao_resumida": "string (max 500 chars)",
  "hora_fato_mencionada": "string ou null",
  "local_fato_mencionado": "string ou null",
  "reconhecimento": {
    "reconheceu_reu": true,
    "metodo": "show_up | album_fotografico | alinhamento_presencial | espontaneo | nenhum | null",
    "seguiu_art226_cpp": true,
    "descricao_previa_compativel": true,
    "houve_inducao": false,
    "vicios_identificados": ["string"]
  },
  "contradicoes_internas": [{"afirmacao_1": "string", "afirmacao_2": "string", "paginas": "string"}],
  "trechos_chave": [{"trecho": "string", "pagina": 0, "tipo": "favoravel | desfavoravel | hearsay | contradicao | admissao", "motivo": "string"}],
  "motivacao_interesse": {"tem_interesse_no_resultado": false, "animosidade_com_reu": false, "descricao": "string ou null"},
  "menciona_violencia_policial": false,
  "menciona_coacao": false,
  "credibilidade": {"score": 0, "justificativa": "string (max 300 chars)"},
  "fragilidades_probatorias": ["string"],
  "providencias_sugeridas": ["string"],
  "contexto_juri": {
    "menciona_legitima_defesa": false,
    "menciona_violenta_emocao": false,
    "menciona_provocacao_vitima": false,
    "descreve_intencao_reu": "string ou null",
    "participacao_menor_importancia": false
  },
  "contexto_vvd": {
    "tipo_relacao": "string ou null",
    "episodios_anteriores": false,
    "medidas_protetivas_existentes": false,
    "indicadores_retratacao": false
  },
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

/**
 * DEPOIMENTO DE VÍTIMA
 * Foco: credibilidade especial (palavra da vítima tem peso), retratação em VVD,
 * interesse no resultado, condições emocionais, reconhecimento.
 */
const DEPOIMENTO_VITIMA_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de um DEPOIMENTO DE VÍTIMA.

A palavra da vítima tem PESO ESPECIAL no processo penal brasileiro. Em crimes contra a pessoa,
clandestinos (sem testemunhas) e VVD, pode ser a PROVA CENTRAL. Extraia com máxima precisão:

## IDENTIFICAÇÃO
1. Nome, relação com réu, se é a mesma pessoa de outros depoimentos no processo
2. Fase: inquérito, instrução, plenário do Júri

## NARRATIVA DOS FATOS
3. **Versão completa**: O que a vítima diz que aconteceu, na ordem narrada
4. **Detalhes sensoriais**: O que viu, ouviu, sentiu — nível de detalhe indica credibilidade
5. **Localização e horário**: Precisão temporal e espacial
6. **Arma/instrumento**: Tipo descrito, como foi usado
7. **Lesões sofridas**: O que descreve ter sofrido
8. **Motivação do crime**: Por que acha que o réu agiu assim

## RECONHECIMENTO E AUTORIA
9. Já conhecia o réu de antes? Há quanto tempo?
10. Método de reconhecimento (se não conhecia previamente)
11. Descrição física do autor ANTES de qualquer reconhecimento formal
12. Quantas pessoas participaram, segundo a vítima

## CREDIBILIDADE E CONSISTÊNCIA
13. **Coerência interna**: A narrativa é lógica e consistente?
14. **Detalhes periféricos**: Detalhes não centrais que reforçam ou enfraquecem
15. **Mudanças de versão**: Se há versão diferente em outro momento do processo (inquérito vs juízo)
16. **Estado emocional durante o depoimento**: Reações, choro, hesitação
17. **Interesse/motivação**: Animosidade prévia, litígio paralelo, herança, pensão

## PARA A DEFESA — PONTOS A EXPLORAR
18. **Contradições** com outras provas (laudo, BO, outras testemunhas)
19. **Exageros ou impossibilidades** na narrativa
20. **Elementos que favorecem o réu** (legítima defesa, provocação, consentimento)
21. **Fragilidades**: vítima como única prova, reconhecimento viciado, interesse pessoal
22. Fatos que a vítima NÃO viu diretamente (ouvir-dizer)

## VIOLÊNCIA DOMÉSTICA (Lei Maria da Penha)
23. Tipo de relação (cônjuge, companheiro, namoro, ex-, familiar)
24. Duração da relação e da violência
25. Episódios anteriores (quantos, tipo, denunciou antes?)
26. Ciclo de violência: tensão → explosão → lua-de-mel → retratação
27. Dependência financeira/emocional
28. Filhos em comum (exposição, guarda)
29. **Indicadores de retratação**: minimiza fatos, pede para "tirar a queixa", culpa-se,
    muda versão significativamente entre inquérito e juízo
30. Medidas protetivas vigentes (quais, desde quando)

## PARA CASOS DE JÚRI
31. Como descreve a dinâmica da agressão (permitir análise de dolo/culpa)
32. Provocação prévia por parte da vítima
33. Elementos de excesso de legítima defesa`,
  schema: `{
  "depoente": {
    "nome": "string",
    "relacao_com_reu": "string ou null",
    "conhecia_reu_previamente": true,
    "tempo_conhecimento": "string ou null"
  },
  "fase": "inquerito | instrucao | plenario_juri | outro",
  "data_depoimento": "YYYY-MM-DD ou null",
  "narrativa": {
    "versao_resumida": "string (max 600 chars)",
    "detalhes_sensoriais": "alto | medio | baixo | ausente",
    "hora_fato": "string ou null",
    "local_fato": "string ou null",
    "arma_instrumento": "string ou null",
    "lesoes_descritas": ["string"],
    "motivacao_atribuida_reu": "string ou null",
    "numero_agressores": 1
  },
  "autoria": {
    "reconheceu_reu": true,
    "ja_conhecia": true,
    "metodo_reconhecimento": "conhecimento_previo | show_up | album_fotografico | alinhamento | espontaneo | null",
    "descricao_fisica_previa": "string ou null",
    "seguiu_art226_cpp": true
  },
  "fatos_narrados": [{
    "descricao": "string (max 200 chars)",
    "tipo_percepcao": "presencial | ouvir_dizer",
    "pagina": 0,
    "relevancia_defesa": "favoravel | desfavoravel | neutro"
  }],
  "credibilidade": {
    "score": 0,
    "coerencia_interna": "alta | media | baixa",
    "detalhes_perifericos": true,
    "mudanca_versao": false,
    "descricao_mudanca": "string ou null",
    "estado_emocional_depoimento": "string ou null",
    "interesse_no_resultado": false,
    "descricao_interesse": "string ou null",
    "justificativa": "string (max 300 chars)"
  },
  "contradicoes_internas": [{"afirmacao_1": "string", "afirmacao_2": "string"}],
  "trechos_chave": [{"trecho": "string", "pagina": 0, "tipo": "favoravel | desfavoravel | admissao | contradicao", "motivo": "string"}],
  "elementos_favoraveis_defesa": ["string"],
  "fragilidades_probatorias": ["string"],
  "contexto_vvd": {
    "aplicavel": false,
    "tipo_relacao": "conjuge | companheiro | namoro | ex_conjuge | ex_companheiro | ex_namoro | familiar | coabitante | null",
    "duracao_relacao": "string ou null",
    "duracao_violencia": "string ou null",
    "episodios_anteriores": false,
    "quantidade_episodios": 0,
    "denunciou_antes": false,
    "ciclo_violencia_detectado": false,
    "dependencia_financeira": false,
    "dependencia_emocional": false,
    "filhos_em_comum": false,
    "indicadores_retratacao": {
      "minimiza_fatos": false,
      "pede_retirada_queixa": false,
      "culpa_se": false,
      "mudou_versao_significativamente": false,
      "descricao": "string ou null"
    },
    "medidas_protetivas": {"vigentes": false, "quais": ["string"], "desde": "YYYY-MM-DD ou null"}
  },
  "contexto_juri": {
    "descreve_dinamica_agressao": "string ou null",
    "provocacao_previa_vitima": false,
    "excesso_legitima_defesa": false,
    "dolo_ou_culpa_inferido": "dolo_direto | dolo_eventual | culpa_consciente | culpa | incerto | null"
  },
  "providencias_sugeridas": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

/**
 * INTERROGATÓRIO DO RÉU / DEPOIMENTO DO INVESTIGADO
 * Foco: direito ao silêncio, confissão (qualificada?), álibi, coação,
 * autodefesa, tese do réu, elementos para dosimetria.
 */
const INTERROGATORIO_PROMPT = {
  instructions: `TAREFA: Extrair dados estruturados de um INTERROGATÓRIO DO RÉU / DEPOIMENTO DO INVESTIGADO.

O interrogatório é ato de AUTODEFESA, não de prova contra o réu. O réu tem direito constitucional
ao silêncio (art. 5°, LXIII, CF) e NÃO pode ser prejudicado por exercê-lo. Extraia:

## IDENTIFICAÇÃO
1. Nome completo, alcunha, qualificação
2. Se estava PRESO no momento do interrogatório (CRÍTICO)
3. Fase: inquérito policial, instrução, plenário do Júri
4. Se foi informado do direito ao silêncio (obrigatório)
5. Se estava acompanhado de advogado/defensor

## EXERCÍCIO DO DIREITO AO SILÊNCIO
6. Exerceu silêncio total?
7. Exerceu silêncio PARCIAL (respondeu algumas, calou em outras)?
8. Sobre QUAIS perguntas se calou? (mapear o que o réu evitou responder)
9. O silêncio foi respeitado? (pressão do juiz/delegado para responder?)

## CONFISSÃO (SE HOUVER)
10. **Tipo de confissão**:
    - TOTAL: admitiu tudo conforme a denúncia
    - PARCIAL: admitiu parte dos fatos
    - QUALIFICADA: admitiu o fato mas alegou excludente (legítima defesa, estado de necessidade)
    - RETRATADA: confessou em inquérito mas nega em juízo (ou vice-versa)
11. Elementos da confissão: O QUE exatamente admitiu
12. Circunstâncias: Espontânea ou após perguntas insistentes?
13. Se confissão qualificada → QUAL excludente ou justificativa alega?

## VERSÃO DO RÉU (TESE DEFENSIVA)
14. Resumo completo da versão contada pelo réu
15. **Álibi**: Onde diz que estava no momento do fato, com quem
16. **Negativa de autoria**: Nega ter participado
17. **Legítima defesa**: Descreve agressão injusta atual ou iminente pela vítima
18. **Violenta emoção**: Descreve provocação injusta que gerou reação emocional
19. **Desclassificação**: Elementos que sugerem crime menos grave (ex: lesão vs tentativa homicídio)
20. **Participação de menor importância**: Se admite algum envolvimento mas menor
21. **Coação**: Alega ter sido coagido por terceiros
22. **Embriaguez/intoxicação**: Estado no momento dos fatos

## ANÁLISE PARA A DEFESA
23. **Coerência** da versão do réu (score + justificativa)
24. **Trechos-chave**: Exatamente o que disse nos pontos mais relevantes
25. **Contradições internas**: Se se contradiz no mesmo interrogatório
26. **Menção a violência policial** durante captura ou interrogatório anterior
27. **Menção a coação** para confessar
28. **Nulidades**: Falta de defensor, não informação do silêncio, tortura/coação

## DOSIMETRIA (elementos para cálculo da pena)
29. Confissão espontânea → atenuante obrigatória (art. 65, III, d, CP)
30. Menções a arrependimento ou reparação do dano
31. Personalidade/conduta social conforme descrita
32. Motivos do crime conforme narrado pelo réu`,
  schema: `{
  "interrogado": {
    "nome": "string",
    "alcunha": "string ou null",
    "preso_no_momento": true,
    "informado_direito_silencio": true,
    "acompanhado_defensor": true
  },
  "fase": "inquerito | instrucao | plenario_juri | outro",
  "data_interrogatorio": "YYYY-MM-DD ou null",
  "local": "string ou null",
  "silencio": {
    "exerceu_silencio_total": false,
    "exerceu_silencio_parcial": false,
    "perguntas_que_silenciou": ["string"],
    "silencio_respeitado": true
  },
  "confissao": {
    "houve_confissao": false,
    "tipo": "total | parcial | qualificada | retratada | nenhuma",
    "o_que_admitiu": "string ou null",
    "espontanea": true,
    "excludente_alegada": "legitima_defesa | estado_necessidade | estrito_cumprimento | exercicio_regular | inexigibilidade | coacao_moral | null",
    "descricao_excludente": "string ou null"
  },
  "versao_reu": {
    "resumo": "string (max 600 chars)",
    "tese_principal": "negativa_autoria | alibi | legitima_defesa | violenta_emocao | desclassificacao | participacao_menor | coacao | outra | silencio_total",
    "alibi": {"alegou": false, "onde_estava": "string ou null", "com_quem": "string ou null", "verificavel": true},
    "legitima_defesa": {"alegou": false, "agressao_descrita": "string ou null", "meio_utilizado": "string ou null", "proporcional": true},
    "violenta_emocao": {"alegou": false, "provocacao_descrita": "string ou null"},
    "embriaguez_intoxicacao": {"mencionou": false, "tipo": "alcool | drogas | ambos | null", "grau": "string ou null"}
  },
  "fatos_narrados": [{
    "descricao": "string (max 200 chars)",
    "pagina": 0,
    "relevancia_defesa": "favoravel | desfavoravel | neutro"
  }],
  "coerencia": {"score": 0, "justificativa": "string (max 300 chars)"},
  "contradicoes_internas": [{"afirmacao_1": "string", "afirmacao_2": "string"}],
  "trechos_chave": [{"trecho": "string", "pagina": 0, "tipo": "favoravel | desfavoravel | confissao | negativa | silencio", "motivo": "string"}],
  "menciona_violencia_policial": false,
  "menciona_coacao_confissao": false,
  "detalhes_violencia_coacao": "string ou null",
  "nulidades_identificadas": [{"tipo": "string", "descricao": "string", "fundamento_legal": "string"}],
  "dosimetria": {
    "confissao_espontanea_atenuante": false,
    "arrependimento_mencionado": false,
    "reparacao_dano_mencionada": false,
    "motivos_crime_narrados": "string ou null"
  },
  "providencias_sugeridas": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

// Alias — depoimento genérico usa o prompt de testemunha como base
const DEPOIMENTO_PROMPT = DEPOIMENTO_TESTEMUNHA_PROMPT;

// ─────────────────────────────────────────────
// LAUDOS — Prompts especializados por tipo forense
// ─────────────────────────────────────────────

/** Base para todos os laudos — campos comuns */
const LAUDO_BASE_INSTRUCTIONS = `VISÃO DA DEFESA — SEMPRE ANALISE:
- CADEIA DE CUSTÓDIA: Material foi corretamente apreendido, lacrado, transportado e armazenado? (art. 158-A a 158-F CPP)
- TEMPO: Intervalo entre o fato e a perícia pode degradar evidências
- PERITO: É oficial? Possui habilitação específica? Assinou sozinho?
- CONTRAPROVA: Defesa teve oportunidade de requerer nova perícia? (art. 159 §5° CPP)
- QUESITOS da defesa: Foram respondidos? Respostas evasivas?
- MÉTODO: Técnica utilizada é aceita cientificamente?
- CONCLUSÃO vs DADOS: A conclusão é sustentada pelos dados apresentados?`;

const LAUDO_PROMPT = {
  instructions: `TAREFA: Extrair dados de um LAUDO PERICIAL (genérico).

${LAUDO_BASE_INSTRUCTIONS}

Extraia: tipo, peritos, conclusão, dados específicos, quesitos, pontos para a defesa.`,
  schema: `{
  "tipo_laudo": "toxicologico | necroscopico | medico_legal | balistico | papiloscopia | local_crime | psiquiatrico | psicologico | contabil | grafotecnico | dna | outro",
  "peritos": [{"nome": "string", "matricula": "string ou null", "oficial": true}],
  "data_pericia": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "material_examinado": "string ou null",
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "cadeia_custodia": {"mencionada": false, "integra": true, "vicios": ["string"]},
  "pontos_criticos": ["string"],
  "quesitos_respondidos": [{"quesito": "string", "resposta": "string", "origem": "juiz | mp | defesa | assistente"}],
  "substancias_encontradas": ["string"],
  "causa_mortis": "string ou null",
  "instrumento_utilizado": "string ou null",
  "lesoes_descritas": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const LAUDO_NECROSCOPICO_PROMPT = {
  instructions: `TAREFA: Extrair dados de um LAUDO NECROSCÓPICO / EXAME CADAVÉRICO.

Este laudo define a CAUSA DA MORTE e o MEIO empregado — central em homicídios e Júri.

1. **Causa mortis**: Exata como descrita (ex: "hemorragia interna por lesão transfixante de aorta")
2. **Meio/instrumento**: Arma de fogo, arma branca, asfixia, envenenamento, etc.
3. **Número de lesões**: Quantidade, localização anatômica, trajeto (entrada/saída)
4. **Lesões de defesa**: Lesões em mãos/braços que indicam tentativa de se proteger
5. **Posição provável**: Se possível inferir posição da vítima e do agressor
6. **Sinais vitais**: Intervalo entre lesão e morte (imediata? minutos? horas?)
7. **Exames complementares**: Toxicológico do cadáver, DNA sob unhas, etc.
8. **Data/hora estimada da morte**: "cronotanatognose"

${LAUDO_BASE_INSTRUCTIONS}

PARA O JÚRI:
- Número e localização das lesões indicam DOLO DIRETO (golpes reiterados) ou pode ser DOLO EVENTUAL?
- Lesões de defesa sugerem LUTA, o que pode sustentar legítima defesa
- Causa mortis compatível com DESCLASSIFICAÇÃO? (ex: lesão leve → morte por complicação)
- Sinais de embriaguez no cadáver? Toxicologia?`,
  schema: `{
  "tipo_laudo": "necroscopico",
  "peritos": [{"nome": "string", "matricula": "string ou null", "oficial": true}],
  "data_pericia": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "vitima": "string ou null",
  "causa_mortis": "string",
  "causa_mortis_detalhada": "string (descricao tecnica completa)",
  "meio_instrumento": "arma_fogo | arma_branca | asfixia | envenenamento | contusao | queimadura | outro",
  "meio_descricao": "string ou null",
  "lesoes": [{
    "descricao": "string",
    "localizacao_anatomica": "string",
    "trajeto": "string ou null",
    "tipo": "entrada | saida | transfixante | contusa | incisa | perfurante | outro"
  }],
  "numero_lesoes": 0,
  "lesoes_de_defesa": {"presentes": false, "descricao": "string ou null"},
  "posicao_vitima_agressor": "string ou null",
  "intervalo_lesao_morte": "string ou null",
  "cronotanatognose": "string ou null",
  "exames_complementares": [{"tipo": "string", "resultado": "string"}],
  "toxicologia_cadaver": {"realizado": false, "resultado": "string ou null"},
  "cadeia_custodia": {"mencionada": false, "integra": true, "vicios": ["string"]},
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "elementos_juri": {
    "sugere_dolo_direto": false,
    "compativel_dolo_eventual": false,
    "compativel_desclassificacao": false,
    "lesoes_defesa_sustentam_legitima_defesa": false,
    "descricao": "string ou null"
  },
  "pontos_criticos": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const LAUDO_MEDICO_LEGAL_PROMPT = {
  instructions: `TAREFA: Extrair dados de um EXAME DE CORPO DE DELITO / LAUDO MÉDICO-LEGAL.

Define a MATERIALIDADE do crime e a EXTENSÃO das lesões — tipificação depende disso.

1. **Lesões**: Cada lesão com localização, tipo, gravidade
2. **Classificação**: Leve (art. 129 caput), grave (§1°), gravíssima (§2°), seguida de morte (§3°)
3. **Incapacidade**: Temporária ou permanente, dias de afastamento
4. **Debilidade/perda**: De membro, sentido ou função
5. **Instrumento provável**: Compatível com o alegado pela vítima?
6. **Data das lesões vs data do exame**: Quanto tempo depois? Lesões podem ter diminuído
7. **Cicatrizes**: Antigas vs recentes (episódios anteriores em VVD)

${LAUDO_BASE_INSTRUCTIONS}

PARA VIOLÊNCIA DOMÉSTICA:
- Lesões compatíveis com a narrativa da vítima?
- Lesões antigas que sugerem violência habitual?
- Gravidade real vs tipificação (muitas vezes MP tipifica como grave sem suporte pericial)`,
  schema: `{
  "tipo_laudo": "medico_legal",
  "peritos": [{"nome": "string", "matricula": "string ou null"}],
  "data_exame": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "examinado": "string ou null",
  "lesoes": [{
    "descricao": "string",
    "localizacao_anatomica": "string",
    "tipo": "contusa | incisa | perfurante | escoriacao | equimose | hematoma | fratura | queimadura | outro",
    "gravidade_estimada": "leve | grave | gravissima",
    "antiga_ou_recente": "recente | antiga | indeterminada"
  }],
  "classificacao_lesao": "leve | grave | gravissima | seguida_morte",
  "incapacidade": {"temporaria": false, "permanente": false, "dias_afastamento": 0},
  "debilidade_perda": {"membro": false, "sentido": false, "funcao": false, "descricao": "string ou null"},
  "deformidade_permanente": false,
  "perigo_vida": false,
  "instrumento_provavel": "string ou null",
  "lesoes_antigas_detectadas": false,
  "descricao_lesoes_antigas": "string ou null",
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "compativel_narrativa_vitima": true,
  "cadeia_custodia": {"mencionada": false, "integra": true, "vicios": ["string"]},
  "pontos_criticos": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const LAUDO_TOXICOLOGICO_PROMPT = {
  instructions: `TAREFA: Extrair dados de um LAUDO TOXICOLÓGICO.

Em crimes de tráfico (Lei 11.343/06), este laudo é a PROVA DA MATERIALIDADE — sem ele não há crime.

1. **Substância identificada**: Nome técnico e popular
2. **Quantidade**: Peso bruto e líquido
3. **Natureza do material**: Vegetal, pó, cristal, líquido, comprimido
4. **Metodologia**: Teste presuntivo vs definitivo
5. **Lacre/cadeia de custódia**: Se material estava lacrado, número do lacre

${LAUDO_BASE_INSTRUCTIONS}

PARA A DEFESA EM TRÁFICO:
- Laudo PROVISÓRIO (teste de campo) NÃO substitui laudo DEFINITIVO
- Quantidade é CRUCIAL para distinguir tráfico (art. 33) de uso pessoal (art. 28)
- Cadeia de custódia quebrada → nulidade da prova (art. 158-A CPP)
- Peso BRUTO vs LÍQUIDO: embalagem inflaciona quantidade
- Substância NÃO é listada na Portaria 344/ANVISA? → atipicidade`,
  schema: `{
  "tipo_laudo": "toxicologico",
  "tipo_exame": "definitivo | provisorio | presuntivo",
  "peritos": [{"nome": "string", "matricula": "string ou null"}],
  "data_pericia": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "substancias": [{
    "nome_tecnico": "string",
    "nome_popular": "string ou null",
    "listada_portaria_344": true,
    "classificacao": "entorpecente | psicotropico | precursor | nao_listada"
  }],
  "quantidade": {
    "peso_bruto": "string ou null",
    "peso_liquido": "string ou null",
    "unidade": "gramas | kg | ml | unidades | null",
    "natureza_material": "vegetal | po | cristal | liquido | comprimido | papel | outro"
  },
  "lacre": {"numero": "string ou null", "integro": true, "violado": false},
  "cadeia_custodia": {"mencionada": false, "integra": true, "vicios": ["string"]},
  "metodologia": "string ou null",
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "compativel_uso_pessoal": false,
  "pontos_criticos": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const MIDIA_MENSAGENS_PROMPT = {
  instructions: `TAREFA: Extrair dados de PRINTS/CAPTURAS DE MENSAGENS (WhatsApp, Telegram, SMS, Instagram, etc).

Provas digitais são cada vez mais centrais. Extraia TUDO que é relevante para a defesa.

1. **Plataforma**: WhatsApp, Telegram, Instagram DM, SMS, Facebook, email, etc
2. **Participantes**: Quem são os interlocutores (nomes, números, perfis)
3. **Período**: Datas e horários das mensagens (primeira e última)
4. **Conteúdo relevante**: Trechos que impactam o caso
5. **Contexto**: A conversa é ANTES, DURANTE ou DEPOIS dos fatos?
6. **Autenticidade**: Há sinais de edição, montagem, mensagens apagadas?

VISÃO DA DEFESA:
- Prints SEM ata notarial ou perícia podem ser impugnados (falsificação é fácil)
- Mensagens OBTIDAS SEM AUTORIZAÇÃO judicial = prova ilícita (interceptação)
- Acesso ao celular SEM mandado específico = nulidade (STF, RE 1.055.941)
- Contexto IMPORTA: mensagem isolada pode distorcer o sentido
- Mensagens apagadas ou fora de sequência sugerem seleção tendenciosa
- Prints de terceiros (quem tirou?) → cadeia de custódia digital`,
  schema: `{
  "plataforma": "whatsapp | telegram | sms | instagram | facebook | email | outro",
  "participantes": [{"identificacao": "string", "papel_no_caso": "reu | vitima | testemunha | terceiro | desconhecido"}],
  "periodo": {"primeira_mensagem": "YYYY-MM-DD HH:mm ou null", "ultima_mensagem": "YYYY-MM-DD HH:mm ou null"},
  "relacao_temporal_fatos": "antes | durante | depois | misto | indeterminado",
  "trechos_relevantes": [{"conteudo": "string (max 200 chars)", "remetente": "string", "data_hora": "string ou null", "relevancia_defesa": "favoravel | desfavoravel | neutro", "motivo": "string"}],
  "autenticidade": {
    "ata_notarial": false,
    "periciado": false,
    "sinais_edicao": false,
    "mensagens_apagadas_visiveis": false,
    "sequencia_cronologica_integra": true,
    "obtencao_legal": true,
    "mandado_judicial": false,
    "descricao_obtencao": "string ou null"
  },
  "resumo_conteudo": "string (max 500 chars)",
  "elementos_favoraveis_defesa": ["string"],
  "elementos_desfavoraveis": ["string"],
  "nulidades_possiveis": ["string"],
  "observacoes_defesa": ["string"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}`,
};

const MIDIA_IMAGEM_VIDEO_PROMPT = {
  instructions: `TAREFA: Extrair dados de IMAGENS, FOTOGRAFIAS ou FRAMES DE VÍDEO juntados ao processo.

Incluem: fotos do local do crime, lesões da vítima, objetos apreendidos, frames de câmeras de segurança,
prints de redes sociais (posts, stories, fotos de perfil), prints de tela.

1. **Tipo de mídia**: Foto policial, CCTV, rede social, selfie, print de tela, etc
2. **O que mostra**: Descrever OBJETIVAMENTE o conteúdo
3. **Pessoas identificáveis**: Quem aparece, é possível identificar?
4. **Local**: Onde foi tirada/gravada
5. **Data/hora**: Se metadata ou carimbo visível
6. **Qualidade**: Nítida, escura, distante, desfocada — impacta valor probatório
7. **Fonte**: Quem forneceu (polícia, vítima, rede social, câmera pública)

VISÃO DA DEFESA:
- Imagem de CÂMERA DE SEGURANÇA: qualidade permite reconhecimento? Horário é confiável?
- Fotos de REDES SOCIAIS: data de postagem vs data do fato, perfil é mesmo do réu?
- Fotos de LESÕES: são compatíveis com a narrativa? Podem ser de outro evento?
- METADADOS: Se foto digital, pode ter EXIF (data, local GPS, dispositivo)
- Cadeia de custódia digital: quem extraiu, como preservou?`,
  schema: `{
  "tipo_midia": "foto_policial | cctv | rede_social | selfie | print_tela | documento_digitalizado | outro",
  "descricao_conteudo": "string (max 400 chars)",
  "pessoas_identificaveis": [{"descricao": "string", "identificado_como": "string ou null", "confianca_identificacao": "alta | media | baixa"}],
  "local": "string ou null",
  "data_hora": "YYYY-MM-DD HH:mm ou null",
  "fonte_metadata": "exif | carimbo_camera | contexto_texto | nenhuma",
  "qualidade": "nitida | razoavel | precaria | escura | distante | desfocada",
  "fonte_obtencao": "policia | vitima | testemunha | rede_social | camera_publica | camera_privada | celular_apreendido | outro",
  "autenticidade": {
    "periciada": false,
    "sinais_edicao": false,
    "metadados_preservados": false,
    "cadeia_custodia_digital": true
  },
  "relevancia_para_caso": "string (max 300 chars)",
  "elementos_favoraveis_defesa": ["string"],
  "elementos_desfavoraveis": ["string"],
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
  // Peças processuais
  denuncia: DENUNCIA_PROMPT,
  sentenca: SENTENCA_PROMPT,
  decisao: DECISAO_PROMPT,
  pronuncia: DECISAO_PROMPT, // pronúncia é uma decisão judicial

  // Depoimentos — prompts diferenciados por papel
  depoimento: DEPOIMENTO_PROMPT, // genérico → testemunha como base
  depoimento_testemunha: DEPOIMENTO_TESTEMUNHA_PROMPT,
  depoimento_vitima: DEPOIMENTO_VITIMA_PROMPT,
  depoimento_investigado: INTERROGATORIO_PROMPT,
  interrogatorio: INTERROGATORIO_PROMPT,

  // Laudos — prompts especializados por tipo forense
  laudo: LAUDO_PROMPT,
  laudo_pericial: LAUDO_PROMPT,
  laudo_necroscopico: LAUDO_NECROSCOPICO_PROMPT,
  laudo_local: LAUDO_PROMPT,
  laudo_toxicologico: LAUDO_TOXICOLOGICO_PROMPT,
  laudo_balistico: LAUDO_PROMPT, // usa genérico com cadeia de custódia
  laudo_medico_legal: LAUDO_MEDICO_LEGAL_PROMPT,
  laudo_psiquiatrico: LAUDO_PROMPT,
  pericia_digital: LAUDO_PROMPT,

  // Provas digitais e mídias
  midia_mensagens: MIDIA_MENSAGENS_PROMPT,
  midia_imagem_video: MIDIA_IMAGEM_VIDEO_PROMPT,

  // Certidões
  certidao: CERTIDAO_PROMPT,
  certidao_relevante: CERTIDAO_PROMPT,
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
