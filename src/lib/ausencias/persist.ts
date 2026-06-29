// src/lib/ausencias/persist.ts
import { eq } from "drizzle-orm";
import { ausencias, vidaFuncionalEventos } from "@/lib/db/schema";
import { projecaoEventoDeAusencia } from "@/lib/ausencias/projecao";

export type CriarAusenciaFields = {
  tipo: "licenca" | "outra_ausencia";
  motivo?: string | null;
  dataInicio: string;
  dataFim: string;
  situacao?: "solicitada" | "deferida" | "gozada" | "indeferida" | "cancelada";
  interrompida?: boolean;
  suspensa?: boolean;
  numeroSolicitacao?: string | null;
  nSiga?: string | null;
  dataPublicacao?: string | null;
  observacao?: string | null;
  situacaoSiga?: string | null;
  sigaSyncedAt?: Date | null;
};

/** Insere a ausência + o evento de vida funcional projetado, com backfill do ausenciaId.
 *  `situacao` default "solicitada" preserva o comportamento do ausencias.criar. */
export async function criarAusenciaComEvento(tx: any, defensorId: number, fields: CriarAusenciaFields) {
  const situacao = fields.situacao ?? "solicitada";
  const proj = projecaoEventoDeAusencia({
    id: null, tipo: fields.tipo, motivo: fields.motivo ?? null,
    dataInicio: fields.dataInicio, dataFim: fields.dataFim, situacao,
  });
  const [evento] = await tx.insert(vidaFuncionalEventos).values({
    defensorId,
    tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
    dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
    origem: "manual", dados: { ausenciaId: null },
  }).returning({ id: vidaFuncionalEventos.id });

  const [a] = await tx.insert(ausencias).values({
    defensorId,
    tipo: fields.tipo,
    motivo: fields.motivo ?? null,
    dataInicio: fields.dataInicio,
    dataFim: fields.dataFim,
    situacao,
    interrompida: fields.interrompida ?? false,
    suspensa: fields.suspensa ?? false,
    numeroSolicitacao: fields.numeroSolicitacao ?? null,
    nSiga: fields.nSiga ?? null,
    dataPublicacao: fields.dataPublicacao ?? null,
    observacao: fields.observacao ?? null,
    situacaoSiga: fields.situacaoSiga ?? null,
    sigaSyncedAt: fields.sigaSyncedAt ?? null,
    vidaFuncionalEventoId: evento.id,
  }).returning();

  await tx.update(vidaFuncionalEventos).set({ dados: { ausenciaId: a.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
  return a;
}
