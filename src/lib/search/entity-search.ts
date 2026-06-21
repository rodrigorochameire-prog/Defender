/**
 * Ranking genérico de entidades para a busca global (cmd+K cross-entity).
 * Lógica pura, tolerante a acento; `numero` casado por dígitos (ignora máscara).
 *
 * Spec: docs/specs/busca-cross-entity.md
 */

export type EntityKind = "assistido" | "processo" | "caso" | "demanda" | "audiencia";

export interface SearchEntity {
  id: string | number;
  kind: EntityKind;
  label: string;
  sublabel?: string | null;
  /** Número (ex.: CNJ) — casado por dígitos, ignorando pontuação. */
  numero?: string | null;
}

export interface EntityHit {
  entity: SearchEntity;
  score: number;
}

/** Minúsculas + sem acento. */
export function foldText(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

function scoreLabel(labelFolded: string, q: string): number {
  if (labelFolded.startsWith(q)) return 100;
  if (labelFolded.includes(" " + q)) return 80;
  if (labelFolded.includes(q)) return 60;
  return 0;
}

function scoreNumero(numero: string | null | undefined, qDigits: string): number {
  if (qDigits.length < 3 || !numero) return 0;
  const nd = onlyDigits(numero);
  if (nd.startsWith(qDigits)) return 90;
  if (nd.includes(qDigits)) return 70;
  return 0;
}

/**
 * Ranqueia as entidades pela query. Retorna no máximo `limit`, ordenado por score
 * desc (desempate por label). Query vazia → [].
 */
export function searchEntities(
  entities: SearchEntity[],
  query: string,
  limit = 20,
): EntityHit[] {
  const q = foldText(query).trim();
  if (!q) return [];
  const qDigits = onlyDigits(query);

  const hits: EntityHit[] = [];
  for (const e of entities) {
    const label = scoreLabel(foldText(e.label ?? ""), q);
    const numero = scoreNumero(e.numero, qDigits);
    const sublabel = foldText(e.sublabel ?? "").includes(q) ? 40 : 0;
    const score = Math.max(label, numero, sublabel);
    if (score > 0) hits.push({ entity: e, score });
  }
  hits.sort((a, b) =>
    b.score - a.score ||
    foldText(a.entity.label ?? "").localeCompare(foldText(b.entity.label ?? "")),
  );
  return hits.slice(0, limit);
}
