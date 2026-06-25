/**
 * Cálculo do badge de prazo a partir da string "dd/mm/aaaa".
 * Fonte única — consumido tanto pelo hero do sheet (chip de urgência sempre
 * visível) quanto pela seção Cronologia & Prazo (linha editável).
 *
 * A lógica de criticidade vive em `@/lib/prazo` (framework-agnóstica). Este
 * arquivo é apenas o adaptador de apresentação (texto curto + tipo PrazoCor).
 */

import { calcularPrazo, prazoTextoCurto } from "@/lib/prazo";

export type PrazoCor = "red" | "amber" | "green" | "gray" | "none";

export interface PrazoBadge {
  /** Texto curto, ex.: "3d", "Hoje", "2d vencido". */
  texto: string;
  cor: PrazoCor;
  /** Dias até o prazo (negativo = vencido). Útil pra rótulos contextuais. */
  diff: number;
}

export function calcularPrazoBadge(prazoStr: string): PrazoBadge | null {
  const sev = calcularPrazo(prazoStr);
  if (!sev) return null;
  return {
    texto: prazoTextoCurto(sev.dias),
    cor: sev.cor,
    diff: sev.dias,
  };
}
