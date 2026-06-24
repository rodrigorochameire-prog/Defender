/**
 * Util puro para filtrar seções classificadas (`drive.sectionsByProcesso`)
 * por `tipo`. O `tipo` é uma string livre setada na classificação
 * (skill `classify-document`): denúncia = "denuncia"; laudos/perícias =
 * "laudo_pericial", "laudo_necroscopico", "pericia_digital", etc.
 *
 * O matching é robusto a caixa e acento via normalização + `includes`, de modo
 * que um único termo "laudo" casa todas as variantes de laudo, e "pericia"
 * casa "pericia_digital".
 */

export interface SecaoClassificada {
  tipo: string | null;
  textoExtraido: string | null;
  paginaInicio: number | null;
  fileWebViewLink: string | null;
  fileDriveId: string | null;
}

/** lowercase + remove diacríticos (NFD) para comparação tolerante. */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

/**
 * Retorna as seções cujo `tipo` (normalizado) contém algum dos `termos`
 * (normalizados), ordenadas por `paginaInicio` crescente. Termos vazios e
 * linhas sem `tipo` são ignorados; sem match → [].
 */
export function secoesPorTipo(
  sections: readonly unknown[],
  termos: string[],
): SecaoClassificada[] {
  const alvos = termos.map(normalizar).filter((t) => t.length > 0);
  if (alvos.length === 0) return [];

  const out: SecaoClassificada[] = [];
  for (const raw of sections) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const tipo = asString(row.tipo);
    if (!tipo) continue;
    const tipoNorm = normalizar(tipo);
    if (!alvos.some((t) => tipoNorm.includes(t))) continue;
    out.push({
      tipo,
      textoExtraido: asString(row.textoExtraido),
      paginaInicio: asNumber(row.paginaInicio),
      fileWebViewLink: asString(row.fileWebViewLink),
      fileDriveId: asString(row.fileDriveId),
    });
  }

  return out.sort((a, b) => (a.paginaInicio ?? 0) - (b.paginaInicio ?? 0));
}
