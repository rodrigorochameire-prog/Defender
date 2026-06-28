// src/lib/trpc/routers/ausencias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { ausencias, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { diasInclusive } from "@/lib/ausencias/calculos";
import { podeTransicionar } from "@/lib/ausencias/transicoes";
import { projecaoEventoDeAusencia } from "@/lib/ausencias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");
const TIPO = z.enum(["licenca", "outra_ausencia"]);
const SITUACAO = z.enum(["solicitada", "deferida", "gozada", "indeferida", "cancelada"]);

const baseFields = {
  tipo: TIPO,
  motivo: z.string().nullable().optional(),
  dataInicio: ISO,
  dataFim: ISO,
  interrompida: z.boolean().optional(),
  suspensa: z.boolean().optional(),
  numeroSolicitacao: z.string().nullable().optional(),
  nSiga: z.string().nullable().optional(),
  dataPublicacao: ISO.nullable().optional(),
  observacao: z.string().nullable().optional(),
  situacaoSiga: z.string().nullable().optional(),
};

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  situacao: SITUACAO.optional(),
});

export const ausenciasRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const rows = await db.select().from(ausencias)
      .where(and(isNull(ausencias.deletedAt), inArray(ausencias.defensorId, scope)))
      .orderBy(asc(ausencias.dataInicio));
    return rows.map((a) => ({ ...a, dias: diasInclusive(a.dataInicio, a.dataFim) }));
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    return await db.transaction(async (tx) => {
      const proj = projecaoEventoDeAusencia({
        id: null, tipo: input.tipo, motivo: input.motivo ?? null,
        dataInicio: input.dataInicio, dataFim: input.dataFim, situacao: "solicitada",
      });
      const [evento] = await tx.insert(vidaFuncionalEventos).values({
        defensorId: ctx.user.id,
        tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
        dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
        origem: "manual", dados: { ausenciaId: null },
      }).returning({ id: vidaFuncionalEventos.id });

      const [a] = await tx.insert(ausencias).values({
        defensorId: ctx.user.id,
        tipo: input.tipo,
        motivo: input.motivo ?? null,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        situacao: "solicitada",
        interrompida: input.interrompida ?? false,
        suspensa: input.suspensa ?? false,
        numeroSolicitacao: input.numeroSolicitacao ?? null,
        nSiga: input.nSiga ?? null,
        dataPublicacao: input.dataPublicacao ?? null,
        observacao: input.observacao ?? null,
        situacaoSiga: input.situacaoSiga ?? null,
        vidaFuncionalEventoId: evento.id,
      }).returning();

      await tx.update(vidaFuncionalEventos).set({ dados: { ausenciaId: a.id } }).where(eq(vidaFuncionalEventos.id, evento.id));
      return a;
    });
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [a] = await db.select().from(ausencias)
      .where(and(eq(ausencias.id, input.id), isNull(ausencias.deletedAt))).limit(1);
    if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Ausência não encontrada" });
    if (a.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas ausências" });

    if (input.situacao && input.situacao !== a.situacao && !podeTransicionar(a.situacao, input.situacao)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${a.situacao} → ${input.situacao}` });
    }

    const novaInicio = input.dataInicio ?? a.dataInicio;
    const novaFim = input.dataFim ?? a.dataFim;
    if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    const novoTipo = input.tipo ?? a.tipo;
    const novoMotivo = input.motivo === undefined ? a.motivo : input.motivo;
    const novaSituacao = input.situacao ?? a.situacao;
    const proj = projecaoEventoDeAusencia({
      id: a.id, tipo: novoTipo, motivo: novoMotivo, dataInicio: novaInicio, dataFim: novaFim, situacao: novaSituacao,
    });

    return await db.transaction(async (tx) => {
      await tx.update(ausencias).set({
        tipo: novoTipo,
        motivo: novoMotivo,
        dataInicio: novaInicio,
        dataFim: novaFim,
        situacao: novaSituacao,
        interrompida: input.interrompida ?? a.interrompida,
        suspensa: input.suspensa ?? a.suspensa,
        numeroSolicitacao: input.numeroSolicitacao === undefined ? a.numeroSolicitacao : input.numeroSolicitacao,
        nSiga: input.nSiga === undefined ? a.nSiga : input.nSiga,
        dataPublicacao: input.dataPublicacao === undefined ? a.dataPublicacao : input.dataPublicacao,
        observacao: input.observacao === undefined ? a.observacao : input.observacao,
        situacaoSiga: input.situacaoSiga === undefined ? a.situacaoSiga : input.situacaoSiga,
        updatedAt: new Date(),
      }).where(eq(ausencias.id, a.id));

      if (a.vidaFuncionalEventoId != null) {
        if (novaSituacao === "indeferida" || novaSituacao === "cancelada") {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            tipo: proj.tipo, status: proj.status,
            dataEvento: proj.dataEvento, dataFim: proj.dataFim,
            titulo: proj.titulo, updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [a] = await db.select().from(ausencias)
      .where(and(eq(ausencias.id, input.id), isNull(ausencias.deletedAt))).limit(1);
    if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Ausência não encontrada" });
    if (a.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas ausências" });

    return await db.transaction(async (tx) => {
      await tx.update(ausencias).set({ deletedAt: new Date() }).where(eq(ausencias.id, a.id));
      if (a.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
