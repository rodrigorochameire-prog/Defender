/**
 * Classificação de match de nome de assistido — ciente de tokens.
 *
 * Problema que resolve: a similaridade de Levenshtein sobre o nome inteiro
 * super-recompensa SOBRENOMES longos e comuns. Em Camaçari/BA "Santos da Silva
 * Junior" é frequentíssimo, então pessoas DIFERENTES com o mesmo sobrenome
 * ultrapassavam os limiares e eram vinculadas indevidamente
 * (ex.: "Alexsandro Santos da Silva Junior" × "Gilmar Santos da Silva Junior"
 * = 0,758 → "similar"; "Joao Santos Silva" × "Jose Santos Silva" = 0,882 →
 * "exact"). O primeiro nome — o token mais discriminante — ficava diluído.
 *
 * Regra nova: o PRIMEIRO NOME funciona como porteiro. Sem primeiro nome
 * compatível, nunca há "exact" nem "similar" (vira "new"). Isso impede a
 * colisão por sobrenome sem prejudicar variações reais do mesmo nome
 * (acentos, "de/da/dos", inversões de sobrenome, typos no primeiro nome).
 */

export type MatchTipo = "exact" | "similar" | "new";

export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
  return dp[m][n];
}

export function calcularSimilaridade(s1: string, s2: string): number {
  const maior = Math.max(s1.length, s2.length);
  if (maior === 0) return 1.0;
  return (maior - levenshtein(s1, s2)) / maior;
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

function tokensSignificativos(nomeNorm: string): string[] {
  return nomeNorm.split(" ").filter((t) => t && !STOPWORDS.has(t));
}

/**
 * Classifica o match entre um nome importado e um nome existente.
 * `nomeImport`/`nomeExistente` podem vir crus (são normalizados aqui).
 */
export function classificarMatchNome(
  nomeImport: string,
  nomeExistente: string
): { tipo: MatchTipo; similarity: number } {
  const a = normalizarNome(nomeImport);
  const b = normalizarNome(nomeExistente);
  const sim = calcularSimilaridade(a, b);

  if (a === b) return { tipo: "exact", similarity: 1 };

  const ta = tokensSignificativos(a);
  const tb = tokensSignificativos(b);
  if (ta.length === 0 || tb.length === 0) return { tipo: "new", similarity: sim };

  // Porteiro: primeiro nome precisa bater (igual ou typo leve), senão é outra pessoa.
  const primeiroA = ta[0];
  const primeiroB = tb[0];
  const primeiroNomeBate =
    primeiroA === primeiroB || calcularSimilaridade(primeiroA, primeiroB) >= 0.85;
  if (!primeiroNomeBate) return { tipo: "new", similarity: sim };

  // Sobreposição de tokens (robusta a inversão/ausência de sobrenome).
  const setB = new Set(tb);
  const comuns = ta.filter((t) => setB.has(t)).length;
  const overlap = comuns / Math.max(ta.length, tb.length);

  // Com primeiro nome compatível: exact exige nomes praticamente iguais;
  // similar exige boa sobreposição de tokens — e ainda assim NÃO deve
  // ser auto-vinculado sem confirmação humana (decisão do consumidor).
  if (sim >= 0.92 && overlap >= 0.6) return { tipo: "exact", similarity: sim };
  if (sim >= 0.80 && overlap >= 0.5) return { tipo: "similar", similarity: sim };
  if (overlap >= 0.75) return { tipo: "similar", similarity: Math.max(sim, overlap) };
  return { tipo: "new", similarity: sim };
}
