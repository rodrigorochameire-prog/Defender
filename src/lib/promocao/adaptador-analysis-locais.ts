import type { CandidatoLugar } from "./tipos-lugar";
import { mapearTipoLugar } from "./de-para-tipo-lugar";

/** Coerção defensiva de número no boundary jsonb. */
function comoNumero(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Coerção defensiva de string não-vazia no boundary jsonb. */
function comoString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/**
 * Adaptador PURO: extrai candidatos a lugar de `analysisData.locais[]`.
 *
 * Defensivo no boundary jsonb: `analysisData` ausente/sem `locais` → []. Ignora
 * entradas sem `endereco`. Mapeia `tipo` via `mapearTipoLugar`. `fonteRef` =
 * `analysis:<processoId>`.
 */
export function candidatosDeLocais(
  processoId: number,
  analysisData: Record<string, unknown> | null,
): CandidatoLugar[] {
  const locais =
    analysisData && Array.isArray((analysisData as Record<string, unknown>).locais)
      ? ((analysisData as Record<string, unknown>).locais as Array<Record<string, unknown>>)
      : [];

  return locais
    .filter((l) => typeof l.endereco === "string" && l.endereco.trim().length > 0)
    .map((l) => {
      const coords = (l.coordenadas as Record<string, unknown> | undefined) ?? undefined;
      return {
        enderecoCompleto: String(l.endereco).trim(),
        bairro: comoString(l.bairro),
        cidade: comoString(l.cidade),
        uf: comoString(l.uf),
        cep: comoString(l.cep),
        latitude: coords ? comoNumero(coords.lat) : null,
        longitude: coords ? comoNumero(coords.lng) : null,
        tipo: mapearTipoLugar(typeof l.tipo === "string" ? l.tipo : null),
        pessoaId: null,
        fonteRef: `analysis:${processoId}`,
        confianca: 0.75,
      };
    });
}
