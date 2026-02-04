/**
 * Configuração de Perfis de Defensores
 * Define as atribuições e configurações individualizadas para cada defensor
 */

import type { Assignment } from "@/contexts/assignment-context";

// ==========================================
// TIPOS
// ==========================================

export interface DefensorConfig {
  id: string;
  nome: string;
  nomeExibicao: string; // "Dr. Rodrigo", "Dra. Juliane", etc.
  email?: string;

  // Atribuição Principal
  atribuicaoPrincipal: Assignment;

  // Atribuições Secundárias (opcionais)
  atribuicoesSecundarias: Assignment[];

  // Configuração de Equipe
  equipe?: {
    // ID do defensor parceiro (para trabalho conjunto como você e Dra. Juliane)
    parceiroId?: string;
    // Se demandas são compartilhadas com o parceiro
    demandasCompartilhadas?: boolean;
  };

  // Módulos especiais habilitados
  modulosEspeciais?: string[];

  // Tema/cor preferencial (opcional)
  corTema?: string;
}

// ==========================================
// CONFIGURAÇÃO DOS DEFENSORES
// ==========================================

export const DEFENSORES_CONFIG: Record<string, DefensorConfig> = {
  // Dr. Rodrigo - Especializada (Júri, EP, VVD)
  "rodrigo": {
    id: "rodrigo",
    nome: "Rodrigo Rocha Meire",
    nomeExibicao: "Dr. Rodrigo",
    atribuicaoPrincipal: "JURI_CAMACARI",
    atribuicoesSecundarias: [
      "EXECUCAO_PENAL",
      "VVD_CAMACARI",
      "SUBSTITUICAO",        // Substituição Criminal (Criminal Geral)
      "SUBSTITUICAO_CIVEL",  // Substituição Cível
      "PETICIONAMENTO",      // Peticionamento Integrado
      "CURADORIA",           // Curadoria
      "GRUPO_JURI",          // Grupo do Júri
    ],
    equipe: {
      parceiroId: "juliane",
      demandasCompartilhadas: true,
    },
    modulosEspeciais: ["cockpit_juri", "banco_jurados", "osint", "logica_argumentacao"],
  },

  // Dra. Juliane - Especializada (Júri, EP, VVD) - Parceira do Dr. Rodrigo
  "juliane": {
    id: "juliane",
    nome: "Juliane",
    nomeExibicao: "Dra. Juliane",
    atribuicaoPrincipal: "JURI_CAMACARI",
    atribuicoesSecundarias: [
      "EXECUCAO_PENAL",
      "VVD_CAMACARI",
      "SUBSTITUICAO",        // Substituição Criminal (Criminal Geral)
      "SUBSTITUICAO_CIVEL",  // Substituição Cível
      "PETICIONAMENTO",      // Peticionamento Integrado
      "CURADORIA",           // Curadoria
      "GRUPO_JURI",          // Grupo do Júri
    ],
    equipe: {
      parceiroId: "rodrigo",
      demandasCompartilhadas: true,
    },
    modulosEspeciais: ["cockpit_juri", "banco_jurados", "osint", "logica_argumentacao"],
  },

  // Dr. Danilo - Criminal Geral é o principal
  "danilo": {
    id: "danilo",
    nome: "Danilo",
    nomeExibicao: "Dr. Danilo",
    atribuicaoPrincipal: "SUBSTITUICAO", // Criminal Geral
    atribuicoesSecundarias: [
      "SUBSTITUICAO_CIVEL",  // Substituição Cível
      "PETICIONAMENTO",      // Peticionamento Integrado
    ],
    modulosEspeciais: ["prazos", "multicomarca"],
  },

  // Dra. Cristiane - Criminal Geral é o principal
  "cristiane": {
    id: "cristiane",
    nome: "Cristiane",
    nomeExibicao: "Dra. Cristiane",
    atribuicaoPrincipal: "SUBSTITUICAO", // Criminal Geral
    atribuicoesSecundarias: [
      "SUBSTITUICAO_CIVEL",  // Substituição Cível
      "PETICIONAMENTO",      // Peticionamento Integrado
    ],
    modulosEspeciais: ["prazos", "multicomarca"],
  },
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Retorna a configuração de um defensor pelo ID ou email
 */
export function getDefensorConfig(identificador: string): DefensorConfig | undefined {
  // Primeiro tenta pelo ID direto
  if (DEFENSORES_CONFIG[identificador.toLowerCase()]) {
    return DEFENSORES_CONFIG[identificador.toLowerCase()];
  }

  // Depois tenta pelo email (parte antes do @)
  const emailPrefix = identificador.toLowerCase().split("@")[0];

  // Busca por correspondência parcial no nome
  const defensor = Object.values(DEFENSORES_CONFIG).find(d =>
    d.nome.toLowerCase().includes(emailPrefix) ||
    d.nomeExibicao.toLowerCase().includes(emailPrefix) ||
    d.email?.toLowerCase().includes(identificador.toLowerCase())
  );

  return defensor;
}

/**
 * Retorna a configuração de um defensor pelo nome de usuário do sistema
 */
export function getDefensorByUserName(userName: string): DefensorConfig | undefined {
  const normalizedName = userName.toLowerCase();

  // Mapeamento de nomes conhecidos
  if (normalizedName.includes("rodrigo")) return DEFENSORES_CONFIG["rodrigo"];
  if (normalizedName.includes("juliane")) return DEFENSORES_CONFIG["juliane"];
  if (normalizedName.includes("danilo")) return DEFENSORES_CONFIG["danilo"];
  if (normalizedName.includes("cristiane")) return DEFENSORES_CONFIG["cristiane"];

  return undefined;
}

/**
 * Verifica se dois defensores são parceiros de equipe
 */
export function saoParceiroDeEquipe(defensor1Id: string, defensor2Id: string): boolean {
  const defensor1 = DEFENSORES_CONFIG[defensor1Id.toLowerCase()];
  if (!defensor1?.equipe?.parceiroId) return false;
  return defensor1.equipe.parceiroId === defensor2Id.toLowerCase();
}

/**
 * Retorna todas as atribuições disponíveis para um defensor
 */
export function getAtribuicoesDefensor(defensorId: string): Assignment[] {
  const defensor = DEFENSORES_CONFIG[defensorId.toLowerCase()];
  if (!defensor) return [];

  return [defensor.atribuicaoPrincipal, ...defensor.atribuicoesSecundarias];
}

/**
 * Verifica se um defensor tem acesso a uma atribuição específica
 */
export function defensorTemAtribuicao(defensorId: string, atribuicao: Assignment): boolean {
  const atribuicoes = getAtribuicoesDefensor(defensorId);
  return atribuicoes.includes(atribuicao);
}

/**
 * Retorna o parceiro de equipe de um defensor (se houver)
 */
export function getParceiroEquipe(defensorId: string): DefensorConfig | undefined {
  const defensor = DEFENSORES_CONFIG[defensorId.toLowerCase()];
  if (!defensor?.equipe?.parceiroId) return undefined;

  return DEFENSORES_CONFIG[defensor.equipe.parceiroId];
}

/**
 * Lista todos os defensores configurados
 */
export function listarDefensores(): DefensorConfig[] {
  return Object.values(DEFENSORES_CONFIG);
}

// ==========================================
// DESCRIÇÕES DAS ATRIBUIÇÕES PARA UI
// ==========================================

export const ATRIBUICAO_DESCRICOES: Record<Assignment, { label: string; descricao: string; emoji: string }> = {
  JURI_CAMACARI: {
    label: "Júri Camaçari",
    descricao: "Vara do Tribunal do Júri da Comarca de Camaçari",
    emoji: "🏛️",
  },
  VVD_CAMACARI: {
    label: "Violência Doméstica",
    descricao: "Vara de Violência Doméstica e Familiar",
    emoji: "💜",
  },
  EXECUCAO_PENAL: {
    label: "Execução Penal",
    descricao: "Vara de Execução Penal - Benefícios e Incidentes",
    emoji: "⛓️",
  },
  SUBSTITUICAO: {
    label: "Criminal Geral",
    descricao: "Substituição em varas criminais (Criminal Geral)",
    emoji: "🔄",
  },
  SUBSTITUICAO_CIVEL: {
    label: "Cível/Outros",
    descricao: "Substituição em varas cíveis, família e outras",
    emoji: "⚖️",
  },
  GRUPO_JURI: {
    label: "Grupo do Júri",
    descricao: "Grupo Especial do Júri - Plenários pelo Estado",
    emoji: "🏆",
  },
  CURADORIA: {
    label: "Curadoria",
    descricao: "Curadoria Especial - Gestão de curatelados",
    emoji: "🎓",
  },
  PETICIONAMENTO: {
    label: "Peticionamento",
    descricao: "Peticionamento Integrado (PJe, SAJ, SEEU)",
    emoji: "📝",
  },
};
