import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pareceres, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// PARECER (CONSULTAS RÁPIDAS) ROUTER
// Gerencia pedidos de parecer entre colegas:
//   - Solicitante faz uma pergunta
//   - Respondedor responde a consulta
//   - Sem transferência de responsabilidade
// ==========================================

export const parecerRouter = router({
  // ==========================================
  // 1. Solicitar parecer (criar consulta)
  // ==========================================
  solicitar: protectedProcedure
    .input(z.object({
      respondedorId: z.number(),
      pergunta: z.string().min(1, "Pergunta é obrigatória"),
      urgencia: z.enum(["normal", "urgente"]).default("normal"),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const solicitanteId = ctx.user.id;

      // Não pode pedir parecer a si mesmo
      if (solicitanteId === input.respondedorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode pedir parecer a si mesmo",
        });
      }

      // Verificar se o respondedor existe
      const respondedor = await db.query.users.findFirst({
        where: eq(users.id, input.respondedorId),
      });

      if (!respondedor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colega não encontrado",
        });
      }

      // Criar o parecer
      const [parecer] = await db.insert(pareceres)
        .values({
          solicitanteId,
          respondedorId: input.respondedorId,
          pergunta: input.pergunta,
          urgencia: input.urgencia,
          assistidoId: input.assistidoId || null,
          processoId: input.processoId || null,
          status: "solicitado",
          workspaceId: ctx.user.workspaceId!,
        })
        .returning();

      return parecer;
    }),

  // ==========================================
  // 2. Responder parecer
  // ==========================================
  responder: protectedProcedure
    .input(z.object({
      parecerId: z.number(),
      resposta: z.string().min(1, "Resposta é obrigatória"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Buscar o parecer
      const parecer = await db.query.pareceres.findFirst({
        where: eq(pareceres.id, input.parecerId),
      });

      if (!parecer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parecer não encontrado",
        });
      }

      // Apenas o respondedor pode responder
      if (parecer.respondedorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o colega consultado pode responder este parecer",
        });
      }

      // Atualizar com a resposta
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
  // 3. Marcar parecer como lido
  // ==========================================
  marcarLido: protectedProcedure
    .input(z.object({
      parecerId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Buscar o parecer
      const parecer = await db.query.pareceres.findFirst({
        where: eq(pareceres.id, input.parecerId),
      });

      if (!parecer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parecer não encontrado",
        });
      }

      // Apenas o solicitante pode marcar como lido
      if (parecer.solicitanteId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas quem solicitou pode marcar como lido",
        });
      }

      // Só pode marcar como lido se já foi respondido
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

  // ==========================================
  // 4. Meus pareceres (solicitados e recebidos)
  // ==========================================
  meusPareceres: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Buscar pareceres onde sou solicitante ou respondedor
      const resultado = await db.query.pareceres.findMany({
        where: or(
          eq(pareceres.solicitanteId, userId),
          eq(pareceres.respondedorId, userId),
        ),
        with: {
          solicitante: {
            columns: { id: true, name: true, email: true, role: true },
          },
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
        limit: 50,
      });

      type UserInfo = { id: number; name: string; email: string; role: string };

      // Enriquecer com informação de papel do usuário
      return resultado.map((p: any) => ({
        ...p,
        meuPapel: p.solicitanteId === userId ? "solicitante" as const : "respondedor" as const,
        outraPessoa: p.solicitanteId === userId ? p.respondedor as UserInfo : p.solicitante as UserInfo,
      }));
    }),

  // ==========================================
  // 5. Listar colegas para parecer
  // ==========================================
  colegas: protectedProcedure
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
