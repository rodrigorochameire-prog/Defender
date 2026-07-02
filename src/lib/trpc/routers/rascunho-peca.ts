export const PECA_SUGERIDA_TO_REFERENCE: Record<string, { vvd?: string; juri?: string }> = {
  memoriais: { vvd: "vvd_alegacoes_finais", juri: "alegacoes_finais_juri" },
  resposta_acusacao: { vvd: "vvd_analise_para_ra" },
  apelacao: { vvd: "vvd_apelacao", juri: "apelacao_pos_juri" },
  rese: { vvd: "vvd_contrarrazoes_rese" },
  contrarrazoes: { vvd: "vvd_contrarrazoes_apelacao" },
};
const JURI_ATRIBS = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);
const VVD_ATRIBS = new Set(["VVD_CAMACARI"]);

export function refParaAtribuicao(pecaSugerida: string, atribuicao: string): string | null {
  const m = PECA_SUGERIDA_TO_REFERENCE[pecaSugerida];
  if (!m) return null;
  if (JURI_ATRIBS.has(atribuicao)) return m.juri ?? null;
  if (VVD_ATRIBS.has(atribuicao)) return m.vvd ?? null;
  return null;
}

export function isElegivelRascunho(input: {
  statusAnalise: string | null; pecaSugerida: string | null | undefined; atribuicao: string;
}): { ok: true } | { ok: false; motivo: string } {
  if (input.statusAnalise !== "concluida")
    return { ok: false, motivo: "Análise profunda ainda não concluída." };
  if (!input.pecaSugerida)
    return { ok: false, motivo: "Demanda sem peça sugerida." };
  if (!refParaAtribuicao(input.pecaSugerida, input.atribuicao))
    return { ok: false, motivo: "Peça/atribuição fora do MVP (só Júri/VVD com peça mapeável)." };
  return { ok: true };
}

export function buildRascunhoTaskMeta(input: {
  demandaId: number; pecaSugerida: string; atribuicao: string; linhasMestras: string;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId, pecaSugerida: input.pecaSugerida,
    atribuicao: input.atribuicao, linhasMestras: input.linhasMestras, fonte: "fase2c2b",
  });
}
