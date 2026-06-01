const KNOWN_ACRONYMS = new Set<string>([
  "AIJ",
  "PAP",
  "ANPP",
  "ANPL",
  "IRDR",
  "JECRIM",
  "DPE",
  "MPBA",
  "MP",
  "TJ",
  "STF",
  "STJ",
  "CNJ",
  "TJBA",
  "TRF",
  "PJE",
  "VVD",
]);

/**
 * Nomes próprios que o PJe emite em MAIÚSCULAS e sem diacríticos. Title Case
 * sozinho não recupera o acento, então mapeamos as grafias inequívocas como
 * nome próprio. Chave em minúsculo (lookup após normalizar o token).
 * Omitimos casos ambíguos (ex.: "sa") para não gerar falso positivo.
 */
export const NAME_ACCENTS: Record<string, string> = {
  joao: "João", jose: "José", andre: "André", antonio: "Antônio", antonia: "Antônia",
  vinicius: "Vinícius", fabio: "Fábio", fabia: "Fábia", flavio: "Flávio", flavia: "Flávia",
  tarcisio: "Tarcísio", otavio: "Otávio", romulo: "Rômulo", inacio: "Inácio",
  conceicao: "Conceição", assuncao: "Assunção", paixao: "Paixão", encarnacao: "Encarnação",
  guimaraes: "Guimarães", magalhaes: "Magalhães", araujo: "Araújo", damiao: "Damião",
  brandao: "Brandão", leao: "Leão", falcao: "Falcão", galvao: "Galvão", simao: "Simão",
  franca: "França", gonzalez: "González", junior: "Júnior", junio: "Júnio",
};

const CONNECTORS = new Set<string>([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "com",
  "por",
]);

const VOWELS = /[AEIOUÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜaeiouàáâãäåèéêëìíîïòóôõöùúûü]/;

function isAcronymHeuristic(rawToken: string, normalized: string): boolean {
  if (KNOWN_ACRONYMS.has(normalized)) return true;
  const letters = rawToken.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length === 0 || letters.length > 4) return false;
  // Only treat as acronym heuristic if ALL UPPERCASE and contains NO vowels
  // (e.g. XYZ, JKLM, STJ-like patterns without vowels)
  // Words like CASO, DE, DA contain vowels → not acronyms
  return (
    letters === letters.toUpperCase() &&
    /[A-Z]/.test(letters) &&
    !VOWELS.test(letters)
  );
}

function capitalize(word: string): string {
  if (!word) return word;
  const match = word.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ])(.*)$/);
  if (!match) return word;
  const [, prefix, first, rest] = match;
  return prefix + first.toUpperCase() + rest.toLowerCase();
}

/**
 * Converte texto para Title Case respeitando siglas e conectivos do português.
 *
 * - Siglas conhecidas (whitelist) permanecem em caixa alta. A heurística também
 *   trata como sigla tokens curtos (≤ 4 chars) em caixa alta SEM vogais
 *   (ex.: XYZ, JKLM) — tokens com vogais como CASO recebem Title Case normal.
 * - Conectivos (de, da, do, e, com, etc.) ficam minúsculos exceto se forem o
 *   primeiro token da string.
 * - Demais palavras: primeira letra maiúscula, resto minúsculo.
 */
export function toTitleCase(input: string): string {
  if (!input) return input;

  const tokens = input.split(/(\s+)/);
  let firstWordSeen = false;

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token) || token === "") return token;

      const lower = token.toLowerCase();
      const lowerCore = lower.replace(/[^a-zà-ÿ]/g, "");

      // Connectors take priority: checked before acronym heuristic
      if (firstWordSeen && CONNECTORS.has(lowerCore)) {
        return lower;
      }

      // Nomes próprios sem acento (João, Conceição, Guimarães, ...)
      if (NAME_ACCENTS[lowerCore]) {
        firstWordSeen = true;
        return token.replace(/[A-Za-zÀ-ÿ]+/, NAME_ACCENTS[lowerCore]);
      }

      const normalized = token.replace(/[^A-Za-zÀ-ÿ]/g, "").toUpperCase();

      if (isAcronymHeuristic(token, normalized)) {
        firstWordSeen = true;
        return token.replace(/[A-Za-zÀ-ÿ]+/, (m) => m.toUpperCase());
      }

      firstWordSeen = true;
      return capitalize(token);
    })
    .join("");
}
