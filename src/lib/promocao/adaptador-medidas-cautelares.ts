import type { CandidatoCautelar } from "./tipos-cautelar";

/**
 * Adaptador PURO: extrai candidatos a cautelar de
 * `analysisData.pessoas[].medidasCautelares[]`, achatando TODAS as medidas de
 * TODAS as pessoas do processo. Cada string vira um candidato.
 *
 * Defensivo no boundary jsonb: `analysisData` ausente/sem `pessoas` → []. Pessoas
 * sem `medidasCautelares` (ou não-array) são ignoradas. Entradas não-string ou
 * vazias são filtradas. `fonteRef` = `analysis:<processoId>`.
 */
export function candidatosDeMedidasCautelares(
  processoId: number,
  analysisData: Record<string, unknown> | null,
): CandidatoCautelar[] {
  const pessoas =
    analysisData && Array.isArray((analysisData as Record<string, unknown>).pessoas)
      ? ((analysisData as Record<string, unknown>).pessoas as Array<Record<string, unknown>>)
      : [];

  const out: CandidatoCautelar[] = [];
  for (const p of pessoas) {
    if (!Array.isArray(p.medidasCautelares)) continue;
    for (const m of p.medidasCautelares as unknown[]) {
      if (typeof m !== "string" || !m.trim()) continue;
      out.push({
        medida: m.trim(),
        fonteRef: `analysis:${processoId}`,
        confianca: 0.75,
      });
    }
  }
  return out;
}
