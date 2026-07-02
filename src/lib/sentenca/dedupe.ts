export type DedupeInput = {
  processoId: number | null;
  pjeDocumentoId: string | null;
  tipoDecisao: string | null;
  dataSentenca: string | null;
  demandaOrigemId: number | null;
};
export type DedupeKey =
  | { by: "doc"; processoId: number; pjeDocumentoId: string }
  | { by: "tipo_data"; processoId: number; tipoDecisao: string; dataSentenca: string }
  | { by: "demanda"; demandaOrigemId: number };

export function resolveSentencaDedupe(i: DedupeInput): DedupeKey {
  if (i.processoId != null && i.pjeDocumentoId)
    return { by: "doc", processoId: i.processoId, pjeDocumentoId: i.pjeDocumentoId };
  if (i.processoId != null && i.tipoDecisao && i.dataSentenca)
    return { by: "tipo_data", processoId: i.processoId, tipoDecisao: i.tipoDecisao, dataSentenca: i.dataSentenca };
  if (i.demandaOrigemId != null) return { by: "demanda", demandaOrigemId: i.demandaOrigemId };
  throw new Error("resolveSentencaDedupe: insufficient keys to dedupe");
}
