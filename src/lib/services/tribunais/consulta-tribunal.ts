/**
 * Serviço de Consulta a Tribunais
 *
 * Este módulo fornece integração com sistemas de tribunais para:
 * - Consulta de movimentações processuais
 * - Verificação de intimações
 * - Download de documentos
 *
 * IMPORTANTE: A implementação real depende de APIs específicas de cada tribunal
 * ou web scraping autorizado. Este módulo fornece a estrutura base.
 */

export interface MovimentacaoProcessual {
  id: string;
  data: Date;
  descricao: string;
  tipo: "intimacao" | "despacho" | "sentenca" | "decisao" | "peticao" | "outros";
  urgente: boolean;
  documentoUrl?: string;
  integra?: string;
}

export interface ConsultaProcessoResult {
  success: boolean;
  processo?: {
    numero: string;
    classe: string;
    assunto: string;
    vara: string;
    comarca: string;
    situacao: string;
    partes: {
      polo: "ativo" | "passivo";
      nome: string;
      tipo: string;
    }[];
    movimentacoes: MovimentacaoProcessual[];
    ultimaAtualizacao: Date;
  };
  error?: string;
}

export interface TribunalConfig {
  id: string;
  nome: string;
  sigla: string;
  url: string;
  apiDisponivel: boolean;
  formatoNumero: RegExp;
}

// Configuração dos tribunais suportados
export const TRIBUNAIS: Record<string, TribunalConfig> = {
  TJBA: {
    id: "tjba",
    nome: "Tribunal de Justica da Bahia",
    sigla: "TJBA",
    url: "https://www.tjba.jus.br",
    apiDisponivel: false,
    formatoNumero: /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  },
  TJMG: {
    id: "tjmg",
    nome: "Tribunal de Justica de Minas Gerais",
    sigla: "TJMG",
    url: "https://www.tjmg.jus.br",
    apiDisponivel: false,
    formatoNumero: /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  },
  TJSP: {
    id: "tjsp",
    nome: "Tribunal de Justica de Sao Paulo",
    sigla: "TJSP",
    url: "https://www.tjsp.jus.br",
    apiDisponivel: false,
    formatoNumero: /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  },
  STJ: {
    id: "stj",
    nome: "Superior Tribunal de Justica",
    sigla: "STJ",
    url: "https://www.stj.jus.br",
    apiDisponivel: true,
    formatoNumero: /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  },
  STF: {
    id: "stf",
    nome: "Supremo Tribunal Federal",
    sigla: "STF",
    url: "https://www.stf.jus.br",
    apiDisponivel: true,
    formatoNumero: /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  },
};

// URLs específicas do TJBA
export const TJBA_URLS = {
  pje1g: "https://pje.tjba.jus.br/pje/login.seam",
  pje2g: "https://pje2g.tjba.jus.br/pje/login.seam",
  esaj: "https://esaj.tjba.jus.br/esaj/portal.do",
  consultaPublica: "https://esaj.tjba.jus.br/cpopg/open.do",
  seeu: "https://seeu.pje.jus.br",
  projudi: "https://projudi.tjba.jus.br",
};

/**
 * Extrai o tribunal do número do processo CNJ
 */
export function extrairTribunalDoProcesso(numeroProcesso: string): string | null {
  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  // Onde TR é o código do tribunal
  const match = numeroProcesso.match(/\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}/);
  if (!match) return null;

  const justica = match[1];
  const tribunal = match[2];

  // Mapear códigos para tribunais
  if (justica === "8") {
    // Justiça Estadual
    const tribunaisEstaduais: Record<string, string> = {
      "05": "TJBA", // Bahia
      "13": "TJMG", // Minas Gerais
      "19": "TJRJ", // Rio de Janeiro
      "26": "TJSP", // São Paulo
    };
    return tribunaisEstaduais[tribunal] || null;
  }

  return null;
}

/**
 * Valida formato do número de processo CNJ
 */
export function validarNumeroProcesso(numero: string): boolean {
  const formatoCNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
  return formatoCNJ.test(numero);
}

/**
 * Formata número do processo para exibição
 */
export function formatarNumeroProcesso(numero: string): string {
  // Remove caracteres não numéricos
  const apenasNumeros = numero.replace(/\D/g, "");

  if (apenasNumeros.length !== 20) return numero;

  // Formata no padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  return `${apenasNumeros.slice(0, 7)}-${apenasNumeros.slice(7, 9)}.${apenasNumeros.slice(9, 13)}.${apenasNumeros.slice(13, 14)}.${apenasNumeros.slice(14, 16)}.${apenasNumeros.slice(16, 20)}`;
}

/**
 * Classe base para consulta a tribunais
 * Deve ser estendida para cada tribunal específico
 */
export abstract class ConsultaTribunal {
  protected config: TribunalConfig;

  constructor(tribunalId: string) {
    const config = TRIBUNAIS[tribunalId];
    if (!config) {
      throw new Error(`Tribunal ${tribunalId} não suportado`);
    }
    this.config = config;
  }

  abstract consultarProcesso(numeroProcesso: string): Promise<ConsultaProcessoResult>;
  abstract consultarMovimentacoes(numeroProcesso: string, ultimaData?: Date): Promise<MovimentacaoProcessual[]>;
}

/**
 * Implementação para TJMG (placeholder - requer integração real)
 */
export class ConsultaTJMG extends ConsultaTribunal {
  constructor() {
    super("TJMG");
  }

  async consultarProcesso(numeroProcesso: string): Promise<ConsultaProcessoResult> {
    // TODO: Implementar integração real com TJMG
    // Opções:
    // 1. API pública do PJe (se disponível)
    // 2. Web scraping autorizado
    // 3. Integração via certificado digital

    console.log(`[TJMG] Consultando processo: ${numeroProcesso}`);

    return {
      success: false,
      error: "Integração com TJMG ainda não implementada. Configure as credenciais de acesso.",
    };
  }

  async consultarMovimentacoes(numeroProcesso: string, ultimaData?: Date): Promise<MovimentacaoProcessual[]> {
    console.log(`[TJMG] Consultando movimentações: ${numeroProcesso}`);
    return [];
  }
}

/**
 * Implementação para TJBA - PJe (placeholder - requer integração real)
 */
export class ConsultaTJBA extends ConsultaTribunal {
  constructor() {
    super("TJBA");
  }

  async consultarProcesso(numeroProcesso: string): Promise<ConsultaProcessoResult> {
    // TODO: Implementar integração real com TJBA/PJe
    // O PJe do TJBA utiliza:
    // 1. PJe 1º Grau: https://pje.tjba.jus.br
    // 2. PJe 2º Grau: https://pje2g.tjba.jus.br
    // 3. Consulta pública via ESAJ: https://esaj.tjba.jus.br

    console.log(`[TJBA] Consultando processo: ${numeroProcesso}`);

    return {
      success: false,
      error: "Integração com TJBA/PJe ainda não implementada. Configure as credenciais de acesso.",
    };
  }

  async consultarMovimentacoes(numeroProcesso: string, ultimaData?: Date): Promise<MovimentacaoProcessual[]> {
    console.log(`[TJBA] Consultando movimentações: ${numeroProcesso}`);
    return [];
  }

  /**
   * Consulta processo no SEEU (Sistema Eletrônico de Execução Unificado)
   */
  async consultarSEEU(numeroProcesso: string): Promise<ConsultaProcessoResult> {
    // O SEEU é o sistema nacional de execução penal
    // URL: https://seeu.pje.jus.br
    console.log(`[SEEU] Consultando execução: ${numeroProcesso}`);

    return {
      success: false,
      error: "Integração com SEEU ainda não implementada. Requer certificado digital.",
    };
  }
}

/**
 * Factory para criar instância do consultor de tribunal
 */
export function criarConsultaTribunal(tribunalId: string): ConsultaTribunal {
  switch (tribunalId.toUpperCase()) {
    case "TJBA":
      return new ConsultaTJBA();
    case "TJMG":
      return new ConsultaTJMG();
    // Adicionar outros tribunais conforme implementação
    default:
      throw new Error(`Tribunal ${tribunalId} não implementado`);
  }
}

/**
 * Verifica novas movimentações para um processo
 */
export async function verificarNovasMovimentacoes(
  numeroProcesso: string,
  ultimaVerificacao?: Date
): Promise<{
  success: boolean;
  novasMovimentacoes: MovimentacaoProcessual[];
  temIntimacao: boolean;
  error?: string;
}> {
  const tribunal = extrairTribunalDoProcesso(numeroProcesso);

  if (!tribunal) {
    return {
      success: false,
      novasMovimentacoes: [],
      temIntimacao: false,
      error: "Não foi possível identificar o tribunal do processo",
    };
  }

  try {
    const consulta = criarConsultaTribunal(tribunal);
    const movimentacoes = await consulta.consultarMovimentacoes(numeroProcesso, ultimaVerificacao);

    const temIntimacao = movimentacoes.some(
      (m) => m.tipo === "intimacao" && m.urgente
    );

    return {
      success: true,
      novasMovimentacoes: movimentacoes,
      temIntimacao,
    };
  } catch (error) {
    return {
      success: false,
      novasMovimentacoes: [],
      temIntimacao: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Tipos de intimação por palavra-chave
 */
export const PALAVRAS_CHAVE_INTIMACAO: Record<string, { tipo: string; prazo: number; urgente: boolean }> = {
  "prazo para manifestacao": { tipo: "manifestacao", prazo: 5, urgente: true },
  "prazo para contestacao": { tipo: "contestacao", prazo: 15, urgente: true },
  "prazo para recurso": { tipo: "recurso", prazo: 5, urgente: true },
  "prazo para alegacoes": { tipo: "alegacoes", prazo: 5, urgente: true },
  "audiencia designada": { tipo: "audiencia", prazo: 0, urgente: true },
  "sentenca proferida": { tipo: "sentenca", prazo: 5, urgente: true },
  "intimacao da defesa": { tipo: "intimacao", prazo: 5, urgente: true },
  "cite-se": { tipo: "citacao", prazo: 10, urgente: true },
  "intime-se": { tipo: "intimacao", prazo: 5, urgente: true },
  "certidao de transito": { tipo: "transito", prazo: 0, urgente: false },
};

/**
 * Analisa descrição da movimentação para detectar intimações
 */
export function analisarMovimentacao(descricao: string): {
  tipoDetectado: string | null;
  prazoSugerido: number;
  urgente: boolean;
} {
  const descricaoLower = descricao.toLowerCase();

  for (const [palavraChave, config] of Object.entries(PALAVRAS_CHAVE_INTIMACAO)) {
    if (descricaoLower.includes(palavraChave)) {
      return {
        tipoDetectado: config.tipo,
        prazoSugerido: config.prazo,
        urgente: config.urgente,
      };
    }
  }

  return {
    tipoDetectado: null,
    prazoSugerido: 0,
    urgente: false,
  };
}
