import type { CandidatoDelito } from "./tipos-delito";

/** Coerção defensiva de campo jsonb que deveria ser string[]. */
function comoArrayDeStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

/**
 * Adaptador PURO: extrai candidatos a delito de `analysisData.imputacoes[]`.
 *
 * Defensivo no boundary jsonb: `analysisData` ausente/sem `imputacoes` → []. Mapeia
 * agravantes→majorantes e atenuantes→minorantes (nomenclatura do domínio penal
 * → colunas de `tipificacoes`). `fonteRef` = `analysis:<processoId>`.
 */
export function candidatosDeImputacoes(
  processoId: number,
  analysisData: Record<string, unknown> | null,
): CandidatoDelito[] {
  const imputacoes =
    analysisData && Array.isArray((analysisData as Record<string, unknown>).imputacoes)
      ? ((analysisData as Record<string, unknown>).imputacoes as Array<Record<string, unknown>>)
      : [];

  return imputacoes
    .filter((i) => typeof i.crime === "string" && i.crime.trim().length > 0)
    .map((i) => {
      const artigo = typeof i.artigo === "string" && i.artigo.trim() ? i.artigo.trim() : null;
      const observacoes = typeof i.observacoes === "string" ? i.observacoes : null;
      return {
        crime: String(i.crime).trim(),
        artigoBruto: artigo,
        qualificadoras: comoArrayDeStrings(i.qualificadoras),
        majorantes: comoArrayDeStrings(i.agravantes),
        minorantes: comoArrayDeStrings(i.atenuantes),
        fonteRef: `analysis:${processoId}`,
        confianca: 0.75,
        observacoes,
      };
    });
}
