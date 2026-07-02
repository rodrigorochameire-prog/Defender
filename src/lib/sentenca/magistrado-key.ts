import { normalizeNameForMatch } from "@/lib/utils/name-matching";

const TITLE_RE =
  /^(dr\.?|dra\.?|exmo\.?|exma\.?|mm\.?|meritíssim[oa]|juiz(?:a)?(?: de direito)?|magistrad[oa])\s+/i;

function stripTitles(name: string): string {
  let n = name.trim();
  let prev: string;
  do { prev = n; n = n.replace(TITLE_RE, "").trim(); } while (n !== prev);
  return n;
}

export function buildMagistradoKey(nome: string, comarcaId: number | null) {
  const cleaned = stripTitles(nome);
  const nomeNormalizado = normalizeNameForMatch(cleaned).toUpperCase();
  return { nomeNormalizado, comarcaId: comarcaId ?? null };
}
