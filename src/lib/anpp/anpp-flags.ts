/**
 * Flag ANPP (Fase X) — função pura, pró-defesa.
 * "ANPP cabível não oferecida": quando os requisitos do art. 28-A CPP estão
 * presentes mas o MP não ofereceu o acordo — argumento recursal/de nulidade.
 */

export interface AnppBloco {
  penaMinimaInferior4Anos?: boolean;
  semViolenciaGraveAmeaca?: boolean;
  primario?: boolean;
  confessou?: boolean;
  oferecido?: boolean;
  homologado?: boolean;
  cumprido?: boolean;
  descumprido?: boolean;
}

export interface AnppFlag {
  tipo: "anpp-cabivel-nao-oferecido";
  nivel: "emerald";
  motivo: string;
}

/**
 * Cabimento (art. 28-A CPP): pena mínima < 4 anos, sem violência/grave ameaça,
 * não reincidente em crime doloso. Confissão é requisito para FECHAR o acordo,
 * mas o não-oferecimento quando os requisitos OBJETIVOS estão presentes já é
 * argumentável. Liga quando cabível e NÃO oferecido.
 */
export function detectAnppCabivelNaoOferecido(anpp: AnppBloco | null | undefined): AnppFlag | null {
  if (!anpp) return null;
  const cabivel =
    anpp.penaMinimaInferior4Anos === true &&
    anpp.semViolenciaGraveAmeaca === true &&
    anpp.primario === true;
  if (!cabivel) return null;
  if (anpp.oferecido === true) return null; // já foi oferecido → sem flag

  return {
    tipo: "anpp-cabivel-nao-oferecido",
    nivel: "emerald",
    motivo:
      "ANPP aparentemente cabível (pena mín. <4a, sem violência/grave ameaça, primário) e não oferecida — argumento recursal (art. 28-A CPP).",
  };
}
