import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pareceres } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// PARECERES ROUTER
// Consultas entre colegas (solicitados/recebidos)
// ==========================================

export const pareceresRouter = router({
  // ==========================================
  // 1. Recebidos - pareceres onde sou respondedor
  // ==========================================
  recebidos: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const resultado = await db.query.pareceres.findMany({
        where: eq(pareceres.respondedorId, userId),
        with: {
          solicitante: {
            columns: { id: true, name: true, email: true, role: true },
          },
          assistido: {
            columns: { id: true, nome: true },
          },
          processo: {
            columns: { id: true, numeroAutos: true },
          },
        },
        orderBy: [desc(pareceres.dataSolicitacao)],
      });

      return resultado;
    }),

  // ==========================================
  // 2. Enviados - pareceres onde sou solicitante
  // ==========================================
  enviados: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const resultado = await db.query.pareceres.findMany({
        where: eq(pareceres.solicitanteId, userId),
        with: {
          respondedor: {
            columns: { id: true, name: true, email: true, role: true },
          },
          assistido: {
            columns: { id: true, nome: true },
          },
          processo: {
            columns: { id: true, numeroAutos: true },
          },
        },
        orderBy: [desc(pareceres.dataSolicitacao)],
      });

      return resultado;
    }),

  // ==========================================
  // 3. Solicitar parecer (criar consulta)
  // ==========================================
  solicitar: protectedProcedure
    .input(z.object({
      respondedorId: z.number(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
      pergunta: z.string().min(1, "Pergunta é obrigatória"),
      urgencia: z.enum(["normal", "urgente"]).default("normal"),
    }))
    .mutation(async ({ ctx, input }) => {
      const solicitanteId = ctx.user.id;

      if (solicitanteId === input.respondedorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode pedir parecer a si mesmo",
        });
      }

      const [parecer] = await db.insert(pareceres)
        .values({
          solicitanteId,
          respondedorId: input.respondedorId,
          pergunta: input.pergunta,
          urgencia: input.urgencia,
          assistidoId: input.assistidoId ?? null,
          processoId: input.processoId ?? null,
          status: "solicitado",
          workspaceId: ctx.user.workspaceId ?? 0,
        })
        .returning();

      return parecer;
    }),

  // ==========================================
  // 4. Responder parecer
  // ==========================================
  responder: protectedProcedure
    .input(z.object({
      parecerId: z.number(),
      resposta: z.string().min(1, "Resposta é obrigatória"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const parecer = await db.query.pareceres.findFirst({
        where: eq(pareceres.id, input.parecerId),
      });

      if (!parecer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parecer não encontrado",
        });
      }

      if (parecer.respondedorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o colega consultado pode responder este parecer",
        });
      }

      const [updated] = await db.update(pareceres)
        .set({
          resposta: input.resposta,
          status: "respondido",
          dataResposta: new Date(),
        })
        .where(eq(pareceres.id, input.parecerId))
        .returning();

      return updated;
    }),

  // ==========================================
  // 5. Marcar como lido (apenas solicitante)
  // ==========================================
  marcarLido: protectedProcedure
    .input(z.object({
      parecerId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const parecer = await db.query.pareceres.findFirst({
        where: eq(pareceres.id, input.parecerId),
      });

      if (!parecer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parecer não encontrado",
        });
      }

      if (parecer.solicitanteId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas quem solicitou pode marcar como lido",
        });
      }

      if (parecer.status !== "respondido") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível marcar como lido após a resposta",
        });
      }

      const [updated] = await db.update(pareceres)
        .set({ status: "lido" })
        .where(eq(pareceres.id, input.parecerId))
        .returning();

      return updated;
    }),
});
