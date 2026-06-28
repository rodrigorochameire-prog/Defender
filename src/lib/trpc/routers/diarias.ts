// src/lib/trpc/routers/diarias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { diarias, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { totalCents as calcTotal } from "@/lib/diarias/calculo";
import { podeTransicionar } from "@/lib/diarias/transicoes";
import { projecaoEventoDeDiaria, statusEventoDeDiaria, tituloDiaria } from "@/lib/diarias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");

const baseFields = {
  destino: z.string().min(1),
  origem: z.string().nullable().optional(),
  motivo: z.string().nullable().optional(),
  dataInicio: ISO,
  dataFim: ISO,
  quantidade: z.number().positive().multipleOf(0.5),
  valorUnitarioCents: z.number().int().min(0),
  seiProtocolo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
};

const STATUS = z.enum(["a_requerer", "requerida", "autorizada", "paga", "cancelada"]);

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  status: STATUS.optional(),
});

export const diariasRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const rows = await db
      .select()
      .from(diarias)
      .where(and(isNull(diarias.deletedAt), inArray(diarias.defensorId, scope)))
      .orderBy(asc(diarias.dataInicio));
    return rows.map((d) => {
      const quantidade = Number(d.quantidade);
      return { ...d, quantidade, totalCents: calcTotal(quantidade, d.valorUnitarioCents) };
    });
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });
    const total = calcTotal(input.quantidade, input.valorUnitarioCents);

    return await db.transaction(async (tx) => {
      const proj = projecaoEventoDeDiaria(
        { id: null, destino: input.destino, dataInicio: input.dataInicio, dataFim: input.dataFim, status: "a_requerer" },
        total,
      );
      const [evento] = await tx.insert(vidaFuncionalEventos).values({
        defensorId: ctx.user.id,
        tipo: proj.tipo,
        cluster: proj.cluster,
        titulo: proj.titulo,
        dataEvento: proj.dataEvento,
        dataFim: proj.dataFim,
        status: proj.status,
        valorCents: proj.valorCents,
        origem: "manual",
        dados: { diariaId: null },
      }).returning({ id: vidaFuncionalEventos.id });

      const [d] = await tx.insert(diarias).values({
        defensorId: ctx.user.id,
        destino: input.destino,
        origem: input.origem ?? null,
        motivo: input.motivo ?? null,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        quantidade: String(input.quantidade),
        valorUnitarioCents: input.valorUnitarioCents,
        status: "a_requerer",
        seiProtocolo: input.seiProtocolo ?? null,
        vidaFuncionalEventoId: evento.id,
        observacoes: input.observacoes ?? null,
      }).returning();

      await tx.update(vidaFuncionalEventos)
        .set({ dados: { diariaId: d.id } })
        .where(eq(vidaFuncionalEventos.id, evento.id));

      return d;
    });
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [d] = await db.select().from(diarias)
      .where(and(eq(diarias.id, input.id), isNull(diarias.deletedAt))).limit(1);
    if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Diária não encontrada" });
    if (d.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas diárias" });

    if (input.status && input.status !== d.status && !podeTransicionar(d.status, input.status)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${d.status} → ${input.status}` });
    }

    const novaInicio = input.dataInicio ?? d.dataInicio;
    const novaFim = input.dataFim ?? d.dataFim;
    if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

    const novaQtd = input.quantidade ?? Number(d.quantidade);
    const novoValorUnit = input.valorUnitarioCents ?? d.valorUnitarioCents;
    const novoStatus = input.status ?? d.status;
    const novoDestino = input.destino ?? d.destino;
    const total = calcTotal(novaQtd, novoValorUnit);

    return await db.transaction(async (tx) => {
      await tx.update(diarias).set({
        destino: novoDestino,
        origem: input.origem === undefined ? d.origem : input.origem,
        motivo: input.motivo === undefined ? d.motivo : input.motivo,
        dataInicio: novaInicio,
        dataFim: novaFim,
        quantidade: String(novaQtd),
        valorUnitarioCents: novoValorUnit,
        status: novoStatus,
        seiProtocolo: input.seiProtocolo === undefined ? d.seiProtocolo : input.seiProtocolo,
        observacoes: input.observacoes === undefined ? d.observacoes : input.observacoes,
        updatedAt: new Date(),
      }).where(eq(diarias.id, d.id));

      if (d.vidaFuncionalEventoId != null) {
        if (novoStatus === "cancelada") {
          await tx.update(vidaFuncionalEventos)
            .set({ deletedAt: new Date() })
            .where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            status: statusEventoDeDiaria(novoStatus),
            dataEvento: novaInicio,
            dataFim: novaFim,
            valorCents: total,
            titulo: tituloDiaria({ destino: novoDestino, dataInicio: novaInicio }),
            updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [d] = await db.select().from(diarias)
      .where(and(eq(diarias.id, input.id), isNull(diarias.deletedAt))).limit(1);
    if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Diária não encontrada" });
    if (d.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas diárias" });

    return await db.transaction(async (tx) => {
      await tx.update(diarias).set({ deletedAt: new Date() }).where(eq(diarias.id, d.id));
      if (d.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos)
          .set({ deletedAt: new Date() })
          .where(eq(vidaFuncionalEventos.id, d.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
