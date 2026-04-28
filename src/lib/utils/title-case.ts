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
 * - Siglas conhecidas (whitelist) e tokens curtos (≤ 4 chars) já em caixa alta no
 *   input permanecem em caixa alta.
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
