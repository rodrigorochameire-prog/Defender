import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, tesesDefensivas, casos } from "@/lib/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema } from "@/lib/validations";

export const tesesRouter = router({
  /**
   * Lista teses de um caso
   */
  list: protectedProcedure
    .input(
      z.object({
        casoId: idSchema,
        tipo: z.enum(["principal", "subsidiaria"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [eq(tesesDefensivas.casoId, input.casoId)];

        if (input.tipo) {
          conditions.push(eq(tesesDefensivas.tipo, input.tipo));
        }

        const result = await db
          .select()
          .from(tesesDefensivas)
          .where(and(...conditions))
          .orderBy(desc(tesesDefensivas.createdAt));

        return result;
      }, "Erro ao listar teses");
    }),

  /**
   * Busca tese por ID
   */
  byId: protectedProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const tese = await db.query.tesesDefensivas.findFirst({
          where: eq(tesesDefensivas.id, input.id),
        });

        if (!tese) {
          throw Errors.notFound("Tese defensiva");
        }

        return tese;
      }, "Erro ao buscar tese");
    }),

  /**
   * Cria nova tese defensiva
   */
  create: protectedProcedure
    .input(
      z.object({
        casoId: idSchema,
        titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
        descricao: z.string().optional(),
        tipo: z.enum(["principal", "subsidiaria"]).default("principal"),
        probabilidadeAceitacao: z.number().min(0).max(100).optional(),
        argumentosChave: z.array(z.string()).optional(),
        jurisprudenciaRelacionada: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Verificar se o caso existe
        const caso = await db.query.casos.findFirst({
          where: eq(casos.id, input.casoId),
        });

        if (!caso) {
          throw Errors.notFound("Caso");
        }

        const [tese] = await db
          .insert(tesesDefensivas)
          .values({
            casoId: input.casoId,
            titulo: input.titulo.trim(),
            descricao: input.descricao?.trim() || null,
            tipo: input.tipo,
            probabilidadeAceitacao: input.probabilidadeAceitacao ?? null,
            argumentosChave: input.argumentosChave || [],
            jurisprudenciaRelacionada: input.jurisprudenciaRelacionada || [],
          })
          .returning();

        return tese;
      }, "Erro ao criar tese");
    }),

  /**
   * Atualiza tese defensiva
   */
  update: protectedProcedure
    .input(
      z.object({
        id: idSchema,
        titulo: z.string().min(2).optional(),
        descricao: z.string().optional().nullable(),
        tipo: z.enum(["principal", "subsidiaria"]).optional(),
        probabilidadeAceitacao: z.number().min(0).max(100).optional().nullable(),
        argumentosChave: z.array(z.string()).optional(),
        jurisprudenciaRelacionada: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;

        const existing = await db.query.tesesDefensivas.findFirst({
          where: eq(tesesDefensivas.id, id),
        });

        if (!existing) {
          throw Errors.notFound("Tese defensiva");
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.titulo !== undefined) updateData.titulo = data.titulo.trim();
        if (data.descricao !== undefined) updateData.descricao = data.descricao?.trim() || null;
        if (data.tipo !== undefined) updateData.tipo = data.tipo;
        if (data.probabilidadeAceitacao !== undefined) updateData.probabilidadeAceitacao = data.probabilidadeAceitacao;
        if (data.argumentosChave !== undefined) updateData.argumentosChave = data.argumentosChave;
        if (data.jurisprudenciaRelacionada !== undefined) updateData.jurisprudenciaRelacionada = data.jurisprudenciaRelacionada;

        const [updated] = await db
          .update(tesesDefensivas)
          .set(updateData)
          .where(eq(tesesDefensivas.id, id))
          .returning();

        return updated;
      }, "Erro ao atualizar tese");
    }),

  /**
   * Remove tese defensiva
   */
  delete: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existing = await db.query.tesesDefensivas.findFirst({
          where: eq(tesesDefensivas.id, input.id),
        });

        if (!existing) {
          throw Errors.notFound("Tese defensiva");
        }

        await db.delete(tesesDefensivas).where(eq(tesesDefensivas.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao excluir tese");
    }),

  /**
   * Estatísticas de teses por caso
   */
  stats: protectedProcedure
    .input(z.object({ casoId: idSchema }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const [total] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tesesDefensivas)
          .where(eq(tesesDefensivas.casoId, input.casoId));

        const [principais] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tesesDefensivas)
          .where(
            and(
              eq(tesesDefensivas.casoId, input.casoId),
              eq(tesesDefensivas.tipo, "principal")
            )
          );

        const [subsidiarias] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tesesDefensivas)
          .where(
            and(
              eq(tesesDefensivas.casoId, input.casoId),
              eq(tesesDefensivas.tipo, "subsidiaria")
            )
          );

        return {
          total: total.count,
          principais: principais.count,
          subsidiarias: subsidiarias.count,
        };
      }, "Erro ao buscar estatísticas de teses");
    }),
});
