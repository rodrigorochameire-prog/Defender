import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { afastamentos, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// COBERTURA (AFASTAMENTOS) ROUTER
// Gerencia coberturas entre defensores:
//   - Defensor se afasta (férias, licença, etc.)
//   - Substituto assume suas demandas
// ==========================================

const TIPOS_AFASTAMENTO = ["FERIAS", "LICENCA", "CAPACITACAO", "OUTRO"] as const;

export const coberturaRouter = router({
  // ==========================================
  // 1. Criar afastamento (cobrir colega)
  // ==========================================
  criarAfastamento: protectedProcedure
    .input(z.object({
      substitutoId: z.number(),
      dataInicio: z.string().min(1, "Data de início é obrigatória"),
      dataFim: z.string().min(1, "Data de fim é obrigatória"),
      tipo: z.enum(TIPOS_AFASTAMENTO).default("FERIAS"),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const defensorId = ctx.user.id;

      // Não pode cobrir a si mesmo
      if (defensorId === input.substitutoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode se cobrir a si mesmo",
        });
      }

      // Verificar se o substituto existe
      const substituto = await db.query.users.findFirst({
        where: eq(users.id, input.substitutoId),
      });

      if (!substituto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Substituto não encontrado",
        });
      }

      // Validar datas
      const inicio = new Date(input.dataInicio);
      const fim = new Date(input.dataFim);

      if (fim <= inicio) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A data de fim deve ser posterior à data de início",
        });
      }

      // Criar o afastamento
      const [afastamento] = await db.insert(afastamentos)
        .values({
          defensorId,
          substitutoId: input.substitutoId,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          tipo: input.tipo,
          motivo: input.motivo || null,
          ativo: true,
          acessoDemandas: true,
          acessoEquipe: false,
          workspaceId: ctx.user.workspaceId || null,
        })
        .returning();

      return afastamento;
    }),

  // ==========================================
  // 2. Encerrar afastamento antecipadamente
  // ==========================================
  encerrarAfastamento: protectedProcedure
    .input(z.object({
      afastamentoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Buscar o afastamento
      const afastamento = await db.query.afastamentos.findFirst({
        where: eq(afastamentos.id, input.afastamentoId),
      });

      if (!afastamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Afastamento não encontrado",
        });
      }

      // Apenas o defensor afastado ou o substituto podem encerrar
      if (afastamento.defensorId !== userId && afastamento.substitutoId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para encerrar este afastamento",
        });
      }

      // Encerrar: desativar e definir data de fim como hoje
      const hoje = new Date().toISOString().split("T")[0];
      const [updated] = await db.update(afastamentos)
        .set({
          ativo: false,
          dataFim: hoje,
          updatedAt: new Date(),
        })
        .where(eq(afastamentos.id, input.afastamentoId))
        .returning();

      return updated;
    }),

  // ==========================================
  // 3. Meus afastamentos (como defensor ou substituto)
  // ==========================================
  meusAfastamentos: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Buscar afastamentos onde sou defensor ou substituto
      const resultado = await db.query.afastamentos.findMany({
        where: or(
          eq(afastamentos.defensorId, userId),
          eq(afastamentos.substitutoId, userId),
        ),
        with: {
          defensor: {
            columns: { id: true, name: true, email: true, role: true },
          },
          substituto: {
            columns: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: [desc(afastamentos.createdAt)],
      });

      // Enriquecer com informação de papel do usuário no afastamento
      return resultado.map((a) => ({
        ...a,
        meuPapel: a.defensorId === userId ? "defensor" as const : "substituto" as const,
        outraPessoa: a.defensorId === userId ? a.substituto : a.defensor,
      }));
    }),

  // ==========================================
  // 4. Coberturas ativas no workspace
  // ==========================================
  coberturas: protectedProcedure
    .query(async ({ ctx }) => {
      const resultado = await db.query.afastamentos.findMany({
        where: eq(afastamentos.ativo, true),
        with: {
          defensor: {
            columns: { id: true, name: true, email: true, role: true },
          },
          substituto: {
            columns: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: [desc(afastamentos.dataInicio)],
      });

      return resultado;
    }),

  // ==========================================
  // 5. Listar colegas disponíveis para cobertura
  // ==========================================
  colegasDisponiveis: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Buscar todos os usuários ativos (exceto o próprio)
      const todosUsuarios = await db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          funcao: true,
        },
      });

      return todosUsuarios.filter(
        (u) => u.id !== userId && !["triagem"].includes(u.role)
      );
    }),
});
