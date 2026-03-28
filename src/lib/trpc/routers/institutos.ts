import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { institutos, processos, assistidos } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const institutosRouter = router({
  /**
   * Lista todos os institutos de um processo, ordenados por createdAt desc
   */
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(institutos)
        .where(eq(institutos.processoId, input.processoId))
        .orderBy(desc(institutos.createdAt));
    }),

  /**
   * Lista institutos do defensor logado, filtrados por comarca.
   * Se role=defensor, filtra por defensorId também.
   * Suporta filtro opcional de status.
   */
  listByDefensor: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const conditions = [eq(institutos.comarcaId, user.comarcaId)];

      if (user.role === "defensor") {
        conditions.push(eq(institutos.defensorId, user.id));
      }

      if (input.status) {
        conditions.push(eq(institutos.status, input.status));
      }

      return db.query.institutos.findMany({
        where: and(...conditions),
        orderBy: [desc(institutos.createdAt)],
        with: {
          processo: true,
          assistido: true,
        },
      });
    }),

  /**
   * Cria um novo instituto processual
   */
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number(),
        tipo: z.enum([
          "ANPP",
          "SURSIS_PROCESSUAL",
          "TRANSACAO_PENAL",
          "COMPOSICAO_CIVIL",
        ]),
        condicoes: z.array(z.string()).optional(),
        dataAcordo: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        prazoMeses: z.number().optional(),
        valorPrestacao: z.string().optional(),
        horasServico: z.number().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      const [created] = await db
        .insert(institutos)
        .values({
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          tipo: input.tipo,
          status: "PROPOSTO",
          condicoes: input.condicoes,
          dataAcordo: input.dataAcordo,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          prazoMeses: input.prazoMeses,
          valorPrestacao: input.valorPrestacao,
          horasServico: input.horasServico,
          observacoes: input.observacoes,
          defensorId: user.id,
          comarcaId: user.comarcaId,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza o status de um instituto
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.observacoes !== undefined) {
        updateData.observacoes = input.observacoes;
      }

      const [updated] = await db
        .update(institutos)
        .set(updateData)
        .where(eq(institutos.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instituto não encontrado",
        });
      }

      return updated;
    }),

  /**
   * Remove um instituto
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(institutos)
        .where(eq(institutos.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instituto não encontrado",
        });
      }

      return { success: true };
    }),
});
