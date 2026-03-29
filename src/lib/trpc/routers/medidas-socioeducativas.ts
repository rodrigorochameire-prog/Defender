import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { medidasSocioeducativas } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const TIPOS_MEDIDA = [
  "ADVERTENCIA",
  "REPARACAO_DANO",
  "PSC",
  "LIBERDADE_ASSISTIDA",
  "SEMILIBERDADE",
  "INTERNACAO",
  "INTERNACAO_PROVISORIA",
] as const;

export const medidasSocioeducativasRouter = router({
  /**
   * Lista todas as medidas socioeducativas de um processo, ordenadas por createdAt desc
   */
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(medidasSocioeducativas)
        .where(eq(medidasSocioeducativas.processoId, input.processoId))
        .orderBy(desc(medidasSocioeducativas.createdAt));
    }),

  /**
   * Lista medidas do defensor logado, filtradas por comarca.
   * Suporta filtros opcionais de status e tipo.
   */
  listByDefensor: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        tipo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const conditions = [eq(medidasSocioeducativas.comarcaId, user.comarcaId)];

      if (user.role === "defensor") {
        conditions.push(eq(medidasSocioeducativas.defensorId, user.id));
      }

      if (input.status) {
        conditions.push(eq(medidasSocioeducativas.status, input.status));
      }

      if (input.tipo) {
        conditions.push(eq(medidasSocioeducativas.tipo, input.tipo));
      }

      return db.query.medidasSocioeducativas.findMany({
        where: and(...conditions),
        orderBy: [desc(medidasSocioeducativas.createdAt)],
        with: {
          processo: true,
          assistido: true,
        },
      });
    }),

  /**
   * Cria uma nova medida socioeducativa
   */
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number(),
        tipo: z.enum(TIPOS_MEDIDA),
        dataAplicacao: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        prazoMeses: z.number().optional(),
        prazoMaximoMeses: z.number().optional(),
        condicoes: z.array(z.string()).optional(),
        horasServico: z.number().optional(),
        unidadeExecucao: z.string().optional(),
        dataProximaReavaliacao: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      const [created] = await db
        .insert(medidasSocioeducativas)
        .values({
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          tipo: input.tipo,
          status: "APLICADA",
          dataAplicacao: input.dataAplicacao,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          prazoMeses: input.prazoMeses,
          prazoMaximoMeses: input.prazoMaximoMeses,
          condicoes: input.condicoes,
          horasServico: input.horasServico,
          unidadeExecucao: input.unidadeExecucao,
          dataProximaReavaliacao: input.dataProximaReavaliacao,
          observacoes: input.observacoes,
          defensorId: user.id,
          comarcaId: user.comarcaId,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza o status de uma medida socioeducativa
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string(),
        motivoSubstituicao: z.string().optional(),
        observacoes: z.string().optional(),
        dataProximaReavaliacao: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.motivoSubstituicao !== undefined) {
        updateData.motivoSubstituicao = input.motivoSubstituicao;
      }
      if (input.observacoes !== undefined) {
        updateData.observacoes = input.observacoes;
      }
      if (input.dataProximaReavaliacao !== undefined) {
        updateData.dataProximaReavaliacao = input.dataProximaReavaliacao;
      }

      const [updated] = await db
        .update(medidasSocioeducativas)
        .set(updateData)
        .where(eq(medidasSocioeducativas.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medida socioeducativa não encontrada",
        });
      }

      return updated;
    }),

  /**
   * Remove uma medida socioeducativa
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(medidasSocioeducativas)
        .where(eq(medidasSocioeducativas.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medida socioeducativa não encontrada",
        });
      }

      return { success: true };
    }),
});
