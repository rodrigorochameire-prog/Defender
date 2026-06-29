export type DiariaStatus = "a_requerer" | "requerida" | "autorizada" | "paga" | "cancelada";

export const TRANSICOES: Record<DiariaStatus, DiariaStatus[]> = {
  a_requerer: ["requerida", "cancelada"],
  requerida: ["autorizada", "cancelada"],
  autorizada: ["paga", "cancelada"],
  paga: [],
  cancelada: [],
};

export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as DiariaStatus];
  return Array.isArray(allowed) && allowed.includes(para as DiariaStatus);
}
