/**
 * Idade (anos completos) a partir de `dataNascimento`.
 *
 * Pura e determinística: aceita uma data de referência `hoje` (default `new Date()`)
 * para testabilidade — o cálculo nunca depende implicitamente do relógio.
 *
 * Aceita ISO date (`"1990-01-10"`), Date ou null. Retorna null quando a entrada é
 * vazia/inválida ou quando o nascimento é no futuro.
 */
export function calcularIdade(
  dataNascimento: string | Date | null | undefined,
  hoje: Date = new Date(),
): number | null {
  if (dataNascimento == null || dataNascimento === "") return null;

  const nasc = parseData(dataNascimento);
  if (nasc === null || Number.isNaN(nasc.getTime())) return null;

  // Nascimento no futuro → não há idade válida.
  if (nasc.getTime() > hoje.getTime()) return null;

  let idade = hoje.getFullYear() - nasc.getFullYear();

  // Subtrai um ano se o aniversário ainda não ocorreu neste ano.
  const mesDiff = hoje.getMonth() - nasc.getMonth();
  const diaDiff = hoje.getDate() - nasc.getDate();
  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) {
    idade -= 1;
  }

  return idade < 0 ? null : idade;
}

/**
 * Strings ISO date-only (`"YYYY-MM-DD"`) são parseadas como data LOCAL para evitar
 * o deslocamento de fuso (o construtor `new Date("YYYY-MM-DD")` assume UTC, o que
 * pode mover o dia em fusos negativos como BRT). Demais formatos vão pro construtor.
 */
function parseData(input: string | Date): Date | null {
  if (input instanceof Date) return input;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(input);
}
