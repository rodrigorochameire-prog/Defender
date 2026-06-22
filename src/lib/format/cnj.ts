/**
 * Número único do processo (CNJ) — validação e formatação.
 *
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos)
 *   seq(7) DV(2) ano(4) justiça(1) tribunal(2) origem(4)
 * DV por ISO 7064 MOD 97-10 sobre seq+ano+justiça+tribunal+origem.
 *
 * Spec: docs/specs/demandas-cnj-ux.md
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

/** Resto da divisão por 97 de uma string numérica longa (sem BigInt). */
function mod97(numStr: string): number {
  let r = 0;
  for (const ch of numStr) r = (r * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return r;
}

/**
 * DV (2 dígitos) a partir dos 18 dígitos sem DV (seq+ano+justiça+tribunal+origem).
 * DV = 98 - ((d18 . "00") mod 97).
 */
export function computeCnjCheckDigits(d18: string): string {
  const dv = 98 - mod97(d18 + "00");
  return String(dv).padStart(2, "0");
}

/** Verdadeiro se `input` tem 20 dígitos e o DV confere. */
export function isValidCnj(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 20) return false;
  const seq = d.slice(0, 7);
  const dv = d.slice(7, 9);
  const resto = d.slice(9); // ano+justiça+tribunal+origem (11)
  return computeCnjCheckDigits(seq + resto) === dv;
}

/**
 * Aplica a máscara CNJ. Formata parcialmente enquanto incompleto e ignora dígitos
 * além de 20.
 */
export function formatCnj(input: string): string {
  const d = onlyDigits(input).slice(0, 20);
  const seq = d.slice(0, 7);
  const dv = d.slice(7, 9);
  const ano = d.slice(9, 13);
  const jus = d.slice(13, 14);
  const trib = d.slice(14, 16);
  const orig = d.slice(16, 20);

  let out = seq;
  if (dv) out += `-${dv}`;
  if (ano) out += `.${ano}`;
  if (jus) out += `.${jus}`;
  if (trib) out += `.${trib}`;
  if (orig) out += `.${orig}`;
  return out;
}
