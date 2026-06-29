export function statusEventoDePedido(estado: string): "previsto" | "pendente" | "em_curso" | "concluido" | "arquivado" {
  if (estado === "solicitado") return "pendente";
  if (estado === "em_analise") return "em_curso";
  if (estado === "deferido") return "concluido";
  if (estado === "indeferido") return "arquivado";
  return "previsto";
}

export function tituloPedido(assunto: string): string {
  const t = (assunto ?? "").trim();
  return t.length ? t : "Solicitação administrativa";
}

export type ProjecaoPedidoEvento = {
  tipo: "SOLICITACAO_ADM";
  cluster: "administrativo";
  titulo: string;
  dataEvento: string;
  prazo: string | null;
  status: "previsto" | "pendente" | "em_curso" | "concluido" | "arquivado";
  dados: { pedidoId: number | null };
};

export function projecaoEventoDePedido(
  pedido: { id: number | null; assunto: string; dataPedido: string; prazo: string | null; estado: string },
): ProjecaoPedidoEvento {
  return {
    tipo: "SOLICITACAO_ADM",
    cluster: "administrativo",
    titulo: tituloPedido(pedido.assunto),
    dataEvento: pedido.dataPedido,
    prazo: pedido.prazo,
    status: statusEventoDePedido(pedido.estado),
    dados: { pedidoId: pedido.id },
  };
}
