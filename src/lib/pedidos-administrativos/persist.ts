import { eq } from "drizzle-orm";
import { pedidosAdministrativos, vidaFuncionalEventos } from "@/lib/db/schema";
import { projecaoEventoDePedido } from "@/lib/pedidos-administrativos/projecao";

export type CriarPedidoFields = {
  assunto: string;
  descricao?: string | null;
  dataPedido: string;
  prazo?: string | null;
  estado?: "solicitado" | "em_analise" | "deferido" | "indeferido" | "cancelado";
  seiProtocolo?: string | null;
  observacao?: string | null;
};

export async function criarPedidoComEvento(tx: any, defensorId: number, fields: CriarPedidoFields) {
  const estado = fields.estado ?? "solicitado";
  const proj = projecaoEventoDePedido({
    id: null, assunto: fields.assunto, dataPedido: fields.dataPedido, prazo: fields.prazo ?? null, estado,
  });
  const [evento] = await tx.insert(vidaFuncionalEventos).values({
    defensorId,
    tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
    dataEvento: proj.dataEvento, prazo: proj.prazo, status: proj.status,
    origem: "manual", dados: { pedidoId: null },
  }).returning({ id: vidaFuncionalEventos.id });

  const [p] = await tx.insert(pedidosAdministrativos).values({
    defensorId,
    assunto: fields.assunto,
    descricao: fields.descricao ?? null,
    dataPedido: fields.dataPedido,
    prazo: fields.prazo ?? null,
    estado,
    seiProtocolo: fields.seiProtocolo ?? null,
    observacao: fields.observacao ?? null,
    vidaFuncionalEventoId: evento.id,
  }).returning();

  await tx.update(vidaFuncionalEventos).set({ dados: { pedidoId: p.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
  return p;
}
