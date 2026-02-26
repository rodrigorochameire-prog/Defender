/**
 * Mapeamento: Tipo de ato OMBUDS → Tipo de fase processual no Solar
 *
 * O Solar tem 263 tipos de fase (TIPO_MAP em solar_selectors.py).
 * Este mapeamento traduz os atos do OMBUDS para os tipos de fase
 * que o Solar aceita ao criar uma nova fase processual.
 *
 * Referência: enrichment-engine/services/solar_write_service.py
 */

export interface SolarPhaseConfig {
  /** Tipo de fase no Solar (nome exato do TIPO_MAP) */
  tipo: string;
  /** Qualificação da anotação, se aplicável */
  qualificacao?: "ANOTACOES" | "ANDAMENTO" | "DESPACHO" | "DILIGENCIAS" | "LEMBRETE" | "TENTATIVA_CONTATO";
  /** Descrição padrão para a fase (template, pode usar {nome} para nome do assistido) */
  descricaoTemplate?: string;
}

/**
 * Mapeamento ato → configuração de fase Solar
 * Quando o ato não tem correspondência direta, usa "Petição" como fallback.
 */
export const ATO_TO_SOLAR_PHASE: Record<string, SolarPhaseConfig> = {
  // === Petições (a maioria dos atos gera fase "Petição") ===
  "Resposta à Acusação": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Alegações finais": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Memoriais": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Contestação": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Petição intermediária": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Habeas Corpus": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Mandado de Segurança": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Quesitos": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Juntada de documentos": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Prosseguimento do feito": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Desaforamento": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Restituição de coisa": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },

  // === Recursos ===
  "Apelação": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Razões de apelação": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Contrarrazões de apelação": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "RESE": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Razões de RESE": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Contrarrazões de RESE": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Embargos de Declaração": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Contrarrazões de ED": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },
  "Agravo em Execução": {
    tipo: "Recurso",
    descricaoTemplate: "Petição - {nome}",
  },

  // === Prisão e cautelares ===
  "Revogação da prisão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Relaxamento da prisão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Relaxamento e revogação de prisão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Relaxamento e revogação": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Substituição da prisão por cautelar": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Revogação de MPU": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Modulação de MPU": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Revogação de monitoramento": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Revogação do monitoramento": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },

  // === Diligências ===
  "Diligências do 422": {
    tipo: "Diligência",
    descricaoTemplate: "Petição - {nome}",
  },
  "Diligências do réu": {
    tipo: "Diligência",
    descricaoTemplate: "Petição - {nome}",
  },
  "Incidente de insanidade": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Requerimento audiência": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Testemunhas": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Rol de Testemunhas": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },

  // === Audiências (fase "Audiência" no Solar) ===
  "Audiência": {
    tipo: "Audiência",
    descricaoTemplate: "Audiência - {nome}",
  },
  "Sessão de Julgamento": {
    tipo: "Audiência",
    descricaoTemplate: "Sessão de Julgamento - {nome}",
  },

  // === Execução Penal ===
  "Requerimento de progressão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Designação de justificação": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Designação admonitória": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Transferência de unidade": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Indulto": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Manifestação contra reconversão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Manifestação contra regressão": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },
  "Cumprimento ANPP": {
    tipo: "Petição",
    descricaoTemplate: "Petição - {nome}",
  },

  // === Ciências (geralmente não geram fase, mas se necessário) ===
  "Ciência": {
    tipo: "Petição",
    qualificacao: "ANDAMENTO",
    descricaoTemplate: "Ciência - {nome}",
  },
};

// Fallback quando o ato não tem mapeamento
export const SOLAR_PHASE_FALLBACK: SolarPhaseConfig = {
  tipo: "Petição",
  descricaoTemplate: "Petição - {nome}",
};

/**
 * Resolve a configuração de fase Solar para um ato
 */
export function resolverFaseSolar(ato: string): SolarPhaseConfig {
  return ATO_TO_SOLAR_PHASE[ato] || SOLAR_PHASE_FALLBACK;
}

/**
 * Gera a descrição da fase com o nome do assistido
 */
export function gerarDescricaoFase(ato: string, nomeAssistido: string): string {
  const config = resolverFaseSolar(ato);
  const template = config.descricaoTemplate || "Petição - {nome}";
  return template.replace("{nome}", nomeAssistido.toUpperCase());
}
