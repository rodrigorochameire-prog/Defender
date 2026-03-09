import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { afastamentos, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// COBERTURAS ROUTER (LEFT JOIN version)
// Gerencia afastamentos e coberturas entre defensores
// Usa LEFT JOINs em vez de relations/with
// ==========================================

export const coberturasRouter = router({
  // ==========================================
  // 1. Listar afastamentos do workspace
  // ==========================================
  listar: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await db
        .select({
          id: afastamentos.id,
          defensorId: afastamentos.defensorId,
          substitutoId: afastamentos.substitutoId,
          dataInicio: afastamentos.dataInicio,
          dataFim: afastamentos.dataFim,
          tipo: afastamentos.tipo,
          motivo: afastamentos.motivo,
          ativo: afastamentos.ativo,
          acessoDemandas: afastamentos.acessoDemandas,
          acessoEquipe: afastamentos.acessoEquipe,
          createdAt: afastamentos.createdAt,
          updatedAt: afastamentos.updatedAt,
          defensorNome: sql<string>`(SELECT name FROM users WHERE id = ${afastamentos.defensorId})`.as('defensor_nome'),
          substitutoNome: sql<string>`(SELECT name FROM users WHERE id = ${afastamentos.substitutoId})`.as('substituto_nome'),
        })
        .from(afastamentos)
        .orderBy(desc(afastamentos.dataInicio))
        .limit(50);

      return result;
    }),

  // ==========================================
  // 2. Criar afastamento
  // ==========================================
  criar: protectedProcedure
    .input(z.object({
      defensorId: z.number(),
      substitutoId: z.number(),
      dataInicio: z.string().min(1, "Data de inicio e obrigatoria"),
      dataFim: z.string().optional(),
      tipo: z.string().min(1, "Tipo e obrigatorio"),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [afastamento] = await db.insert(afastamentos)
        .values({
          defensorId: input.defensorId,
          substitutoId: input.substitutoId,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim || null,
          tipo: input.tipo,
          motivo: input.motivo || null,
          ativo: true,
          acessoDemandas: true,
          acessoEquipe: false,
        })
        .returning();

      return afastamento;
    }),

  // ==========================================
  // 3. Atualizar afastamento
  // ==========================================
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      dataFim: z.string().optional(),
      tipo: z.string().optional(),
      motivo: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: afastamentos.id })
        .from(afastamentos)
        .where(eq(afastamentos.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Afastamento nao encontrado",
        });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.dataFim !== undefined) updateData.dataFim = input.dataFim;
      if (input.tipo !== undefined) updateData.tipo = input.tipo;
      if (input.motivo !== undefined) updateData.motivo = input.motivo;
      if (input.ativo !== undefined) updateData.ativo = input.ativo;

      const [updated] = await db.update(afastamentos)
        .set(updateData)
        .where(eq(afastamentos.id, input.id))
        .returning();

      return updated;
    }),

  // ==========================================
  // 4. Encerrar afastamento (ativo = false)
  // ==========================================
  encerrar: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: afastamentos.id })
        .from(afastamentos)
        .where(eq(afastamentos.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Afastamento nao encontrado",
        });
      }

      const [updated] = await db.update(afastamentos)
        .set({
          ativo: false,
          updatedAt: new Date(),
        })
        .where(eq(afastamentos.id, input.id))
        .returning();

      return updated;
    }),
});
