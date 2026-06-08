// Title Case pt-BR para nomes de órgãos/varas vindos do PJe em CAIXA ALTA.
// Mantém conectivos em minúsculo (de, da, e, a...) e preserva ordinais ("1ª", "2º").

const CONECTIVOS = new Set([
  "de", "da", "do", "das", "dos",
  "e", "a", "o", "as", "os",
  "à", "às", "ao", "aos",
  "em", "na", "no", "nas", "nos",
]);

/**
 * Converte um texto (tipicamente em CAIXA ALTA, ex.: "VARA DE VIOLÊNCIA
 * DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI") para Title Case pt-BR:
 * "Vara de Violência Doméstica Fam Contra a Mulher de Camaçari".
 * Conectivos ficam minúsculos (exceto na 1ª palavra); ordinais como "1ª" são
 * preservados. Retorna "" para entrada vazia/nula.
 */
export function toTitleCasePtBr(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) => {
      if (i !== 0 && CONECTIVOS.has(palavra)) return palavra;
      // Capitaliza a primeira letra alfabética (inclui acentuadas); não toca
      // em dígitos/ordinais ("1ª" permanece "1ª").
      return palavra.replace(/[a-zà-ÿ]/, (c) => c.toUpperCase());
    })
    .join(" ");
}
