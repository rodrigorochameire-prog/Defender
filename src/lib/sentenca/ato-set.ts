/** Pure trigger-set test for the sentença capture pipeline.
 *  Derives membership by normalized regex so it tolerates per-atribuição
 *  ato variants in src/config/atos-por-atribuicao.ts without a brittle literal list.
 *  Acórdão (2º grau) is explicitly excluded. */
const SENTENCA_RE = /senten|condena|absolvi|pron[uú]ncia|impron|desclassifica/;
const ACORDAO_RE = /ac[oó]rd[aã]o/;

function norm(s: string): string {
  // U+0300–U+036F = combining diacritics
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function isSentencaAto(ato: string | null | undefined): boolean {
  if (!ato) return false;
  const n = norm(ato);
  if (ACORDAO_RE.test(n)) return false;
  return SENTENCA_RE.test(n);
}
