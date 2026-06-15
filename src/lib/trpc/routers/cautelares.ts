import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { cautelaresDecisao, prisaoPreventiva } from "@/lib/db/schema/cautelares";
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

  /** Camada rica da prisão preventiva do processo (requisitos/fundamentos/custódia/saúde/visitas). */
  getPreventiva: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(prisaoPreventiva)
        .where(eq(prisaoPreventiva.processoId, input.processoId))
        .orderBy(asc(prisaoPreventiva.id))
        .limit(1);
      return row ?? null;
    }),

  /** Edição manual dos campos de monitoramento da preventiva (custódia/saúde/visitas/etc.). */
  updatePreventiva: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        localCustodia: z.string().nullish(),
        historicoCustodia: z.any().optional(),
        saude: z.any().optional(),
        seguranca: z.any().optional(),
        visitas: z.any().optional(),
        excessoPrazo: z.any().optional(),
        situacao: z.enum(["preso", "domiciliar", "solto"]).optional(),
        dataSoltura: z.string().nullish(),
        status: z.enum(["ativa", "revogada", "substituida"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const set: Record<string, unknown> = { origem: "manual", updatedAt: new Date() };
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) set[k] = v;
      const [row] = await db
        .update(prisaoPreventiva)
        .set(set)
        .where(eq(prisaoPreventiva.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Preventiva não encontrada." });
      return row;
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
