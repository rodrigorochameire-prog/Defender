export type AusenciaSituacao = "solicitada" | "deferida" | "gozada" | "indeferida" | "cancelada";

export const TRANSICOES: Record<AusenciaSituacao, AusenciaSituacao[]> = {
  solicitada: ["deferida", "indeferida", "cancelada"],
  deferida: ["gozada", "cancelada"],
  gozada: [],
  indeferida: [],
  cancelada: [],
};

export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as AusenciaSituacao];
  return Array.isArray(allowed) && allowed.includes(para as AusenciaSituacao);
}
