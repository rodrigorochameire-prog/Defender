/**
 * Flags do histórico penal do assistido (Fase XI) — funções puras.
 * Pró-defesa: detectam argumentos favoráveis ao assistido a partir dos
 * antecedentes estruturados. Conservadoras.
 */

export interface HistoricoPenal {
  primariedade?: "primario" | "reincidente-generico" | "reincidente-especifico";
  condenacoesAnteriores?: Array<{
    delito?: string | null;
    pena?: string | null;
    regime?: string | null;
    dataTransitoJulgado?: string | null;
    extinta?: boolean;
    extintaMotivo?: string | null;
  }>;
  passagensPoliciaisSemCondenacao?: number;
  mausAntecedentesAlegados?: boolean;
  anppAnterior?: boolean;
  observacoes?: string | null;
}

export interface PrimariedadeArguivelFlag {
  motivo: string;
  nivel: "emerald"; // oportunidade/argumento de defesa
}

/**
 * "Primariedade arguível apesar de maus antecedentes": quando se alega maus
 * antecedentes mas NÃO há condenação anterior transitada em julgado — a
 * primariedade técnica é argumentável (antecedentes sem trânsito não a afastam).
 */
export function detectPrimariedadeArguivel(
  hp: HistoricoPenal | null | undefined,
): PrimariedadeArguivelFlag | null {
  if (!hp) return null;
  const condenacoes = hp.condenacoesAnteriores ?? [];
  // Condenação que afasta a primariedade = transitada em julgado e não extinta.
  const temCondenacaoTransitada = condenacoes.some(
    (c) => !!c.dataTransitoJulgado && c.extinta !== true,
  );
  if (temCondenacaoTransitada) return null;

  // Só sinaliza quando há alegação de maus antecedentes OU passagens policiais —
  // ou seja, quando o argumento é útil (há algo a rebater).
  const haAlegacao =
    hp.mausAntecedentesAlegados === true ||
    (hp.passagensPoliciaisSemCondenacao ?? 0) > 0 ||
    hp.primariedade === "reincidente-generico" ||
    hp.primariedade === "reincidente-especifico";
  if (!haAlegacao) return null;

  return {
    nivel: "emerald",
    motivo:
      "Primariedade tecnicamente arguível: não há condenação anterior transitada em julgado — maus antecedentes/passagens não afastam a primariedade.",
  };
}
