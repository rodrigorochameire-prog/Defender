import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pedidosAdministrativos, vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { podeTransicionar } from "@/lib/pedidos-administrativos/transicoes";
import { projecaoEventoDePedido } from "@/lib/pedidos-administrativos/projecao";
import { criarPedidoComEvento } from "@/lib/pedidos-administrativos/persist";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");
const ESTADO = z.enum(["solicitado", "em_analise", "deferido", "indeferido", "cancelado"]);

const baseFields = {
  assunto: z.string().min(1),
  descricao: z.string().nullable().optional(),
  dataPedido: ISO,
  prazo: ISO.nullable().optional(),
  seiProtocolo: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
};

const updateInput = z.object(baseFields).partial().extend({
  id: z.number().int(),
  estado: ESTADO.optional(),
});

export const pedidosAdministrativosRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    return await db.select().from(pedidosAdministrativos)
      .where(and(isNull(pedidosAdministrativos.deletedAt), inArray(pedidosAdministrativos.defensorId, scope)))
      .orderBy(asc(pedidosAdministrativos.dataPedido));
  }),

  criar: protectedProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) =>
      criarPedidoComEvento(tx, ctx.user.id, {
        assunto: input.assunto, descricao: input.descricao ?? null,
        dataPedido: input.dataPedido, prazo: input.prazo ?? null,
        seiProtocolo: input.seiProtocolo ?? null, observacao: input.observacao ?? null,
      }),
    );
  }),

  atualizar: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [p] = await db.select().from(pedidosAdministrativos)
      .where(and(eq(pedidosAdministrativos.id, input.id), isNull(pedidosAdministrativos.deletedAt))).limit(1);
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
    if (p.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera seus pedidos" });

    if (input.estado && input.estado !== p.estado && !podeTransicionar(p.estado, input.estado)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${p.estado} → ${input.estado}` });
    }

    const novoEstado = input.estado ?? p.estado;
    const novoAssunto = input.assunto ?? p.assunto;
    const novaData = input.dataPedido ?? p.dataPedido;
    const novoPrazo = input.prazo === undefined ? p.prazo : input.prazo;
    const proj = projecaoEventoDePedido({ id: p.id, assunto: novoAssunto, dataPedido: novaData, prazo: novoPrazo, estado: novoEstado });

    return await db.transaction(async (tx) => {
      await tx.update(pedidosAdministrativos).set({
        assunto: novoAssunto,
        descricao: input.descricao === undefined ? p.descricao : input.descricao,
        dataPedido: novaData,
        prazo: novoPrazo,
        estado: novoEstado,
        seiProtocolo: input.seiProtocolo === undefined ? p.seiProtocolo : input.seiProtocolo,
        observacao: input.observacao === undefined ? p.observacao : input.observacao,
        updatedAt: new Date(),
      }).where(eq(pedidosAdministrativos.id, p.id));

      if (p.vidaFuncionalEventoId != null) {
        if (novoEstado === "cancelado") {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
        } else {
          await tx.update(vidaFuncionalEventos).set({
            status: proj.status, titulo: proj.titulo,
            dataEvento: proj.dataEvento, prazo: proj.prazo,
            deletedAt: null, updatedAt: new Date(),
          }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
        }
      }
      return { ok: true };
    });
  }),

  remover: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const [p] = await db.select().from(pedidosAdministrativos)
      .where(and(eq(pedidosAdministrativos.id, input.id), isNull(pedidosAdministrativos.deletedAt))).limit(1);
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
    if (p.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera seus pedidos" });

    return await db.transaction(async (tx) => {
      await tx.update(pedidosAdministrativos).set({ deletedAt: new Date() }).where(eq(pedidosAdministrativos.id, p.id));
      if (p.vidaFuncionalEventoId != null) {
        await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, p.vidaFuncionalEventoId));
      }
      return { ok: true };
    });
  }),
});
