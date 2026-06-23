/**
 * Flags de prova sobre objetos apreendidos (Fase V) — funções puras, pró-defesa.
 * Detectam fragilidades probatórias argumentáveis. Conservadoras.
 */

export interface ObjetoFlag {
  tipo: "arma-nao-periciada" | "droga-sem-laudo";
  nivel: "amber";
  motivo: string;
}

/**
 * "Arma não periciada": arma de fogo cujo destino não é perícia → majorante do
 * §2º-A do art. 157 (e a própria materialidade/potencialidade lesiva) é
 * questionável sem laudo pericial.
 */
export function detectArmaNaoPericiada(
  o: { tipo: string },
  p: { destino?: string | null },
): ObjetoFlag | null {
  if (o.tipo !== "arma-fogo") return null;
  if (p.destino === "periciado") return null;
  return {
    tipo: "arma-nao-periciada",
    nivel: "amber",
    motivo: "Arma de fogo não periciada — majorante (§2º-A do art. 157) e potencialidade lesiva questionáveis sem laudo",
  };
}

/**
 * "Droga sem laudo definitivo": substância apreendida sem perícia → prova
 * precária da materialidade (laudo de constatação não basta para condenação).
 */
export function detectDrogaSemLaudo(
  o: { tipo: string },
  p: { destino?: string | null },
): ObjetoFlag | null {
  if (o.tipo !== "droga") return null;
  if (p.destino === "periciado") return null;
  return {
    tipo: "droga-sem-laudo",
    nivel: "amber",
    motivo: "Droga sem laudo definitivo — materialidade precária (laudo de constatação não basta para condenação)",
  };
}

export function avaliarFlagsObjeto(
  o: { tipo: string },
  p: { destino?: string | null },
): ObjetoFlag[] {
  return [detectArmaNaoPericiada(o, p), detectDrogaSemLaudo(o, p)].filter(
    (f): f is ObjetoFlag => f != null,
  );
}
