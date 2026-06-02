export const TIPOS_PATROCINIO = ["DEFENSORIA", "PARTICULAR"] as const;
export type TipoPatrocinio = (typeof TIPOS_PATROCINIO)[number];

/**
 * Normaliza a dupla (tipo, advogado): DEFENSORIA nunca carrega advogado;
 * nome em branco vira null.
 */
export function normalizePatrocinio(
  tipoPatrocinio: TipoPatrocinio,
  advogadoParticular?: string | null,
): { tipoPatrocinio: TipoPatrocinio; advogadoParticular: string | null } {
  if (tipoPatrocinio === "DEFENSORIA") {
    return { tipoPatrocinio, advogadoParticular: null };
  }
  const nome = (advogadoParticular ?? "").trim();
  return { tipoPatrocinio, advogadoParticular: nome.length > 0 ? nome : null };
}
