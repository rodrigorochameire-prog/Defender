/**
 * Utilitários para extração de dados de documentos jurídicos
 *
 * Baseado nos padrões do PJe/TJBA identificados via análise de documentos reais.
 */

// ==========================================
// TIPOS
// ==========================================

export interface ExtractedData {
  numeroProcesso: string | null;
  orgaoJulgador: string | null;
  classeDemanda: string | null;
  assuntos: string | null;
  assistidos: string[]; // Pode ter múltiplos réus/investigados
}

export interface AtribuicaoResult {
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO";
  confianca: number; // 0-100
  motivo: string;
}

// Mapeamento das atribuições para IDs de pasta no Drive
export const ATRIBUICAO_FOLDER_IDS = {
  JURI: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
  VVD: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
  EP: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
  SUBSTITUICAO: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
} as const;

// Pastas especiais
export const SPECIAL_FOLDER_IDS = {
  JURISPRUDENCIA: "1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S",
  DISTRIBUICAO: "1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4",
} as const;

// ==========================================
// CONVERSÃO DE NOMES
// ==========================================

/**
 * Converte nome para Title Case respeitando preposições portuguesas
 *
 * @example
 * toTitleCase("JOÃO DA SILVA") // "João da Silva"
 * toTitleCase("MARIA DOS SANTOS") // "Maria dos Santos"
 * toTitleCase("PEDRO DE OLIVEIRA NETO") // "Pedro de Oliveira Neto"
 */
export function toTitleCase(name: string): string {
  const particles = ["da", "de", "do", "das", "dos", "e", "ou"];

  return name
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0) // Remove espaços extras
    .map((word, index) => {
      // Preposições ficam em minúsculo, exceto se for a primeira palavra
      if (index > 0 && particles.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Normaliza nome removendo caracteres especiais e espaços extras
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z\s]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, " ") // Normaliza espaços
    .trim()
    .toUpperCase();
}

// ==========================================
// EXTRAÇÃO DE DADOS DE PDF
// ==========================================

/**
 * Extrai dados estruturados do texto de primeira página de documento PJe
 *
 * Padrões suportados:
 * - Número: "Número: X.XXXXXXX-XX.XXXX.X.XX.XXXX"
 * - Classe: "Classe: [TEXTO]"
 * - Órgão: "Órgão julgador: [TEXTO]"
 * - Assuntos: "Assuntos: [TEXTO]"
 * - Partes: "NOME (REU)", "NOME (INVESTIGADO)", etc.
 */
export function extractFromPdfText(text: string): ExtractedData {
  let numeroProcesso: string | null = null;
  let orgaoJulgador: string | null = null;
  let classeDemanda: string | null = null;
  let assuntos: string | null = null;
  const assistidos: string[] = [];

  // 1. Extrai número do processo
  // Padrão: "Número: 8000819-86.2025.8.05.0039" ou "Processo: ..."
  const matchNumero = text.match(
    /(?:Número|Processo):\s*([\d]\.?[\d]{6,7}-[\d]{2}\.[\d]{4}\.[\d]\.[\d]{2}\.[\d]{4})/i
  );
  if (matchNumero) {
    numeroProcesso = matchNumero[1].trim().replace(/^0\./, ""); // Remove "0." inicial se houver
  }

  // 2. Extrai classe da demanda
  // Padrão: "Classe: AÇÃO PENAL DE COMPETÊNCIA DO JÚRI"
  const matchClasse = text.match(/Classe:\s*([^\n]+)/i);
  if (matchClasse) {
    classeDemanda = matchClasse[1].trim();
  }

  // 3. Extrai órgão julgador
  // Padrão: "Órgão julgador: VARA DO JÚRI E EXECUÇÕES PENAIS..."
  const matchOrgao = text.match(/[ÓO]rg[ãa]o\s*julgador:\s*([^\n]+)/i);
  if (matchOrgao) {
    orgaoJulgador = matchOrgao[1].trim();
  }

  // 4. Extrai assuntos
  // Padrão: "Assuntos: Homicídio Qualificado"
  const matchAssuntos = text.match(/Assuntos?:\s*([^\n]+)/i);
  if (matchAssuntos) {
    assuntos = matchAssuntos[1].trim();
  }

  // 5. Extrai réus/investigados/requeridos
  // Padrões: "NOME (REU)", "NOME (INVESTIGADO)", "NOME (REQUERIDO)", "NOME (CUSTODIADO)", "NOME (FLAGRANTEADO)"
  const regexPartes =
    /([A-Za-zÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜçãéíóúâêîôûàèìòùäëïöü\s]+)\s*\((RÉU|REU|INVESTIGADO|CUSTODIADO|REQUERIDO|PROMOVIDO|FLAGRANTEADO|AUTOR\s*DO\s*FATO|INDICIADO)\)/gi;

  let matchParte;
  while ((matchParte = regexPartes.exec(text)) !== null) {
    const nome = matchParte[1].trim();
    // Ignora palavras-chave falsas
    const ignorar = [
      "VISTOS",
      "MINISTÉRIO PÚBLICO",
      "DEFENSORIA",
      "PODER JUDICIÁRIO",
      "TRIBUNAL",
      "ESTADO DA BAHIA",
    ];
    if (!ignorar.some((i) => nome.toUpperCase().includes(i)) && nome.length > 3) {
      // Evita duplicatas
      if (!assistidos.some((a) => normalizeName(a) === normalizeName(nome))) {
        assistidos.push(nome);
      }
    }
  }

  // 6. Fallback para Execução Penal (formato diferente - SAJ)
  // Padrão: "Tipo: Promovido" seguido de "Nome: EDINEI SOUZA DOS SANTOS"
  if (assistidos.length === 0) {
    const matchPromovido = text.match(
      /Tipo:\s*Promovido[\s\S]*?Nome:\s*([A-Za-zÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜçãéíóúâêîôûàèìòùäëïöü\s]+)/i
    );
    if (matchPromovido) {
      const nome = matchPromovido[1].trim();
      if (nome.length > 3) {
        assistidos.push(nome);
      }
    }
  }

  // 7. Fallback alternativo: buscar nomes em UPPERCASE seguidos de tipo
  // Alguns documentos podem ter formato "NOME COMPLETO\n(INVESTIGADO)"
  if (assistidos.length === 0) {
    const matchNomesAlternativos = text.match(
      /([A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ][A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ\s]{5,50})\n\s*\((RÉU|REU|INVESTIGADO|CUSTODIADO|REQUERIDO)\)/gi
    );
    if (matchNomesAlternativos) {
      for (const match of matchNomesAlternativos) {
        const nomeMatch = match.match(
          /([A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ][A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ\s]{5,50})/i
        );
        if (nomeMatch) {
          const nome = nomeMatch[1].trim();
          if (
            !assistidos.some((a) => normalizeName(a) === normalizeName(nome))
          ) {
            assistidos.push(nome);
          }
        }
      }
    }
  }

  return { numeroProcesso, orgaoJulgador, classeDemanda, assuntos, assistidos };
}

// ==========================================
// IDENTIFICAÇÃO DE ATRIBUIÇÃO
// ==========================================

/**
 * Identifica a atribuição (JURI, VVD, EP, SUBSTITUICAO) baseado nos dados extraídos
 *
 * Regras baseadas na análise de documentos reais:
 * - VVD: Vara de Violência Doméstica de Camaçari
 * - JÚRI + EP: Mesmo órgão, diferenciar pela classe/assunto
 * - SUBSTITUIÇÃO: Vara Criminal fora de Camaçari
 */
export function identificarAtribuicao(
  orgaoJulgador: string,
  classeDemanda?: string,
  assuntos?: string
): AtribuicaoResult {
  const orgao = (orgaoJulgador || "").toLowerCase();
  const classe = (classeDemanda || "").toLowerCase();
  const assunto = (assuntos || "").toLowerCase();

  // 1. VVD - Violência Doméstica de Camaçari
  // Órgão: "VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI"
  if (
    (orgao.includes("violência doméstica") || orgao.includes("violencia domestica")) &&
    orgao.includes("camaçari")
  ) {
    // Verificar se é feminicídio (homicídio no contexto de VD) -> JURI
    if (
      assunto.includes("homicídio") ||
      assunto.includes("homicidio") ||
      classe.includes("homicídio") ||
      assunto.includes("feminicídio") ||
      assunto.includes("feminicidio")
    ) {
      return {
        atribuicao: "JURI",
        confianca: 95,
        motivo: "Feminicídio (VD + Homicídio) = Competência do Júri",
      };
    }
    return { atribuicao: "VVD", confianca: 100, motivo: "Vara VVD Camaçari" };
  }

  // 2. JÚRI vs EP - Mesmo órgão, diferenciar pela classe/assunto
  // Órgão: "VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI"
  if (
    (orgao.includes("júri") || orgao.includes("juri")) &&
    (orgao.includes("execuções penais") || orgao.includes("execucoes penais")) &&
    orgao.includes("camaçari")
  ) {
    // EP: classe "Execução da Pena" ou "Pena Privativa de Liberdade"
    if (
      classe.includes("execução") ||
      classe.includes("execucao") ||
      assunto.includes("pena privativa") ||
      assunto.includes("progressão") ||
      assunto.includes("progressao") ||
      assunto.includes("livramento condicional") ||
      assunto.includes("indulto") ||
      assunto.includes("saída temporária") ||
      assunto.includes("saida temporaria")
    ) {
      return {
        atribuicao: "EP",
        confianca: 95,
        motivo: "Vara Mista - Classe de Execução Penal",
      };
    }
    // JÚRI: classe "Ação Penal de Competência do Júri" ou "Inquérito Policial" com homicídio
    if (
      classe.includes("júri") ||
      classe.includes("juri") ||
      classe.includes("inquérito") ||
      classe.includes("inquerito") ||
      assunto.includes("homicídio") ||
      assunto.includes("homicidio") ||
      assunto.includes("latrocínio") ||
      assunto.includes("latrocinio")
    ) {
      return {
        atribuicao: "JURI",
        confianca: 95,
        motivo: "Vara Mista - Classe de Júri/IP com crime doloso contra a vida",
      };
    }
    // Se não conseguiu diferenciar, assume JURI por estar na vara do júri
    return {
      atribuicao: "JURI",
      confianca: 70,
      motivo: "Vara Mista - Assumindo Júri (não identificou classe específica)",
    };
  }

  // 3. JÚRI fora de Camaçari = SUBSTITUIÇÃO
  // Órgão contém "júri" mas não é de Camaçari
  if (
    (orgao.includes("júri") || orgao.includes("juri")) &&
    !orgao.includes("camaçari") &&
    !orgao.includes("camacari")
  ) {
    return {
      atribuicao: "SUBSTITUICAO",
      confianca: 100,
      motivo: "Vara do Júri fora de Camaçari = Substituição",
    };
  }

  // 4. SUBSTITUIÇÃO - Vara Criminal de outra comarca
  // Órgão: "VARA CRIMINAL DE CANDEIAS", "VARA CRIMINAL DE DIAS D'ÁVILA", etc.
  if (
    orgao.includes("vara criminal") &&
    !orgao.includes("camaçari") &&
    !orgao.includes("camacari")
  ) {
    return {
      atribuicao: "SUBSTITUICAO",
      confianca: 100,
      motivo: "Vara Criminal fora de Camaçari",
    };
  }

  // 5. Juizado Especial = SUBSTITUIÇÃO
  if (orgao.includes("juizado especial")) {
    return {
      atribuicao: "SUBSTITUICAO",
      confianca: 90,
      motivo: "Juizado Especial Criminal",
    };
  }

  // 6. EP genérico (outras comarcas ou formato diferente)
  if (
    orgao.includes("execução penal") ||
    orgao.includes("execucao penal") ||
    orgao.includes("vep")
  ) {
    // EP fora de Camaçari = Substituição
    if (!orgao.includes("camaçari") && !orgao.includes("camacari")) {
      return {
        atribuicao: "SUBSTITUICAO",
        confianca: 85,
        motivo: "Vara de Execução Penal fora de Camaçari",
      };
    }
    return { atribuicao: "EP", confianca: 90, motivo: "Vara de Execução Penal" };
  }

  // 7. VVD genérico (outras comarcas)
  if (
    orgao.includes("violência") ||
    orgao.includes("violencia") ||
    orgao.includes("maria da penha")
  ) {
    // VVD fora de Camaçari = Substituição
    if (!orgao.includes("camaçari") && !orgao.includes("camacari")) {
      return {
        atribuicao: "SUBSTITUICAO",
        confianca: 85,
        motivo: "Vara VVD fora de Camaçari",
      };
    }
    return { atribuicao: "VVD", confianca: 85, motivo: "Vara VVD (outra comarca)" };
  }

  // 8. JÚRI genérico
  if (orgao.includes("júri") || orgao.includes("juri")) {
    return { atribuicao: "JURI", confianca: 85, motivo: "Vara do Júri (outra comarca)" };
  }

  // 9. Default: Substituição
  return {
    atribuicao: "SUBSTITUICAO",
    confianca: 50,
    motivo: "Não identificado - assumindo Substituição",
  };
}

/**
 * Retorna o ID da pasta do Drive para uma atribuição
 */
export function getFolderIdForAtribuicao(
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO"
): string {
  return ATRIBUICAO_FOLDER_IDS[atribuicao];
}

/**
 * Mapeia valor do enum atribuicao (banco) para atribuição simplificada (Drive)
 */
export function mapAtribuicaoEnumToSimple(
  atribuicaoEnum: string
): "JURI" | "VVD" | "EP" | "SUBSTITUICAO" {
  switch (atribuicaoEnum) {
    case "JURI_CAMACARI":
    case "GRUPO_JURI":
      return "JURI";
    case "VVD_CAMACARI":
      return "VVD";
    case "EXECUCAO_PENAL":
      return "EP";
    case "SUBSTITUICAO":
    case "SUBSTITUICAO_CIVEL":
    default:
      return "SUBSTITUICAO";
  }
}

/**
 * Mapeia atribuição simplificada para valor do enum atribuicao (banco)
 */
export function mapSimpleToAtribuicaoEnum(
  simple: "JURI" | "VVD" | "EP" | "SUBSTITUICAO"
): string {
  switch (simple) {
    case "JURI":
      return "JURI_CAMACARI";
    case "VVD":
      return "VVD_CAMACARI";
    case "EP":
      return "EXECUCAO_PENAL";
    case "SUBSTITUICAO":
    default:
      return "SUBSTITUICAO";
  }
}

// ==========================================
// VALIDAÇÃO DE NÚMERO DE PROCESSO
// ==========================================

/**
 * Valida se string está no formato CNJ
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function isValidProcessoNumber(numero: string): boolean {
  const regex = /^[\d]{7}-[\d]{2}\.[\d]{4}\.[\d]\.[\d]{2}\.[\d]{4}$/;
  return regex.test(numero);
}

/**
 * Formata número de processo para padrão CNJ
 * Remove espaços e caracteres extras
 */
export function formatProcessoNumber(numero: string): string | null {
  // Remove espaços e caracteres não numéricos exceto - e .
  const cleaned = numero.replace(/[^0-9.-]/g, "");

  // Tenta extrair padrão CNJ
  const match = cleaned.match(
    /([\d]{7})-([\d]{2})\.([\d]{4})\.([\d])\.([\d]{2})\.([\d]{4})/
  );
  if (match) {
    return `${match[1]}-${match[2]}.${match[3]}.${match[4]}.${match[5]}.${match[6]}`;
  }

  return null;
}

// ==========================================
// SIMILARIDADE DE NOMES (para homonímia)
// ==========================================

/**
 * Calcula distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Inicializa primeira coluna
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Inicializa primeira linha
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Preenche matriz
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1, // inserção
          matrix[i - 1][j] + 1 // deleção
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Verifica similaridade entre dois nomes
 * Retorna objeto com diferentes critérios de match
 */
export function checkNameSimilarity(
  name1: string,
  name2: string
): {
  exactMatch: boolean;
  similarMatch: boolean;
  firstLastMatch: boolean;
  distance: number;
} {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  const distance = levenshteinDistance(n1, n2);

  // Primeiro e último nome
  const parts1 = n1.split(" ").filter((p) => p.length > 0);
  const parts2 = n2.split(" ").filter((p) => p.length > 0);

  const firstLastMatch =
    parts1.length > 0 &&
    parts2.length > 0 &&
    parts1[0] === parts2[0] &&
    parts1[parts1.length - 1] === parts2[parts2.length - 1];

  return {
    exactMatch: n1 === n2,
    similarMatch: distance <= 3, // Até 3 caracteres de diferença
    firstLastMatch,
    distance,
  };
}
