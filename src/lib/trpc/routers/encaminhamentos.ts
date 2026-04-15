import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
  encaminhamentoRespostas,
  demandasAcompanhantes,
} from "@/lib/db/schema/cowork";
import { demandas } from "@/lib/db/schema/core";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/lib/inngest/client";

const TIPO = z.enum([
  "transferir", "encaminhar", "acompanhar", "anotar", "parecer",
]);

const SINGLE_DEST_TIPOS = new Set(["transferir", "acompanhar", "parecer"]);

async function assertIsDestinatario(encaminhamentoId: number, userId: number) {
  const [d] = await db
    .select()
    .from(encaminhamentoDestinatarios)
    .where(and(
      eq(encaminhamentoDestinatarios.encaminhamentoId, encaminhamentoId),
      eq(encaminhamentoDestinatarios.userId, userId),
    ))
    .limit(1);
  if (!d) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não é destinatário deste encaminhamento.",
    });
  }
  return d;
}

async function assertIsRemetente(encaminhamentoId: number, userId: number) {
  const [e] = await db
    .select()
    .from(encaminhamentos)
    .where(and(
      eq(encaminhamentos.id, encaminhamentoId),
      eq(encaminhamentos.remetenteId, userId),
    ))
    .limit(1);
  if (!e) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não é o remetente deste encaminhamento.",
    });
  }
  return e;
}

export const encaminhamentosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      filtro: z.enum(["recebidos", "enviados", "arquivados"]),
      tipo: TIPO.optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const meusAsDestinatario = db
        .select({ id: encaminhamentoDestinatarios.encaminhamentoId })
        .from(encaminhamentoDestinatarios)
        .where(eq(encaminhamentoDestinatarios.userId, userId));

      let whereClause;
      if (input.filtro === "enviados") {
        whereClause = eq(encaminhamentos.remetenteId, userId);
      } else if (input.filtro === "recebidos") {
        whereClause = and(
          inArray(encaminhamentos.id, meusAsDestinatario),
          or(
            eq(encaminhamentos.status, "pendente"),
            eq(encaminhamentos.status, "ciente"),
            eq(encaminhamentos.status, "aceito"),
            eq(encaminhamentos.status, "respondido"),
            eq(encaminhamentos.status, "concluido"),
          ),
        );
      } else {
        whereClause = and(
          or(
            eq(encaminhamentos.remetenteId, userId),
            inArray(encaminhamentos.id, meusAsDestinatario),
          ),
          eq(encaminhamentos.status, "arquivado"),
        );
      }

      if (input.tipo) {
        whereClause = and(whereClause, eq(encaminhamentos.tipo, input.tipo));
      }

      const rows = await db
        .select()
        .from(encaminhamentos)
        .where(whereClause)
        .orderBy(desc(encaminhamentos.createdAt))
        .limit(input.limit);

      return { items: rows };
    }),

  criar: protectedProcedure
    .input(z.object({
      tipo: TIPO,
      titulo: z.string().max(200).optional(),
      mensagem: z.string().min(1),
      destinatarioIds: z.array(z.number()).min(1),
      demandaId: z.number().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      urgencia: z.enum(["normal", "urgente"]).default("normal"),
      notificarOmbuds: z.boolean().default(true),
      notificarWhatsapp: z.boolean().default(false),
      notificarEmail: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (SINGLE_DEST_TIPOS.has(input.tipo) && input.destinatarioIds.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tipo "${input.tipo}" aceita apenas 1 destinatário.`,
        });
      }

      // Transferir: apenas o dono atual da demanda pode iniciar
      if (input.tipo === "transferir") {
        if (!input.demandaId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transferência requer demandaId." });
        }
        const [dem] = await db
          .select({ defensorId: demandas.defensorId })
          .from(demandas)
          .where(eq(demandas.id, input.demandaId))
          .limit(1);
        if (!dem) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });
        if (dem.defensorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o titular da demanda pode transferi-la.",
          });
        }
      }

      const enc = await withTransaction(async (tx) => {
        const [created] = await tx.insert(encaminhamentos).values({
          workspaceId: ctx.user.workspaceId ?? 1,
          remetenteId: ctx.user.id,
          tipo: input.tipo,
          titulo: input.titulo ?? null,
          mensagem: input.mensagem,
          demandaId: input.demandaId ?? null,
          processoId: input.processoId ?? null,
          assistidoId: input.assistidoId ?? null,
          urgencia: input.urgencia,
          notificarOmbuds: input.notificarOmbuds,
          notificarWhatsapp: input.notificarWhatsapp,
          notificarEmail: input.notificarEmail,
        }).returning();

        await tx.insert(encaminhamentoDestinatarios).values(
          input.destinatarioIds.map((uid) => ({
            encaminhamentoId: created.id,
            userId: uid,
          })),
        );

        return created;
      });

      inngest
        .send({ name: "cowork/encaminhamento.criado", data: { encaminhamentoId: enc.id } })
        .catch((e) => console.error("[encaminhamentos] inngest send falhou:", e));

      return { id: enc.id };
    }),

  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [enc] = await db
        .select()
        .from(encaminhamentos)
        .where(eq(encaminhamentos.id, input.id))
        .limit(1);
      if (!enc) throw new TRPCError({ code: "NOT_FOUND" });

      const isRemetente = enc.remetenteId === ctx.user.id;
      if (!isRemetente) await assertIsDestinatario(enc.id, ctx.user.id);

      const dests = await db
        .select()
        .from(encaminhamentoDestinatarios)
        .where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));
      const resp = await db
        .select()
        .from(encaminhamentoRespostas)
        .where(eq(encaminhamentoRespostas.encaminhamentoId, enc.id))
        .orderBy(encaminhamentoRespostas.createdAt);

      return { encaminhamento: enc, destinatarios: dests, respostas: resp };
    }),

  contadores: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const subquery = db
      .select({ id: encaminhamentoDestinatarios.encaminhamentoId })
      .from(encaminhamentoDestinatarios)
      .where(eq(encaminhamentoDestinatarios.userId, userId));

    const pendentes = await db
      .select({ id: encaminhamentos.id })
      .from(encaminhamentos)
      .where(and(
        inArray(encaminhamentos.id, subquery),
        eq(encaminhamentos.status, "pendente"),
      ));

    const aguardaAceite = await db
      .select({ id: encaminhamentos.id })
      .from(encaminhamentos)
      .where(and(
        inArray(encaminhamentos.id, subquery),
        eq(encaminhamentos.status, "pendente"),
        inArray(encaminhamentos.tipo, ["transferir", "acompanhar"]),
      ));

    return {
      recebidosPendentes: pendentes.length,
      aguardaAceite: aguardaAceite.length,
    };
  }),

  marcarCiente: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dest = await assertIsDestinatario(input.id, ctx.user.id);
      const now = new Date();
      await db
        .update(encaminhamentoDestinatarios)
        .set({ estadoPessoal: "ciente", cienteEm: now, lidoEm: dest.lidoEm ?? now })
        .where(eq(encaminhamentoDestinatarios.id, dest.id));

      const todos = await db
        .select()
        .from(encaminhamentoDestinatarios)
        .where(eq(encaminhamentoDestinatarios.encaminhamentoId, input.id));
      if (todos.every((d) => d.estadoPessoal === "ciente")) {
        await db
          .update(encaminhamentos)
          .set({ status: "ciente", updatedAt: now })
          .where(eq(encaminhamentos.id, input.id));
      }
      return { ok: true };
    }),

  aceitar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertIsDestinatario(input.id, ctx.user.id);
      const [enc] = await db
        .select()
        .from(encaminhamentos)
        .where(eq(encaminhamentos.id, input.id))
        .limit(1);
      if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
      if (enc.status !== "pendente") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Encaminhamento não está pendente." });
      }

      const now = new Date();
      await withTransaction(async (tx) => {
        if (enc.tipo === "transferir" && enc.demandaId) {
          await tx
            .update(demandas)
            .set({ defensorId: ctx.user.id, updatedAt: now })
            .where(eq(demandas.id, enc.demandaId));
        }
        if (enc.tipo === "acompanhar" && enc.demandaId) {
          await tx
            .insert(demandasAcompanhantes)
            .values({
              demandaId: enc.demandaId,
              userId: ctx.user.id,
              origemEncaminhamentoId: enc.id,
            })
            .onConflictDoNothing();
        }
        await tx
          .update(encaminhamentos)
          .set({
            status: "aceito",
            concluidoEm: now,
            concluidoPorId: ctx.user.id,
            updatedAt: now,
          })
          .where(eq(encaminhamentos.id, enc.id));
      });

      return { ok: true };
    }),

  recusar: protectedProcedure
    .input(z.object({ id: z.number(), motivo: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await assertIsDestinatario(input.id, ctx.user.id);
      const now = new Date();
      await db
        .update(encaminhamentos)
        .set({
          status: "recusado",
          motivoRecusa: input.motivo,
          concluidoEm: now,
          concluidoPorId: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(encaminhamentos.id, input.id));
      return { ok: true };
    }),

  responder: protectedProcedure
    .input(z.object({ id: z.number(), mensagem: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [enc] = await db
        .select()
        .from(encaminhamentos)
        .where(eq(encaminhamentos.id, input.id))
        .limit(1);
      if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
      const isRem = enc.remetenteId === ctx.user.id;
      if (!isRem) await assertIsDestinatario(input.id, ctx.user.id);

      const now = new Date();
      await db.insert(encaminhamentoRespostas).values({
        encaminhamentoId: input.id,
        autorId: ctx.user.id,
        mensagem: input.mensagem,
      });

      if (enc.tipo === "parecer" && !isRem && enc.status === "pendente") {
        await db
          .update(encaminhamentos)
          .set({ status: "respondido", updatedAt: now })
          .where(eq(encaminhamentos.id, input.id));
      }

      return { ok: true };
    }),

  marcarConcluido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertIsRemetente(input.id, ctx.user.id);
      const now = new Date();
      await db
        .update(encaminhamentos)
        .set({
          status: "concluido",
          concluidoEm: now,
          concluidoPorId: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(encaminhamentos.id, input.id));
      return { ok: true };
    }),

  arquivar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [enc] = await db
        .select()
        .from(encaminhamentos)
        .where(eq(encaminhamentos.id, input.id))
        .limit(1);
      if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
      if (enc.remetenteId !== ctx.user.id) {
        await assertIsDestinatario(input.id, ctx.user.id);
      }
      const now = new Date();
      if (enc.remetenteId === ctx.user.id) {
        await db
          .update(encaminhamentos)
          .set({ status: "arquivado", updatedAt: now })
          .where(eq(encaminhamentos.id, input.id));
      } else {
        await db
          .update(encaminhamentoDestinatarios)
          .set({ estadoPessoal: "arquivado" })
          .where(and(
            eq(encaminhamentoDestinatarios.encaminhamentoId, input.id),
            eq(encaminhamentoDestinatarios.userId, ctx.user.id),
          ));
      }
      return { ok: true };
    }),

  cancelar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertIsRemetente(input.id, ctx.user.id);
      const now = new Date();
      await db
        .update(encaminhamentos)
        .set({
          status: "cancelado",
          concluidoEm: now,
          concluidoPorId: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(encaminhamentos.id, input.id));
      return { ok: true };
    }),
});
