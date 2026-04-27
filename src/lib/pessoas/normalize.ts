/**
 * Normaliza nome para comparação e indexação.
 * Regras:
 * - NFD + remoção de marcas de acento
 * - Lowercase
 * - Remoção de pronomes de tratamento comuns (Dr., PM, Sgt., etc)
 * - Remoção de pontuação e caracteres não-alfanuméricos (preserva números)
 * - Colapso de múltiplos espaços
 * - Trim
 */
export function normalizarNome(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(dr|dra|sr|sra|pm|pc|pf|cb|sgt|sub|insp|esc|inv|tte|cabo|soldado)\.?\s+/gi,
      " ",
    )
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
