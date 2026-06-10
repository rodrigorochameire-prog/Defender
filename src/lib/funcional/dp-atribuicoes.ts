// Mapa DP → atribuição(ões) padrão. A maioria das DPs tem vara determinada;
// a 7ª/9ª DP de Camaçari são peculiares (atuam juntas em Júri+EP e VVD), então
// pedem ESCOLHA manual do escopo a cada substituição.

export interface DPConfig {
  /** Rótulo da unidade. */
  unidade: string;
  /** Atribuições sugeridas por padrão. */
  atribuicoes: string[];
  /** Quando true, a UI oferece opções e o usuário escolhe o escopo. */
  escolhaManual?: boolean;
  /** Opções de escopo apresentadas quando escolhaManual. */
  opcoesEscopo?: { label: string; atribuicoes: string[] }[];
}

export const DP_ATRIBUICOES: Record<string, DPConfig> = {
  "7º DP de Camaçari": {
    unidade: "7º DP de Camaçari",
    atribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL"],
    escolhaManual: true,
    opcoesEscopo: [
      { label: "Júri e Execuções Penais", atribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL"] },
      { label: "Violência Doméstica (VVD)", atribuicoes: ["VVD_CAMACARI"] },
      { label: "Júri, EP e VVD (atuação conjunta)", atribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL", "VVD_CAMACARI"] },
    ],
  },
  "9º DP de Camaçari": {
    unidade: "9º DP de Camaçari",
    atribuicoes: ["VVD_CAMACARI"],
    escolhaManual: true,
    opcoesEscopo: [
      { label: "Violência Doméstica (VVD)", atribuicoes: ["VVD_CAMACARI"] },
      { label: "Júri e Execuções Penais", atribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL"] },
      { label: "Júri, EP e VVD (atuação conjunta)", atribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL", "VVD_CAMACARI"] },
    ],
  },
};

/** Lista de unidades conhecidas para o seletor (livre para digitar outras). */
export const UNIDADES_CONHECIDAS = Object.keys(DP_ATRIBUICOES);

export const TIPOS_SUBSTITUICAO = [
  { value: "automatica", label: "Automática" },
  { value: "cumulativa", label: "Cumulativa" },
  { value: "extraordinaria", label: "Extraordinária" },
] as const;

export const STATUS_SUBSTITUICAO = [
  { value: "em_andamento", label: "Em andamento", color: "amber" },
  { value: "concluida", label: "Concluída", color: "sky" },
  { value: "oficiada", label: "Oficiada", color: "violet" },
  { value: "paga", label: "Paga", color: "emerald" },
] as const;
