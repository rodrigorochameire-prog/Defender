export type FeriasStatus = "programada" | "homologada" | "em_fruicao" | "concluida" | "cancelada";

export const TRANSICOES: Record<FeriasStatus, FeriasStatus[]> = {
  programada: ["homologada", "cancelada"],
  homologada: ["em_fruicao", "cancelada"],
  em_fruicao: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as FeriasStatus];
  return Array.isArray(allowed) && allowed.includes(para as FeriasStatus);
}
