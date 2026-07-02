/**
 * Lógica pura do wizard "Produzir peça" (C2 fatia 5).
 *
 * Deriva os 3 estágios e a próxima ação de orquestração a partir dos dois status
 * ao vivo (análise profunda + rascunho de peça). O modal só renderiza o resultado
 * — nada de estado escondido aqui, tudo testável isolado.
 */

export type AnaliseStatus =
  | "baixando_autos"
  | "analisando"
  | "concluida"
  | "erro"
  | null
  | undefined;

export type RascunhoStatus = "rascunhando" | "pronto" | "erro" | null | undefined;

export type StageState = "pendente" | "ativo" | "feito" | "erro";

export interface Stage {
  key: "autos" | "analise" | "rascunho";
  label: string;
  state: StageState;
}

export type NextAction = "iniciar-analise" | "iniciar-rascunho" | "nenhuma";

export interface ProduzirPecaState {
  stages: Stage[];
  /** Algum estágio em andamento. */
  running: boolean;
  /** Rascunho pronto (fim feliz). */
  done: boolean;
  /** Qual estágio falhou, se algum. */
  failedStage: "analise" | "rascunho" | null;
  /** O que o orquestrador deve disparar em seguida (só quando orquestrando). */
  nextAction: NextAction;
}

function autosState(a: AnaliseStatus): StageState {
  if (a === "baixando_autos") return "ativo";
  if (a == null) return "pendente";
  // "analisando" | "concluida" | "erro": o download já aconteceu (best-effort).
  return "feito";
}

function analiseState(a: AnaliseStatus): StageState {
  if (a === "analisando") return "ativo";
  if (a === "concluida") return "feito";
  if (a === "erro") return "erro";
  return "pendente";
}

function rascunhoState(r: RascunhoStatus): StageState {
  if (r === "rascunhando") return "ativo";
  if (r === "pronto") return "feito";
  if (r === "erro") return "erro";
  return "pendente";
}

export function computeProduzirPecaState(
  analise: AnaliseStatus,
  rascunho: RascunhoStatus,
  opts: { orchestrating: boolean } = { orchestrating: false },
): ProduzirPecaState {
  const stages: Stage[] = [
    { key: "autos", label: "Baixar autos", state: autosState(analise) },
    { key: "analise", label: "Analisar", state: analiseState(analise) },
    { key: "rascunho", label: "Rascunhar peça", state: rascunhoState(rascunho) },
  ];

  const running = stages.some((s) => s.state === "ativo");
  const done = rascunho === "pronto";
  const failedStage: ProduzirPecaState["failedStage"] =
    analise === "erro" ? "analise" : rascunho === "erro" ? "rascunho" : null;

  let nextAction: NextAction = "nenhuma";
  if (opts.orchestrating && !done) {
    if (analise == null) nextAction = "iniciar-analise";
    else if (analise === "concluida" && rascunho == null) nextAction = "iniciar-rascunho";
  }

  return { stages, running, done, failedStage, nextAction };
}
