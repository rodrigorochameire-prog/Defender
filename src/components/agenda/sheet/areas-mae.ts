/**
 * Áreas-mãe do workspace do evento (spec §D).
 *
 * O EventDetailSheet hoje é um scroll monolítico de ~26 seções. A spec pede que
 * ele se organize em 5 "modos de trabalho" — cada seção existente pertence a uma
 * área-mãe. Este módulo é só o MAPEAMENTO (dados puros, sem React): a fonte única
 * para o futuro tab bar interno filtrar quais seções aparecem por modo.
 *
 * Princípio: não reescrever seções — apenas agrupá-las. O `Record<SecaoId, AreaMae>`
 * força (em tempo de compilação) que toda seção tenha uma área.
 */

import type { SecaoId } from "./secoes-manifest";

export type AreaMae = "imputacao" | "intimacoes" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao";

/** Ordem de exibição das abas no workspace. */
export const AREA_ORDER: AreaMae[] = ["imputacao", "intimacoes", "depoimentos", "laudos-docs", "estrategia", "execucao"];

export const AREA_LABELS: Record<AreaMae, string> = {
  imputacao: "Caso",
  intimacoes: "Intimações",
  depoimentos: "Depoimentos",
  "laudos-docs": "Laudos e documentos",
  estrategia: "Estratégia e teses",
  execucao: "Execução",
};

/**
 * Seção → área-mãe. Exaustivo por construção (Record sobre o union SecaoId).
 */
export const SECAO_TO_AREA: Record<SecaoId, AreaMae> = {
  // IMPUTAÇÃO — contexto do caso, denúncia, rol de testemunhas
  resumo: "imputacao",
  "resumo-audiencia": "imputacao",
  "motivo-designacao": "imputacao",
  sintese: "imputacao",
  imputacao: "imputacao",
  fatos: "imputacao",
  depoentes: "imputacao",

  // INTIMAÇÕES — status de comunicação por depoente
  intimacao: "intimacoes",

  // DEPOIMENTOS — oitiva, depoimento IP e juízo
  depoimentos: "depoimentos",

  // LAUDOS E DOCUMENTOS — provas técnicas, relatos, medidas
  laudos: "laudos-docs",
  documentos: "laudos-docs",
  "relato-vitima": "laudos-docs",
  medidas: "laudos-docs",
  versao: "laudos-docs",
  midia: "laudos-docs",

  // ESTRATÉGIA E TESES — preparação jurídica
  dossie: "estrategia",
  "analise-ia": "estrategia",
  contradicoes: "estrategia",
  teses: "estrategia",
  "requerimento-defesa": "estrategia",

  // EXECUÇÃO — condução ao vivo e medidas processuais
  ata: "execucao",
  "anotacoes-rapidas": "execucao",
  investigacao: "execucao",
  pendencias: "execucao",
  preventiva: "execucao",
  cautelares: "execucao",
};

export function areaDaSecao(id: SecaoId): AreaMae {
  return SECAO_TO_AREA[id];
}

/** Filtra os ids visíveis pertencentes a uma área, preservando a ordem de entrada. */
export function secoesDaArea(area: AreaMae, visiveis: SecaoId[]): SecaoId[] {
  return visiveis.filter((id) => SECAO_TO_AREA[id] === area);
}

export interface WorkspaceTabState {
  /** Áreas com ao menos uma seção visível (modos vazios excluídos). */
  areasComConteudo: AreaMae[];
  /** Aba efetivamente ativa: a pedida, se tiver conteúdo; senão a 1ª com conteúdo. */
  tabAtiva: AreaMae;
  /** Seções de espinha (topo) da aba ativa. */
  espinhaDaTab: SecaoId[];
  /** Seções do grupo Contexto (AIJ) da aba ativa. */
  contextoDaTab: SecaoId[];
  /** Nº de seções visíveis por área. */
  areaCounts: Record<AreaMae, number>;
}

/**
 * Particiona as seções visíveis do workspace nos 5 modos de trabalho e resolve a
 * aba ativa. Lógica pura (testável) extraída do EventDetailSheet — preserva o
 * split espinha/Contexto do AIJ dentro de cada modo.
 */
export function computeWorkspaceTabs(args: {
  secoesVisiveis: SecaoId[];
  espinhaVisiveis: SecaoId[];
  contextoIds: SecaoId[];
  activeTab: AreaMae;
}): WorkspaceTabState {
  const { secoesVisiveis, espinhaVisiveis, contextoIds, activeTab } = args;

  const areaCounts = AREA_ORDER.reduce((acc, a) => {
    acc[a] = secoesVisiveis.filter((id) => SECAO_TO_AREA[id] === a).length;
    return acc;
  }, {} as Record<AreaMae, number>);

  const areasComConteudo = AREA_ORDER.filter((a) => areaCounts[a] > 0);
  const tabAtiva: AreaMae = areasComConteudo.includes(activeTab)
    ? activeTab
    : (areasComConteudo[0] ?? "imputacao");

  return {
    areaCounts,
    areasComConteudo,
    tabAtiva,
    espinhaDaTab: espinhaVisiveis.filter((id) => SECAO_TO_AREA[id] === tabAtiva),
    contextoDaTab: contextoIds.filter((id) => SECAO_TO_AREA[id] === tabAtiva),
  };
}
