import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { jurados } from "@/lib/db/schema";
import { eq, desc, and, isNull, ilike, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const juradosRouter = router({
  // Listar todos os jurados ativos
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        ativo: z.boolean().optional().default(true),
      }).optional()
    )
    .query(async ({ input }) => {
      const search = input?.search;
      const ativo = input?.ativo ?? true;

      let conditions = [];
      
      if (ativo !== undefined) {
        conditions.push(eq(jurados.ativo, ativo));
      }
      
      if (search) {
        conditions.push(
          or(
            ilike(jurados.nome, `%${search}%`),
            ilike(jurados.profissao, `%${search}%`),
            ilike(jurados.bairro, `%${search}%`)
          )
        );
      }

      const result = await db
        .select()
        .from(jurados)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(jurados.createdAt));

      // Calcular taxa de absolvição para cada jurado
      return result.map(j => ({
        ...j,
        taxaAbsolvicao: j.totalSessoes && j.totalSessoes > 0
          ? Math.round((j.votosAbsolvicao || 0) / j.totalSessoes * 100)
          : 50, // Default 50% se não houver histórico
        participacoes: j.totalSessoes || 0,
      }));
    }),

  // Buscar jurado por ID
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [jurado] = await db
        .select()
        .from(jurados)
        .where(eq(jurados.id, input.id));
      
      if (!jurado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Jurado não encontrado",
        });
      }
      
      return {
        ...jurado,
        taxaAbsolvicao: jurado.totalSessoes && jurado.totalSessoes > 0
          ? Math.round((jurado.votosAbsolvicao || 0) / jurado.totalSessoes * 100)
          : 50,
        participacoes: jurado.totalSessoes || 0,
      };
    }),

  // Criar novo jurado
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        profissao: z.string().optional(),
        escolaridade: z.string().optional(),
        idade: z.number().optional(),
        bairro: z.string().optional(),
        genero: z.string().optional(),
        classeSocial: z.string().optional(),
        perfilPsicologico: z.string().optional(),
        perfilTendencia: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(jurados)
        .values({
          ...input,
          createdById: ctx.user.id,
          ativo: true,
        })
        .returning();

      return created;
    }),

  // Atualizar jurado
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        profissao: z.string().optional(),
        escolaridade: z.string().optional(),
        idade: z.number().optional(),
        bairro: z.string().optional(),
        genero: z.string().optional(),
        classeSocial: z.string().optional(),
        perfilPsicologico: z.string().optional(),
        perfilTendencia: z.string().optional(),
        observacoes: z.string().optional(),
        historicoNotas: z.string().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(jurados)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(jurados.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Jurado não encontrado",
        });
      }

      return updated;
    }),

  // Registrar voto de um jurado após sessão
  registrarVoto: protectedProcedure
    .input(
      z.object({
        juradoId: z.number(),
        voto: z.enum(["absolvicao", "condenacao", "desclassificacao"]),
      })
    )
    .mutation(async ({ input }) => {
      const [jurado] = await db
        .select()
        .from(jurados)
        .where(eq(jurados.id, input.juradoId));

      if (!jurado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Jurado não encontrado",
        });
      }

      const updates: any = {
        totalSessoes: (jurado.totalSessoes || 0) + 1,
        updatedAt: new Date(),
      };

      if (input.voto === "absolvicao") {
        updates.votosAbsolvicao = (jurado.votosAbsolvicao || 0) + 1;
      } else if (input.voto === "condenacao") {
        updates.votosCondenacao = (jurado.votosCondenacao || 0) + 1;
      } else {
        updates.votosDesclassificacao = (jurado.votosDesclassificacao || 0) + 1;
      }

      const [updated] = await db
        .update(jurados)
        .set(updates)
        .where(eq(jurados.id, input.juradoId))
        .returning();

      return updated;
    }),

  // Excluir (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(jurados)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(jurados.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Jurado não encontrado",
        });
      }

      return updated;
    }),

  // Estatísticas gerais
  stats: protectedProcedure.query(async () => {
    const todos = await db
      .select()
      .from(jurados)
      .where(eq(jurados.ativo, true));

    const total = todos.length;
    const comHistorico = todos.filter(j => (j.totalSessoes || 0) > 0).length;
    
    const mediaTendencia = total > 0
      ? todos.reduce((acc, j) => acc + (j.tendenciaVoto || 0), 0) / total
      : 0;

    const perfisPorTipo = todos.reduce((acc, j) => {
      const perfil = j.perfilTendencia || "indefinido";
      acc[perfil] = (acc[perfil] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      comHistorico,
      mediaTendencia: Math.round(mediaTendencia * 10) / 10,
      perfisPorTipo,
    };
  }),
});
