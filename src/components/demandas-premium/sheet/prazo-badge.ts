/**
 * Cálculo do badge de prazo a partir da string "dd/mm/aaaa".
 * Fonte única — consumido tanto pelo hero do sheet (chip de urgência sempre
 * visível) quanto pela seção Cronologia & Prazo (linha editável).
 */

export type PrazoCor = "red" | "amber" | "green" | "gray" | "none";

export interface PrazoBadge {
  /** Texto curto, ex.: "3d", "Hoje", "2d vencido". */
  texto: string;
  cor: PrazoCor;
  /** Dias até o prazo (negativo = vencido). Útil pra rótulos contextuais. */
  diff: number;
}

export function calcularPrazoBadge(prazoStr: string): PrazoBadge | null {
  if (!prazoStr) return null;
  try {
    const parts = prazoStr.split("/").map(Number);
    if (parts.length < 3) return null;
    const [dia, mes, ano] = parts;
    const fullYear = ano < 100 ? 2000 + ano : ano;
    const prazo = new Date(fullYear, mes - 1, dia);
    prazo.setHours(0, 0, 0, 0);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { texto: `${Math.abs(diff)}d vencido`, cor: "red", diff };
    if (diff === 0) return { texto: "Hoje", cor: "red", diff };
    if (diff <= 3) return { texto: `${diff}d`, cor: "amber", diff };
    if (diff <= 7) return { texto: `${diff}d`, cor: "green", diff };
    return { texto: `${diff}d`, cor: "gray", diff };
  } catch {
    return null;
  }
}
