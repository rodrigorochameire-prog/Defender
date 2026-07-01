export const ATRIB_ELEGIVEIS_2C = ["JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI"] as const;

export function isElegivel2c(input: {
  atribuicao: string;
  pecaSugerida: string | null | undefined;
}): { ok: true } | { ok: false; motivo: string } {
  if (!(ATRIB_ELEGIVEIS_2C as readonly string[]).includes(input.atribuicao)) {
    return { ok: false, motivo: "Atribuição fora do MVP (só Júri/VVD por ora)." };
  }
  if (!input.pecaSugerida) {
    return { ok: false, motivo: "Demanda não está marcada como 'cabe peça' (sem peca_sugerida)." };
  }
  return { ok: true };
}

export function buildBrowserTaskMeta(input: {
  demandaId: number; processoId: number; assistidoId: number; atribuicao: string; defensorId: number;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId,
    processoId: input.processoId,
    assistidoId: input.assistidoId,
    atribuicao: input.atribuicao,
    defensorId: input.defensorId,
    modo: "cdp",
  });
}
