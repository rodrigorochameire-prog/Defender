/**
 * Busca/rotulagem de Casos para o seletor inline "vincular a caso" no sheet.
 * Lógica pura, tolerante a acento; reaproveita foldText da busca de demandas.
 *
 * Spec: docs/specs/vincular-caso.md
 */
/** Minúsculas + sem acento. */
function foldText(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export interface CasoOption {
  id: number;
  titulo: string;
  codigo?: string | null;
}

/** Rótulo legível: "<código> · <título>" ou só o título. */
export function casoLabel(caso: CasoOption): string {
  return caso.codigo ? `${caso.codigo} · ${caso.titulo}` : caso.titulo;
}

function scoreTitulo(tituloFolded: string, q: string): number {
  if (tituloFolded.startsWith(q)) return 100;
  if (tituloFolded.includes(" " + q)) return 80;
  if (tituloFolded.includes(q)) return 60;
  return 0;
}

/**
 * Ranqueia os casos pela query. Query vazia → primeiros `limit` (sem ranking), útil
 * para um seletor que mostra casos recentes ao focar. Tolerante a acento/caixa.
 */
export function searchCasos<T extends CasoOption>(casos: T[], query: string, limit = 20): T[] {
  const q = foldText(query).trim();
  if (!q) return casos.slice(0, limit);

  const hits: { caso: T; score: number }[] = [];
  for (const c of casos) {
    const titulo = scoreTitulo(foldText(c.titulo ?? ""), q);
    const codigo = foldText(c.codigo ?? "").includes(q) ? 70 : 0;
    const score = Math.max(titulo, codigo);
    if (score > 0) hits.push({ caso: c, score });
  }
  hits.sort((a, b) => b.score - a.score || foldText(a.caso.titulo).localeCompare(foldText(b.caso.titulo)));
  return hits.slice(0, limit).map((h) => h.caso);
}
