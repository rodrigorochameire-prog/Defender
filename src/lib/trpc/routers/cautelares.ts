import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { cautelaresDecisao } from "@/lib/db/schema/cautelares";
import { parseDecisaoCautelar } from "@/lib/cautelares/parse-decisao-cautelar";
import { CAUTELAR, STATUS_CAUTELAR } from "@/lib/cautelares/cautelares-taxonomia";

const CODIGOS = Object.values(CAUTELAR) as [string, ...string[]];
const STATUS_VALUES = Object.values(STATUS_CAUTELAR) as [string, ...string[]];

export const cautelaresRouter = router({
  /** Preview do parser sobre um texto de decisão (sem persistir). */
  parse: protectedProcedure
    .input(z.object({ texto: z.string() }))
    .query(({ input }) => parseDecisaoCautelar(input.texto)),

  /** Lista as cautelares estruturadas de um processo. */
  listCautelares: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(cautelaresDecisao)
        .where(eq(cautelaresDecisao.processoId, input.processoId))
        .orderBy(asc(cautelaresDecisao.id));
      return { processoId: input.processoId, cautelares: rows };
    }),

  /** Muda o status de uma cautelar; marca origem='manual' (blinda da reimportação). */
  setStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(STATUS_VALUES) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(cautelaresDecisao)
        .set({ status: input.status, origem: "manual", updatedAt: new Date() })
        .where(eq(cautelaresDecisao.id, input.id))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cautelar não encontrada." });
      }
      return row;
    }),

  /** Adiciona manualmente uma cautelar (origem='manual'). */
  addManual: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        codigo: z.enum(CODIGOS),
        especie: z.enum(["prisao", "diversa"]),
        artigo: z.string().optional(),
        literal: z.string().optional(),
        dataDecisao: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(cautelaresDecisao)
        .values({
          processoId: input.processoId,
          codigo: input.codigo,
          especie: input.especie,
          artigo: input.artigo ?? null,
          literal: input.literal ?? null,
          dataDecisao: input.dataDecisao ?? null,
          status: STATUS_CAUTELAR.ATIVA,
          origem: "manual",
        })
        .returning();
      return row;
    }),
});
