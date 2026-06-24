/**
 * Shared rule for the WhatsApp context panel's "Prazo Aberto" card.
 *
 * A prazo is treated as urgent (warrants the red signal) when fewer than
 * PRAZO_URGENTE_DIAS days remain. Centralised so the threshold lives in one
 * place instead of being repeated across the card's icon / value / label.
 */

export const PRAZO_URGENTE_DIAS = 7;

export function isPrazoUrgente(diasRestantes: number | null | undefined): boolean {
  return typeof diasRestantes === "number" && diasRestantes < PRAZO_URGENTE_DIAS;
}
