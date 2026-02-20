import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { muralNotas } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// MURAL DE EQUIPE ROUTER
// Notas, avisos e observações da equipe
// ==========================================

export const muralRouter = router({
  // ==========================================
  // 1. Criar nota
  // ==========================================
  criarNota: protectedProcedure
    .input(z.object({
      mensagem: z.string().min(1, "A mensagem não pode estar vazia"),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
      fixado: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [nota] = await db.insert(muralNotas)
        .values({
          autorId: ctx.user.id,
          mensagem: input.mensagem,
          assistidoId: input.assistidoId ?? null,
          processoId: input.processoId ?? null,
          fixado: input.fixado ?? false,
          workspaceId: ctx.user.workspaceId ?? 0,
        })
        .returning();

      return nota;
    }),

  // ==========================================
  // 2. Editar nota (apenas autor)
  // ==========================================
  editarNota: protectedProcedure
    .input(z.object({
      id: z.number(),
      mensagem: z.string().min(1, "A mensagem não pode estar vazia"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar nota para verificar autoria
      const nota = await db.query.muralNotas.findFirst({
        where: eq(muralNotas.id, input.id),
      });

      if (!nota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nota não encontrada",
        });
      }

      if (nota.autorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você só pode editar suas próprias notas",
        });
      }

      const [updated] = await db.update(muralNotas)
        .set({ mensagem: input.mensagem })
        .where(eq(muralNotas.id, input.id))
        .returning();

      return updated;
    }),

  // ==========================================
  // 3. Excluir nota (apenas autor)
  // ==========================================
  excluirNota: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar nota para verificar autoria
      const nota = await db.query.muralNotas.findFirst({
        where: eq(muralNotas.id, input.id),
      });

      if (!nota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nota não encontrada",
        });
      }

      if (nota.autorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você só pode excluir suas próprias notas",
        });
      }

      await db.delete(muralNotas)
        .where(eq(muralNotas.id, input.id));

      return { success: true };
    }),

  // ==========================================
  // 4. Fixar/desfixar nota (qualquer membro)
  // ==========================================
  fixarNota: protectedProcedure
    .input(z.object({
      id: z.number(),
      fixado: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const nota = await db.query.muralNotas.findFirst({
        where: eq(muralNotas.id, input.id),
      });

      if (!nota) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nota não encontrada",
        });
      }

      const [updated] = await db.update(muralNotas)
        .set({ fixado: input.fixado })
        .where(eq(muralNotas.id, input.id))
        .returning();

      return updated;
    }),

  // ==========================================
  // 5. Listar notas do workspace
  // ==========================================
  listarNotas: protectedProcedure
    .query(async ({ ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 0;

      const notas = await db.query.muralNotas.findMany({
        where: eq(muralNotas.workspaceId, workspaceId),
        with: {
          autor: {
            columns: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: [desc(muralNotas.fixado), desc(muralNotas.createdAt)],
        limit: 50,
      });

      return notas;
    }),
});
