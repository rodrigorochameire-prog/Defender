/**
 * Atos Normativos Importantes para Defesa Criminal
 *
 * Consolidação de normas, portarias, resoluções e súmulas
 * relevantes para a atuação da Defensoria Pública na área criminal.
 *
 * Foco: TJBA, CNJ, STJ, STF e legislação federal
 */

export interface AtoNormativo {
  id: string;
  tipo: "sumula" | "resolucao" | "portaria" | "provimento" | "lei" | "decreto" | "instrucao";
  numero: string;
  orgao: string;
  data: string;
  ementa: string;
  texto?: string;
  url?: string;
  tags: string[];
  relevancia: "alta" | "media" | "baixa";
  atualizadoEm: string;
}

// ==========================================
// SÚMULAS VINCULANTES - STF
// ==========================================

export const SUMULAS_VINCULANTES: AtoNormativo[] = [
  {
    id: "sv-11",
    tipo: "sumula",
    numero: "Súmula Vinculante 11",
    orgao: "STF",
    data: "2008-08-13",
    ementa: "Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.",
    tags: ["algemas", "prisao", "dignidade", "nulidade"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "sv-14",
    tipo: "sumula",
    numero: "Súmula Vinculante 14",
    orgao: "STF",
    data: "2009-02-09",
    ementa: "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
    tags: ["acesso", "inquerito", "defesa", "prova"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "sv-26",
    tipo: "sumula",
    numero: "Súmula Vinculante 26",
    orgao: "STF",
    data: "2009-12-16",
    ementa: "Para efeito de progressão de regime no cumprimento de pena por crime hediondo, ou equiparado, o juízo da execução observará a inconstitucionalidade do art. 2º da Lei nº 8.072, de 25 de julho de 1990, sem prejuízo de avaliar se o condenado preenche, ou não, os requisitos objetivos e subjetivos do benefício, podendo determinar, para tal fim, de modo fundamentado, a realização de exame criminológico.",
    tags: ["progressao", "hediondo", "execucao", "regime"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "sv-56",
    tipo: "sumula",
    numero: "Súmula Vinculante 56",
    orgao: "STF",
    data: "2016-08-29",
    ementa: "A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.",
    tags: ["regime", "vaga", "prisao", "execucao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
];

// ==========================================
// SÚMULAS STJ - DIREITO PENAL/PROCESSUAL
// ==========================================

export const SUMULAS_STJ: AtoNormativo[] = [
  {
    id: "stj-231",
    tipo: "sumula",
    numero: "Súmula 231",
    orgao: "STJ",
    data: "1999-09-22",
    ementa: "A incidência da circunstância atenuante não pode conduzir à redução da pena abaixo do mínimo legal.",
    tags: ["dosimetria", "atenuante", "pena"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-269",
    tipo: "sumula",
    numero: "Súmula 269",
    orgao: "STJ",
    data: "2002-05-29",
    ementa: "É admissível a adoção do regime prisional semiaberto aos reincidentes condenados a pena igual ou inferior a quatro anos se favoráveis as circunstâncias judiciais.",
    tags: ["regime", "reincidente", "semiaberto"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-440",
    tipo: "sumula",
    numero: "Súmula 440",
    orgao: "STJ",
    data: "2010-04-28",
    ementa: "Fixada a pena-base no mínimo legal, é vedado o estabelecimento de regime prisional mais gravoso do que o cabível em razão da sanção imposta, com base apenas na gravidade abstrata do delito.",
    tags: ["regime", "pena-base", "gravidade"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-471",
    tipo: "sumula",
    numero: "Súmula 471",
    orgao: "STJ",
    data: "2011-02-14",
    ementa: "Os condenados por crimes hediondos ou assemelhados cometidos antes da vigência da Lei n. 11.464/2007 sujeitam-se ao disposto no art. 112 da Lei n. 7.210/1984 (Lei de Execução Penal) para a progressão de regime prisional.",
    tags: ["progressao", "hediondo", "1/6"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-491",
    tipo: "sumula",
    numero: "Súmula 491",
    orgao: "STJ",
    data: "2012-08-08",
    ementa: "É inadmissível a chamada progressão per saltum de regime prisional.",
    tags: ["progressao", "regime", "per-saltum"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-500",
    tipo: "sumula",
    numero: "Súmula 500",
    orgao: "STJ",
    data: "2013-08-28",
    ementa: "A configuração do crime do art. 244-B do ECA independe da prova da efetiva corrupção do menor, por se tratar de delito formal.",
    tags: ["eca", "corrupcao-menores", "formal"],
    relevancia: "media",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-527",
    tipo: "sumula",
    numero: "Súmula 527",
    orgao: "STJ",
    data: "2015-04-13",
    ementa: "O tempo de duração da medida de segurança não deve ultrapassar o limite máximo da pena abstratamente cominada ao delito praticado.",
    tags: ["medida-seguranca", "tempo", "limite"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-533",
    tipo: "sumula",
    numero: "Súmula 533",
    orgao: "STJ",
    data: "2015-06-10",
    ementa: "Para o reconhecimento da prática de falta disciplinar no âmbito da execução penal, é imprescindível a instauração de procedimento administrativo pelo diretor do estabelecimento prisional, assegurado o direito de defesa, a ser realizado por advogado constituído ou defensor público nomeado.",
    tags: ["falta", "pad", "defesa", "execucao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-534",
    tipo: "sumula",
    numero: "Súmula 534",
    orgao: "STJ",
    data: "2015-06-10",
    ementa: "A prática de falta grave interrompe a contagem do prazo para a progressão de regime de cumprimento de pena, o qual se reinicia a partir do cometimento dessa infração.",
    tags: ["falta-grave", "progressao", "interrupcao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-535",
    tipo: "sumula",
    numero: "Súmula 535",
    orgao: "STJ",
    data: "2015-06-10",
    ementa: "A prática de falta grave não interrompe o prazo para fim de comutação de pena ou indulto.",
    tags: ["falta-grave", "indulto", "comutacao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-562",
    tipo: "sumula",
    numero: "Súmula 562",
    orgao: "STJ",
    data: "2016-02-24",
    ementa: "É possível a remição de parte do tempo de execução da pena quando o condenado, em regime fechado ou semiaberto, desempenha atividade laborativa, ainda que extramuros.",
    tags: ["remicao", "trabalho", "extramuros"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-588",
    tipo: "sumula",
    numero: "Súmula 588",
    orgao: "STJ",
    data: "2017-09-13",
    ementa: "A prática de crime ou contravenção penal contra a mulher com violência ou grave ameaça no ambiente doméstico impossibilita a substituição da pena privativa de liberdade por restritiva de direitos.",
    tags: ["maria-penha", "substituicao", "violencia"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-589",
    tipo: "sumula",
    numero: "Súmula 589",
    orgao: "STJ",
    data: "2017-09-13",
    ementa: "É inaplicável o princípio da insignificância nos crimes ou contravenções penais praticados contra a mulher no âmbito das relações domésticas.",
    tags: ["maria-penha", "insignificancia", "violencia"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-593",
    tipo: "sumula",
    numero: "Súmula 593",
    orgao: "STJ",
    data: "2017-10-25",
    ementa: "O crime de estupro de vulnerável se configura com a conjunção carnal ou prática de ato libidinoso com menor de 14 anos, sendo irrelevante eventual consentimento da vítima para a prática do ato, sua experiência sexual anterior ou existência de relacionamento amoroso com o agente.",
    tags: ["estupro-vulneravel", "menor", "consentimento"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "stj-630",
    tipo: "sumula",
    numero: "Súmula 630",
    orgao: "STJ",
    data: "2019-04-24",
    ementa: "A incidência da atenuante da confissão espontânea no crime de tráfico ilícito de entorpecentes exige o reconhecimento da traficância pelo acusado, não bastando a mera admissão da posse ou propriedade para uso próprio.",
    tags: ["confissao", "trafico", "atenuante"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
];

// ==========================================
// RESOLUÇÕES CNJ RELEVANTES
// ==========================================

export const RESOLUCOES_CNJ: AtoNormativo[] = [
  {
    id: "cnj-213",
    tipo: "resolucao",
    numero: "Resolução 213/2015",
    orgao: "CNJ",
    data: "2015-12-15",
    ementa: "Dispõe sobre a apresentação de toda pessoa presa à autoridade judicial no prazo de 24 horas (audiência de custódia).",
    url: "https://atos.cnj.jus.br/atos/detalhar/2234",
    tags: ["custodia", "prisao", "24h", "audiencia"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "cnj-367",
    tipo: "resolucao",
    numero: "Resolução 367/2021",
    orgao: "CNJ",
    data: "2021-01-19",
    ementa: "Estabelece diretrizes e normas gerais para a substituição da privação de liberdade de gestantes, mães, pais e responsáveis por crianças e pessoas com deficiência, nos termos dos arts. 318 e 318-A do Código de Processo Penal.",
    tags: ["gestante", "mae", "prisao-domiciliar", "crianca"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "cnj-474",
    tipo: "resolucao",
    numero: "Resolução 474/2022",
    orgao: "CNJ",
    data: "2022-09-08",
    ementa: "Dispõe sobre as hipóteses de prisão em flagrante delito em que não se admite fiança, bem como sobre a concessão de liberdade provisória com ou sem fiança pelo juiz ou tribunal.",
    tags: ["flagrante", "fianca", "liberdade-provisoria"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "cnj-487",
    tipo: "resolucao",
    numero: "Resolução 487/2023",
    orgao: "CNJ",
    data: "2023-02-15",
    ementa: "Institui o Sistema Eletrônico de Execução Unificado - SEEU e estabelece os parâmetros de seu funcionamento.",
    url: "https://atos.cnj.jus.br/atos/detalhar/4922",
    tags: ["seeu", "execucao", "sistema", "unificado"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
];

// ==========================================
// NORMAS DO TJBA
// ==========================================

export const NORMAS_TJBA: AtoNormativo[] = [
  {
    id: "tjba-provimento-cgj-01-2020",
    tipo: "provimento",
    numero: "Provimento CGJ 01/2020",
    orgao: "TJBA",
    data: "2020-03-15",
    ementa: "Regulamenta o funcionamento das audiências de custódia no âmbito do Tribunal de Justiça do Estado da Bahia.",
    tags: ["custodia", "audiencia", "tjba"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "tjba-resolucao-19-2020",
    tipo: "resolucao",
    numero: "Resolução 19/2020",
    orgao: "TJBA",
    data: "2020-06-10",
    ementa: "Dispõe sobre a realização de audiências e sessões por videoconferência no âmbito do Poder Judiciário do Estado da Bahia.",
    tags: ["videoconferencia", "audiencia", "remoto"],
    relevancia: "media",
    atualizadoEm: "2024-01-01",
  },
];

// ==========================================
// LEGISLAÇÃO FEDERAL ESSENCIAL
// ==========================================

export const LEGISLACAO_FEDERAL: AtoNormativo[] = [
  {
    id: "lei-7210-1984",
    tipo: "lei",
    numero: "Lei 7.210/1984",
    orgao: "União",
    data: "1984-07-11",
    ementa: "Lei de Execução Penal - LEP. Institui a Lei de Execução Penal.",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm",
    tags: ["lep", "execucao", "penal", "progressao", "regime"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "lei-8072-1990",
    tipo: "lei",
    numero: "Lei 8.072/1990",
    orgao: "União",
    data: "1990-07-25",
    ementa: "Lei dos Crimes Hediondos. Dispõe sobre os crimes hediondos, nos termos do art. 5º, inciso XLIII, da Constituição Federal.",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm",
    tags: ["hediondo", "crime", "progressao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "lei-11343-2006",
    tipo: "lei",
    numero: "Lei 11.343/2006",
    orgao: "União",
    data: "2006-08-23",
    ementa: "Lei de Drogas. Institui o Sistema Nacional de Políticas Públicas sobre Drogas - Sisnad.",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm",
    tags: ["drogas", "trafico", "usuario", "sisnad"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "lei-11340-2006",
    tipo: "lei",
    numero: "Lei 11.340/2006",
    orgao: "União",
    data: "2006-08-07",
    ementa: "Lei Maria da Penha. Cria mecanismos para coibir a violência doméstica e familiar contra a mulher.",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
    tags: ["maria-penha", "violencia", "domestica", "mulher"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "lei-12850-2013",
    tipo: "lei",
    numero: "Lei 12.850/2013",
    orgao: "União",
    data: "2013-08-02",
    ementa: "Define organização criminosa e dispõe sobre a investigação criminal, os meios de obtenção da prova, infrações penais correlatas e o procedimento criminal.",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm",
    tags: ["orcrim", "organizacao-criminosa", "delacao"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
  {
    id: "lei-13964-2019",
    tipo: "lei",
    numero: "Lei 13.964/2019",
    orgao: "União",
    data: "2019-12-24",
    ementa: "Pacote Anticrime. Aperfeiçoa a legislação penal e processual penal.",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm",
    tags: ["anticrime", "plea-bargain", "juiz-garantias"],
    relevancia: "alta",
    atualizadoEm: "2024-01-01",
  },
];

// ==========================================
// TESES DE DEFESA COMUNS
// ==========================================

export interface TeseDefesa {
  id: string;
  titulo: string;
  tipo: "absolvicao" | "desclassificacao" | "atenuacao" | "nulidade" | "execucao";
  descricao: string;
  fundamentacao: string[];
  aplicavel: string[]; // Tipos de crime
  tags: string[];
}

export const TESES_DEFESA: TeseDefesa[] = [
  {
    id: "insignificancia",
    titulo: "Princípio da Insignificância",
    tipo: "absolvicao",
    descricao: "Atipicidade material por ausência de lesividade ao bem jurídico tutelado.",
    fundamentacao: [
      "STF - HC 84.412/SP (Ministro Celso de Mello)",
      "Requisitos: mínima ofensividade, ausência de periculosidade, reduzido grau de reprovabilidade, inexpressividade da lesão",
    ],
    aplicavel: ["furto", "descaminho", "crimes-tributarios"],
    tags: ["atipicidade", "bagatelar", "furto"],
  },
  {
    id: "trafico-privilegiado",
    titulo: "Tráfico Privilegiado (Art. 33, §4º)",
    tipo: "atenuacao",
    descricao: "Redução de pena de 1/6 a 2/3 para réu primário, bons antecedentes, não dedicado a atividades criminosas nem integrante de organização criminosa.",
    fundamentacao: [
      "Art. 33, §4º da Lei 11.343/2006",
      "STF - HC 118.533/MS (não é crime hediondo)",
      "Substituição por restritivas de direitos é possível",
    ],
    aplicavel: ["trafico"],
    tags: ["drogas", "reducao", "primario"],
  },
  {
    id: "erro-tipo",
    titulo: "Erro de Tipo",
    tipo: "absolvicao",
    descricao: "Excludente de dolo por desconhecimento ou falsa percepção de elemento constitutivo do tipo penal.",
    fundamentacao: [
      "Art. 20 do Código Penal",
      "Erro sobre elemento do tipo exclui o dolo",
    ],
    aplicavel: ["diversos"],
    tags: ["dolo", "erro", "elemento-tipo"],
  },
  {
    id: "legitima-defesa",
    titulo: "Legítima Defesa",
    tipo: "absolvicao",
    descricao: "Excludente de ilicitude por reação moderada a agressão injusta, atual ou iminente.",
    fundamentacao: [
      "Art. 25 do Código Penal",
      "Requisitos: agressão injusta, atual ou iminente, uso moderado dos meios necessários, defesa de direito próprio ou de outrem",
    ],
    aplicavel: ["homicidio", "lesao-corporal"],
    tags: ["excludente", "ilicitude", "agressao"],
  },
  {
    id: "prisao-domiciliar-mae",
    titulo: "Prisão Domiciliar para Mães",
    tipo: "execucao",
    descricao: "Substituição da prisão preventiva por domiciliar para gestantes, mães de crianças até 12 anos ou pessoa com deficiência.",
    fundamentacao: [
      "Art. 318, incisos IV, V e VI do CPP",
      "HC Coletivo 143.641/SP (STF)",
      "Resolução CNJ 367/2021",
    ],
    aplicavel: ["diversos"],
    tags: ["domiciliar", "gestante", "mae", "crianca"],
  },
  {
    id: "excesso-prazo-prisao",
    titulo: "Excesso de Prazo da Prisão",
    tipo: "nulidade",
    descricao: "Constrangimento ilegal por manutenção de prisão provisória além do prazo razoável.",
    fundamentacao: [
      "Art. 5º, LXXVIII da CF (razoável duração do processo)",
      "Súmula 21 do STJ",
      "Súmula 52 do STJ",
    ],
    aplicavel: ["diversos"],
    tags: ["prisao", "prazo", "hc", "liberdade"],
  },
  {
    id: "nulidade-busca-domiciliar",
    titulo: "Nulidade de Busca Domiciliar",
    tipo: "nulidade",
    descricao: "Ilicitude da prova obtida por busca domiciliar sem mandado judicial e sem flagrante delito.",
    fundamentacao: [
      "Art. 5º, XI da CF (inviolabilidade do domicílio)",
      "Art. 240 e seguintes do CPP",
      "Prova ilícita - Art. 5º, LVI da CF",
    ],
    aplicavel: ["trafico", "armas", "diversos"],
    tags: ["busca", "domicilio", "prova-ilicita", "nulidade"],
  },
];

// ==========================================
// PRAZOS PROCESSUAIS CRIMINAIS (TJBA/PJe)
// ==========================================

export interface PrazoProcessual {
  id: string;
  ato: string;
  prazo: number; // em dias
  tipo: "util" | "corrido";
  fundamento: string;
  observacoes?: string;
}

export const PRAZOS_CRIMINAIS_TJBA: PrazoProcessual[] = [
  { id: "resposta-acusacao", ato: "Resposta à Acusação", prazo: 10, tipo: "corrido", fundamento: "Art. 396 CPP" },
  { id: "alegacoes-finais", ato: "Alegações Finais (memoriais)", prazo: 5, tipo: "corrido", fundamento: "Art. 403, §3º CPP" },
  { id: "apelacao", ato: "Apelação", prazo: 5, tipo: "corrido", fundamento: "Art. 593 CPP" },
  { id: "razoes-apelacao", ato: "Razões de Apelação", prazo: 8, tipo: "corrido", fundamento: "Art. 600 CPP" },
  { id: "contrarrazoes-apelacao", ato: "Contrarrazões de Apelação", prazo: 8, tipo: "corrido", fundamento: "Art. 600 CPP" },
  { id: "rese", ato: "Recurso em Sentido Estrito", prazo: 5, tipo: "corrido", fundamento: "Art. 586 CPP" },
  { id: "razoes-rese", ato: "Razões do RESE", prazo: 2, tipo: "corrido", fundamento: "Art. 588 CPP" },
  { id: "embargos-declaracao", ato: "Embargos de Declaração", prazo: 2, tipo: "corrido", fundamento: "Art. 382 CPP" },
  { id: "agravo-execucao", ato: "Agravo em Execução", prazo: 5, tipo: "corrido", fundamento: "Art. 197 LEP" },
  { id: "hc", ato: "Habeas Corpus", prazo: 0, tipo: "corrido", fundamento: "Art. 5º, LXVIII CF", observacoes: "Sem prazo - pode ser impetrado a qualquer tempo" },
  { id: "revisao-criminal", ato: "Revisão Criminal", prazo: 0, tipo: "corrido", fundamento: "Art. 621 CPP", observacoes: "Sem prazo - após trânsito em julgado" },
];

// ==========================================
// FUNÇÕES DE BUSCA
// ==========================================

export function buscarAtosPorTag(tag: string): AtoNormativo[] {
  const todosAtos = [
    ...SUMULAS_VINCULANTES,
    ...SUMULAS_STJ,
    ...RESOLUCOES_CNJ,
    ...NORMAS_TJBA,
    ...LEGISLACAO_FEDERAL,
  ];

  return todosAtos.filter((ato) =>
    ato.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

export function buscarAtosPorTipo(tipo: AtoNormativo["tipo"]): AtoNormativo[] {
  const todosAtos = [
    ...SUMULAS_VINCULANTES,
    ...SUMULAS_STJ,
    ...RESOLUCOES_CNJ,
    ...NORMAS_TJBA,
    ...LEGISLACAO_FEDERAL,
  ];

  return todosAtos.filter((ato) => ato.tipo === tipo);
}

export function buscarTeseDefesa(crime: string): TeseDefesa[] {
  return TESES_DEFESA.filter(
    (tese) =>
      tese.aplicavel.includes(crime.toLowerCase()) ||
      tese.aplicavel.includes("diversos")
  );
}

export function obterPrazo(ato: string): PrazoProcessual | undefined {
  return PRAZOS_CRIMINAIS_TJBA.find(
    (p) => p.ato.toLowerCase() === ato.toLowerCase() || p.id === ato.toLowerCase()
  );
}

// Exportar tudo consolidado
export const TODOS_ATOS_NORMATIVOS = {
  sumulasVinculantes: SUMULAS_VINCULANTES,
  sumulasSTJ: SUMULAS_STJ,
  resolucoesCNJ: RESOLUCOES_CNJ,
  normasTJBA: NORMAS_TJBA,
  legislacaoFederal: LEGISLACAO_FEDERAL,
  tesasDefesa: TESES_DEFESA,
  prazosCriminais: PRAZOS_CRIMINAIS_TJBA,
};
