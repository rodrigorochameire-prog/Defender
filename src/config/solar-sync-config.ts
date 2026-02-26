/**
 * Configuração de sincronização Solar por atribuição
 *
 * Define quais operações do Solar são habilitadas para cada atribuição.
 * Usado por: protocolarNoSolar, sincronizarComSolar, UI components.
 */

// ==========================================
// TIPOS
// ==========================================

export interface SolarSyncConfig {
  /** Criar fases processuais no Solar */
  syncFases: boolean;
  /** Enviar anotações ao Solar */
  syncAnotacoes: boolean;
  /** Upload de documentos ao Solar */
  syncDocumentos: boolean;
  /** Permitir protocolar automaticamente */
  autoProtocolar: boolean;
  /** Aplicar resumo/truncamento antes de enviar texto */
  resumirTexto: boolean;
  /** Limite de caracteres para anotações no Solar */
  maxCharsAnotacao: number;
}

// ==========================================
// CONFIGURAÇÃO POR ATRIBUIÇÃO
// ==========================================

/**
 * Mapeamento atribuição → configuração Solar
 *
 * Regras gerais:
 * - Atribuições criminais penais: sync completo
 * - Substituição criminal: sync parcial (sem anotações — volume alto)
 * - Substituição cível: sem sync (Solar é sistema penal)
 * - Grupo Júri: sem anotações (usa apenas plenários)
 */
export const SOLAR_SYNC_CONFIG: Record<string, SolarSyncConfig> = {
  JURI_CAMACARI: {
    syncFases: true,
    syncAnotacoes: true,
    syncDocumentos: true,
    autoProtocolar: true,
    resumirTexto: true,
    maxCharsAnotacao: 1800,
  },
  GRUPO_JURI: {
    syncFases: true,
    syncAnotacoes: false,
    syncDocumentos: true,
    autoProtocolar: true,
    resumirTexto: true,
    maxCharsAnotacao: 1800,
  },
  VVD_CAMACARI: {
    syncFases: true,
    syncAnotacoes: true,
    syncDocumentos: true,
    autoProtocolar: true,
    resumirTexto: true,
    maxCharsAnotacao: 1800,
  },
  EXECUCAO_PENAL: {
    syncFases: true,
    syncAnotacoes: true,
    syncDocumentos: true,
    autoProtocolar: true,
    resumirTexto: true,
    maxCharsAnotacao: 1800,
  },
  SUBSTITUICAO: {
    syncFases: true,
    syncAnotacoes: false,
    syncDocumentos: true,
    autoProtocolar: true,
    resumirTexto: true,
    maxCharsAnotacao: 1800,
  },
  SUBSTITUICAO_CIVEL: {
    syncFases: false,
    syncAnotacoes: false,
    syncDocumentos: false,
    autoProtocolar: false,
    resumirTexto: false,
    maxCharsAnotacao: 1800,
  },
};

// ==========================================
// CONFIG PADRÃO (fallback)
// ==========================================

/** Config padrão para atribuições não mapeadas — sync completo com resumo */
const DEFAULT_CONFIG: SolarSyncConfig = {
  syncFases: true,
  syncAnotacoes: true,
  syncDocumentos: true,
  autoProtocolar: true,
  resumirTexto: true,
  maxCharsAnotacao: 1800,
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Retorna a configuração Solar para uma atribuição.
 * Se não mapeada, retorna config padrão (sync completo).
 */
export function getSyncConfig(atribuicao: string): SolarSyncConfig {
  return SOLAR_SYNC_CONFIG[atribuicao] || DEFAULT_CONFIG;
}

/**
 * Verifica se uma ação específica deve ser sincronizada para a atribuição.
 *
 * @example
 *   shouldSync("JURI_CAMACARI", "syncDocumentos")  // true
 *   shouldSync("SUBSTITUICAO_CIVEL", "syncFases")   // false
 *   shouldSync("SUBSTITUICAO", "syncAnotacoes")      // false
 */
export function shouldSync(
  atribuicao: string,
  action: keyof SolarSyncConfig
): boolean {
  const config = getSyncConfig(atribuicao);
  const value = config[action];
  return typeof value === "boolean" ? value : true;
}

/**
 * Retorna o limite de caracteres para anotações de uma atribuição.
 */
export function getMaxCharsAnotacao(atribuicao: string): number {
  return getSyncConfig(atribuicao).maxCharsAnotacao;
}

/**
 * Labels legíveis para cada atribuição (usado em UIs de config)
 */
export const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial de Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Substituição Cível",
};
