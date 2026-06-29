export type PedidoEstado = "solicitado" | "em_analise" | "deferido" | "indeferido" | "cancelado";
export const TRANSICOES: Record<PedidoEstado, PedidoEstado[]> = {
  solicitado: ["em_analise", "indeferido", "cancelado"],
  em_analise: ["deferido", "indeferido", "cancelado"],
  deferido: [],
  indeferido: [],
  cancelado: [],
};
export function podeTransicionar(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as PedidoEstado];
  return Array.isArray(allowed) && allowed.includes(para as PedidoEstado);
}
