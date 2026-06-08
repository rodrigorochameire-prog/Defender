import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { processosVVD, medidasMPU } from "@/lib/db/schema/vvd";
import { parseDecisaoMPU } from "@/lib/mpu/parse-decisao";
import { MEDIDA_MPU, STATUS_MEDIDA } from "@/lib/mpu/medidas-taxonomia";

const MEDIDA_CODIGOS = Object.values(MEDIDA_MPU) as [string, ...string[]];
const STATUS_VALUES = Object.values(STATUS_MEDIDA) as [string, ...string[]];

/** Resolve o id de processo_vvd a partir de um processoId core (via CNJ) ou direto. */
async function resolverProcessoVvdId(input: {
  processoId?: number;
  processoVvdId?: number;
}): Promise<number | null> {
  if (input.processoVvdId) return input.processoVvdId;
  if (!input.processoId) return null;
  const [proc] = await db
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, input.processoId))
    .limit(1);
  if (!proc?.numero) return null;
  const [pvvd] = await db
    .select({ id: processosVVD.id })
    .from(processosVVD)
    .where(eq(processosVVD.numeroAutos, proc.numero))
    .limit(1);
  return pvvd?.id ?? null;
}

export const mpuRouter = router({
  // Dry-run: extrai as medidas do texto SEM persistir. Usado no preview do editor.
  previewMedidas: protectedProcedure
    .input(z.object({ texto: z.string().min(1).max(20000) }))
    .query(({ input }) => parseDecisaoMPU(input.texto)),

  // Lista as medidas estruturadas de um processo (por processoId core ou processoVvdId).
  listMedidas: protectedProcedure
    .input(
      z.object({
        processoId: z.number().optional(),
        processoVvdId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const processoVvdId = await resolverProcessoVvdId(input);
      if (!processoVvdId) {
        return { processoVvdId: null, numeroAutos: null, mpu: null, medidas: [] };
      }
      const [pvvd] = await db
        .select({
          numeroAutos: processosVVD.numeroAutos,
          mpuAtiva: processosVVD.mpuAtiva,
          dataDecisaoMPU: processosVVD.dataDecisaoMPU,
          dataVencimentoMPU: processosVVD.dataVencimentoMPU,
          distanciaMinima: processosVVD.distanciaMinima,
        })
        .from(processosVVD)
        .where(eq(processosVVD.id, processoVvdId))
        .limit(1);
      const medidas = await db
        .select()
        .from(medidasMPU)
        .where(eq(medidasMPU.processoVvdId, processoVvdId))
        .orderBy(asc(medidasMPU.id));
      return {
        processoVvdId,
        numeroAutos: pvvd?.numeroAutos ?? null,
        mpu: pvvd
          ? {
              ativa: pvvd.mpuAtiva,
              dataDecisao: pvvd.dataDecisaoMPU,
              dataVencimento: pvvd.dataVencimentoMPU,
              distanciaMinima: pvvd.distanciaMinima,
            }
          : null,
        medidas,
      };
    }),

  // Muda o status de uma medida; marca origem='manual' (blinda da reimportação).
  setStatusMedida: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(STATUS_VALUES) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(medidasMPU)
        .set({ status: input.status, origem: "manual", updatedAt: new Date() })
        .where(eq(medidasMPU.id, input.id))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Medida não encontrada." });
      }
      return row;
    }),

  // Adiciona uma medida manualmente (origem='manual').
  addMedidaManual: protectedProcedure
    .input(
      z.object({
        processoVvdId: z.number(),
        codigo: z.enum(MEDIDA_CODIGOS),
        artigo: z.string().max(20).optional(),
        distanciaMetros: z.number().int().positive().optional(),
        parametros: z
          .object({
            protegidos: z.array(z.string()).optional(),
            meios: z.array(z.string()).optional(),
            lugares: z.array(z.string()).optional(),
            valor: z.string().optional(),
          })
          .optional(),
        dataDecisao: z.string().optional(),
        dataVencimento: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [pvvd] = await db
        .select({ id: processosVVD.id })
        .from(processosVVD)
        .where(eq(processosVVD.id, input.processoVvdId))
        .limit(1);
      if (!pvvd) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo VVD não encontrado.",
        });
      }
      const [row] = await db
        .insert(medidasMPU)
        .values({
          processoVvdId: input.processoVvdId,
          codigo: input.codigo,
          artigo: input.artigo ?? null,
          distanciaMetros: input.distanciaMetros ?? null,
          parametros: input.parametros ?? null,
          literal: null,
          dataDecisao: input.dataDecisao ?? null,
          dataVencimento: input.dataVencimento ?? null,
          status: "ativa",
          origem: "manual",
        })
        .returning();
      return row;
    }),
});
