import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { chatHistory, assistidos, processos } from "@/lib/db/schema";
import { eq, ilike, desc } from "drizzle-orm";

export const skillsRouter = router({
  autocomplete: protectedProcedure
    .input(z.object({
      type: z.enum(["assistido", "processo", "usuario"]),
      query: z.string().min(2),
      limit: z.number().default(5),
    }))
    .query(async ({ input }) => {
      if (input.type === "assistido") {
        return db.query.assistidos.findMany({
          where: ilike(assistidos.nome, `%${input.query}%`),
          columns: { id: true, nome: true, atribuicaoPrimaria: true },
          limit: input.limit,
        });
      }
      if (input.type === "processo") {
        return db.query.processos.findMany({
          where: ilike(processos.numeroAutos, `%${input.query}%`),
          columns: { id: true, numeroAutos: true, atribuicao: true },
          limit: input.limit,
        });
      }
      return [];
    }),

  chatHistory: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return db.select()
        .from(chatHistory)
        .where(eq(chatHistory.assistidoId, input.assistidoId))
        .orderBy(desc(chatHistory.createdAt))
        .limit(50);
    }),

  saveMessage: protectedProcedure
    .input(z.object({
      assistidoId: z.number().nullable(),
      role: z.string(),
      content: z.string(),
      skillId: z.string().nullable().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.insert(chatHistory).values({
        assistidoId: input.assistidoId,
        userId: ctx.user.id,
        role: input.role,
        content: input.content,
        skillId: input.skillId,
        metadata: input.metadata,
      });
    }),
});
