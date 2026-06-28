/**
 * Normaliza um telefone brasileiro para a forma canônica "55" + DDD(2) + número.
 * - Remove não-dígitos e sufixos (ex.: @s.whatsapp.net).
 * - Aceita com/sem DDI 55, com/sem 9º dígito.
 * - Móveis são canonizados COM o 9º dígito (DDD + 9 + 8 dígitos).
 * - Fixos mantêm 8 dígitos.
 * - Retorna null quando não consegue normalizar com segurança (falha segura).
 */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 || d.length === 13) {
    if (d.startsWith("55")) d = d.slice(2);
  }
  if (d.length === 11) {
    if (d[2] === "9") return "55" + d;
    return null;
  }
  if (d.length === 10) {
    const ddd = d.slice(0, 2);
    const num = d.slice(2);
    const first = num[0];
    if (first >= "6") return "55" + ddd + "9" + num;
    return "55" + ddd + num;
  }
  return null;
}
