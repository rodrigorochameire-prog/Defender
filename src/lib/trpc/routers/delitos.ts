import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { delitos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calcularBeneficios } from "@/lib/legal/beneficios";

export const delitosRouter = router({
  /**
   * Lista todos os delitos de um processo, ordenados por createdAt desc
   */
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(delitos)
        .where(eq(delitos.processoId, input.processoId))
        .orderBy(desc(delitos.createdAt));
    }),

  /**
   * Cria um novo delito, calculando benefícios automaticamente se penas fornecidas
   */
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number().optional(),
        tipoDelito: z.string(),
        artigoBase: z.string(),
        incisos: z.array(z.string()).optional(),
        qualificadoras: z.array(z.string()).optional(),
        causasAumento: z.array(z.string()).optional(),
        causasDiminuicao: z.array(z.string()).optional(),
        penaMinimaMeses: z.number().optional(),
        penaMaximaMeses: z.number().optional(),
        envolveuViolencia: z.boolean().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      // Auto-calcula benefícios se penas fornecidas
      let beneficios: {
        cabeAnpp: boolean;
        cabeSursis: boolean;
        cabeTransacao: boolean;
        cabeSubstituicao: boolean;
      } | null = null;

      if (
        input.penaMinimaMeses !== undefined &&
        input.penaMaximaMeses !== undefined
      ) {
        beneficios = calcularBeneficios({
          tipoDelito: input.tipoDelito,
          penaMinimaMeses: input.penaMinimaMeses,
          penaMaximaMeses: input.penaMaximaMeses,
          envolveuViolencia: input.envolveuViolencia ?? false,
        });
      }

      const [created] = await db
        .insert(delitos)
        .values({
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          tipoDelito: input.tipoDelito,
          artigoBase: input.artigoBase,
          incisos: input.incisos,
          qualificadoras: input.qualificadoras,
          causasAumento: input.causasAumento,
          causasDiminuicao: input.causasDiminuicao,
          penaMinimaMeses: input.penaMinimaMeses,
          penaMaximaMeses: input.penaMaximaMeses,
          observacoes: input.observacoes,
          comarcaId: user.comarcaId,
          ...(beneficios ?? {}),
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza campos pós-sentença e outros dados opcionais de um delito
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        penaAplicadaMeses: z.number().optional(),
        regimeInicial: z.string().optional(),
        dataSentenca: z.string().optional(),
        resultadoSentenca: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (fields.penaAplicadaMeses !== undefined)
        updateData.penaAplicadaMeses = fields.penaAplicadaMeses;
      if (fields.regimeInicial !== undefined)
        updateData.regimeInicial = fields.regimeInicial;
      if (fields.dataSentenca !== undefined)
        updateData.dataSentenca = fields.dataSentenca;
      if (fields.resultadoSentenca !== undefined)
        updateData.resultadoSentenca = fields.resultadoSentenca;
      if (fields.observacoes !== undefined)
        updateData.observacoes = fields.observacoes;

      const [updated] = await db
        .update(delitos)
        .set(updateData)
        .where(eq(delitos.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delito não encontrado",
        });
      }

      return updated;
    }),

  /**
   * Remove um delito
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(delitos)
        .where(eq(delitos.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delito não encontrado",
        });
      }

      return { success: true };
    }),
});
