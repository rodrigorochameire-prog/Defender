import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { atosInfracionais } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const atosInfracionaisRouter = router({
  /**
   * Lista todos os atos infracionais de um processo, ordenados por createdAt desc
   */
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(atosInfracionais)
        .where(eq(atosInfracionais.processoId, input.processoId))
        .orderBy(desc(atosInfracionais.createdAt));
    }),

  /**
   * Cria um novo ato infracional
   */
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number().optional(),
        atoEquiparado: z.string(),
        artigoEquiparado: z.string(),
        qualificadoras: z.array(z.string()).optional(),
        envolveuViolencia: z.boolean(),
        envolveuGraveAmeaca: z.boolean().optional(),
        idadeNaData: z.number().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      const [created] = await db
        .insert(atosInfracionais)
        .values({
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          atoEquiparado: input.atoEquiparado,
          artigoEquiparado: input.artigoEquiparado,
          qualificadoras: input.qualificadoras,
          envolveuViolencia: input.envolveuViolencia,
          envolveuGraveAmeaca: input.envolveuGraveAmeaca ?? false,
          idadeNaData: input.idadeNaData,
          observacoes: input.observacoes,
          comarcaId: user.comarcaId,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza dados de remissão de um ato infracional
   */
  updateRemissao: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        remissao: z.enum(["CONCEDIDA_MP", "CONCEDIDA_JUIZ", "NEGADA"]),
        dataRemissao: z.string().optional(),
        condicoesRemissao: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {
        remissao: input.remissao,
        updatedAt: new Date(),
      };

      if (input.dataRemissao !== undefined) {
        updateData.dataRemissao = input.dataRemissao;
      }
      if (input.condicoesRemissao !== undefined) {
        updateData.condicoesRemissao = input.condicoesRemissao;
      }

      const [updated] = await db
        .update(atosInfracionais)
        .set(updateData)
        .where(eq(atosInfracionais.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ato infracional não encontrado",
        });
      }

      return updated;
    }),

  /**
   * Remove um ato infracional
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(atosInfracionais)
        .where(eq(atosInfracionais.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ato infracional não encontrado",
        });
      }

      return { success: true };
    }),
});
