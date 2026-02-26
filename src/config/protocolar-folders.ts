/**
 * Mapeamento: Tipo de ato → Subpasta no Google Drive "Petições por assunto (DOC)"
 *
 * Pasta raiz: 12ndqn0mxxuBG5IaNKPkRAOG-7yO9W45v
 * Estrutura: Meu Drive > 1 - Defensoria 9ª DP > Petições por assunto (DOC) > [subpasta]
 *
 * As subpastas numeradas (1-11) são as mais usadas.
 * Subpastas de substituição são determinadas pela atribuição ativa.
 */

// ID da pasta raiz "Petições por assunto (DOC)" no Google Drive
export const PETICOES_POR_ASSUNTO_FOLDER_ID = "12ndqn0mxxuBG5IaNKPkRAOG-7yO9W45v";

// ID da pasta "Protocolar" no Google Drive
export const PROTOCOLAR_FOLDER_ID = "1a8py3lZmLLGCek5zhHAfYZumPegGRVlJ";

/**
 * Mapeamento ato → nome da subpasta no Drive
 * Usa o nome exato da subpasta como aparece no Google Drive.
 * O sistema busca pelo nome da pasta dentro de PETICOES_POR_ASSUNTO_FOLDER_ID.
 */
export const ATO_TO_DRIVE_FOLDER: Record<string, string> = {
  // === Numeradas (mais usadas) ===
  "Alegações finais": "1 Alegações Finais",
  "Apelação": "2 Apelação",
  "Razões de apelação": "2 Apelação",
  "Contrarrazões de apelação": "3 Contrarrazões de Apelação",
  "Contrarrazões de RESE": "4 Contrarrazões de RESE",
  "Diligências do 422": "5 Diligências 422",
  "Habeas Corpus": "6 HC",
  "Revogação da prisão": "7 Prisão e cautelares",
  "Relaxamento da prisão": "7 Prisão e cautelares",
  "Relaxamento e revogação de prisão": "7 Prisão e cautelares",
  "Relaxamento e revogação": "7 Prisão e cautelares",
  "Substituição da prisão por cautelar": "7 Prisão e cautelares",
  "Revogação de monitoramento": "7 Prisão e cautelares",
  "Revogação do monitoramento": "7 Prisão e cautelares",
  "RESE": "8 RESE",
  "Razões de RESE": "8 RESE",
  "Resposta à Acusação": "9 Resposta à acusação",

  // === Atribuição-específicas ===
  "Agravo em Execução": "10 Execução Penal",
  "Requerimento de progressão": "10 Execução Penal",
  "Designação de justificação": "10 Execução Penal",
  "Designação admonitória": "10 Execução Penal",
  "Transferência de unidade": "Transferência e visitas preso",
  "Indulto": "10 Execução Penal",
  "Manifestação contra reconversão": "10 Execução Penal",
  "Manifestação contra regressão": "10 Execução Penal",
  "Cumprimento ANPP": "10 Execução Penal",

  // === VVD ===
  "Revogação de MPU": "11 Violência Doméstica",
  "Modulação de MPU": "11 Violência Doméstica",

  // === Não-numeradas ===
  "Embargos de Declaração": "Embargos Declaração",
  "Contrarrazões de ED": "Embargos Declaração",
  "Incidente de insanidade": "Incidente insanidade e internação",
  "Contestação": "Curadoria de ausentes",
  "Mandado de Segurança": "Prerrogativas",
  "Memoriais": "1 Alegações Finais",
  "Desaforamento": "Outras petições",
  "Restituição de coisa": "Outras petições",
  "Quesitos": "Outras petições",
  "Requerimento audiência": "Outras petições",
  "Ofício": "Outras petições",
  "Petição intermediária": "Outras petições",
  "Prosseguimento do feito": "Outras petições",
  "Juntada de documentos": "Outras petições",
  "Rol de Testemunhas": "Requerimento de oitiva de testemunhas",
  "Testemunhas": "Requerimento de oitiva de testemunhas",
  "Diligências do réu": "5 Diligências 422",
};

/**
 * Mapeamento de substituições por comarca/vara → subpasta Drive
 * Usado quando a atribuição é "Substituição Criminal"
 */
export const SUBSTITUICAO_TO_DRIVE_FOLDER: Record<string, string> = {
  "1 DP Simões": "Substituicao 1 DP simoes",
  "1ª Vara Criminal": "Substituicao 1VC",
  "Candeias": "Substituicao Candeias",
  "Dias D'Ávila": "Substituicao Dias Davila",
  "Família": "Substituicao Familia",
  "Fazenda Pública": "Substituição Fazenda pública",
  "Itacaré": "Substituição Itacaré",
  "Lauro de Freitas": "Substituicao LF",
  "Infância": "Substituição na infância",
  "Vara Cível": "Substituicao Vara Civel",
  "Varas Criminais": "Substituição Varas Crimes",
};

// Pasta catch-all para atos não mapeados
export const FOLDER_FALLBACK = "Outras petições";

/**
 * Resolve a subpasta correta no Drive para um ato + atribuição
 */
export function resolverSubpastaDrive(
  ato: string,
  atribuicao?: string,
  varaSubstituicao?: string
): string {
  // Se é substituição e temos a vara, usar mapeamento específico
  if (atribuicao === "Substituição Criminal" && varaSubstituicao) {
    return SUBSTITUICAO_TO_DRIVE_FOLDER[varaSubstituicao] || FOLDER_FALLBACK;
  }

  // Buscar no mapeamento geral
  return ATO_TO_DRIVE_FOLDER[ato] || FOLDER_FALLBACK;
}

/**
 * Prefixos comuns em nomes de arquivo para detectar tipo de ato
 * Usado para matching automático quando o nome do arquivo segue padrão
 * Ex: "RAC - FULANO.pdf" → "Resposta à Acusação"
 *     "AF - BELTRANO.pdf" → "Alegações finais"
 */
export const FILE_PREFIX_TO_ATO: Record<string, string> = {
  "RAC": "Resposta à Acusação",
  "RA": "Resposta à Acusação",
  "AF": "Alegações finais",
  "AP": "Apelação",
  "HC": "Habeas Corpus",
  "RESE": "RESE",
  "ED": "Embargos de Declaração",
  "CR": "Contrarrazões de apelação",
  "CR RESE": "Contrarrazões de RESE",
  "DI": "Diligências do 422",
  "PI": "Petição intermediária",
  "MEM": "Memoriais",
  "AGR": "Agravo em Execução",
  "PROG": "Requerimento de progressão",
  "MPU": "Revogação de MPU",
  "MOD MPU": "Modulação de MPU",
  "REL": "Relaxamento da prisão",
  "REV": "Revogação da prisão",
  "MS": "Mandado de Segurança",
};

/**
 * Extrai o tipo de ato do nome de um arquivo
 * Tenta match por prefixo (ex: "RAC - FULANO.pdf" → "Resposta à Acusação")
 */
export function detectarAtoDoNomeArquivo(fileName: string): string | null {
  const name = fileName.replace(/\.(pdf|docx?)$/i, "").trim();

  // Ordenar prefixos por comprimento decrescente (match mais específico primeiro)
  const prefixos = Object.entries(FILE_PREFIX_TO_ATO)
    .sort(([a], [b]) => b.length - a.length);

  for (const [prefix, ato] of prefixos) {
    // Match case-insensitive no início do nome, seguido de separador
    const regex = new RegExp(`^_?${prefix.replace(/\s+/g, "\\s+")}\\s*[-–—\\s]`, "i");
    if (regex.test(name)) {
      return ato;
    }
  }

  return null;
}

/**
 * Extrai número de processo do nome de um arquivo
 * Padrões: "8009547-53.2024.8.05.0039" ou "8009547" (parcial)
 */
export function extrairProcessoDoNomeArquivo(fileName: string): string | null {
  // Padrão completo CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  const fullMatch = fileName.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  if (fullMatch) return fullMatch[1];

  // Padrão parcial: 7 dígitos seguidos de hífen e 2 dígitos
  const partialMatch = fileName.match(/(\d{7}-\d{2})/);
  if (partialMatch) return partialMatch[1];

  return null;
}
