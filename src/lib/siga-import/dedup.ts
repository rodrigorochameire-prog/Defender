export type ExistingAusencia = { id: number; nSiga: string | null; situacao: string; dataInicio: string; dataFim: string; motivo: string | null };
export type Decisao = { decisao: "nova" | "ja_importada" | "atualizada"; matchedAusenciaId: number | null };

export function decidir(
  staged: { nSiga: string | null; mapped: { situacao: string; dataInicio: string; dataFim: string; motivo: string | null } },
  porNSiga: Map<string, ExistingAusencia>,
): Decisao {
  if (!staged.nSiga) return { decisao: "nova", matchedAusenciaId: null };
  const ex = porNSiga.get(staged.nSiga);
  if (!ex) return { decisao: "nova", matchedAusenciaId: null };
  const same =
    ex.situacao === staged.mapped.situacao &&
    ex.dataInicio === staged.mapped.dataInicio &&
    ex.dataFim === staged.mapped.dataFim &&
    (ex.motivo ?? null) === (staged.mapped.motivo ?? null);
  return { decisao: same ? "ja_importada" : "atualizada", matchedAusenciaId: ex.id };
}
