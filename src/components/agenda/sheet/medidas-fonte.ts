export type FonteMedidas = "banco" | "analysisData" | "nenhuma";

/** Banco (medidas_mpu) é autoritativo; analysisData é fallback informacional. */
export function resolverFonteMedidas(args: { qtdBanco: number; qtdAnalysis: number }): FonteMedidas {
  if (args.qtdBanco > 0) return "banco";
  if (args.qtdAnalysis > 0) return "analysisData";
  return "nenhuma";
}
