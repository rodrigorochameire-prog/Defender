/**
 * Busca/ranking de demandas para a paleta global (cmd+K). Lógica pura e testável,
 * tolerante a acento e caixa; processo casado por dígitos (ignora a máscara CNJ).
 *
 * Spec: docs/specs/busca-global.md
 */
import { onlyDigits } from "@/lib/format/cnj";

export type MatchField = "nome" | "processo" | "ato";

export interface DemandaSearchable {
  id: string | number;
  assistido?: string | null;
  ato?: string | null;
  processos?: { tipo?: string | null; numero?: string | null }[] | null;
}

export interface DemandaSearchHit<T extends DemandaSearchable = DemandaSearchable> {
  demanda: T;
  score: number;
  matchField: MatchField;
}

/** Minúsculas + sem acento. */
export function foldText(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function scoreNome(nameFolded: string, q: string): number {
  if (!nameFolded) return 0;
  if (nameFolded.startsWith(q)) return 100; // prefixo
  if (nameFolded.includes(" " + q)) return 80; // início de palavra
  if (nameFolded.includes(q)) return 60; // substring
  return 0;
}

function scoreProcesso(processos: DemandaSearchable["processos"], qDigits: string): number {
  if (qDigits.length < 3 || !processos) return 0;
  let best = 0;
  for (const p of processos) {
    const pd = onlyDigits(p?.numero ?? "");
    if (pd.startsWith(qDigits)) best = Math.max(best, 90);
    else if (pd.includes(qDigits)) best = Math.max(best, 70);
  }
  return best;
}

/**
 * Ranqueia as demandas pela query. Retorna no máximo `limit` resultados ordenados
 * por score desc (desempate por nome). Query vazia → [].
 */
export function searchDemandas<T extends DemandaSearchable>(
  demandas: T[],
  query: string,
  limit = 20,
): DemandaSearchHit<T>[] {
  const q = foldText(query).trim();
  if (!q) return [];
  const qDigits = onlyDigits(query);

  const hits: DemandaSearchHit<T>[] = [];
  for (const d of demandas) {
    const nome = scoreNome(foldText(d.assistido ?? ""), q);
    const processo = scoreProcesso(d.processos, qDigits);
    const ato = foldText(d.ato ?? "").includes(q) ? 30 : 0;

    // Maior pontuação vence; empate resolve por prioridade nome > processo > ato.
    let score = nome;
    let matchField: MatchField = "nome";
    if (processo > score) { score = processo; matchField = "processo"; }
    if (ato > score) { score = ato; matchField = "ato"; }
    if (score === 0) continue;

    hits.push({ demanda: d, score, matchField });
  }

  hits.sort((a, b) =>
    b.score - a.score ||
    foldText(a.demanda.assistido ?? "").localeCompare(foldText(b.demanda.assistido ?? "")),
  );
  return hits.slice(0, limit);
}
