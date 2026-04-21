import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { marcosProcessuais } from "@/lib/db/schema/cronologia";
import { processos } from "@/lib/db/schema/core";
import { eq, and } from "drizzle-orm";

const MARCO_TIPO = z.enum([
  "fato",
  "apf",
  "audiencia-custodia",
  "denuncia",
  "recebimento-denuncia",
  "resposta-acusacao",
  "aij-designada",
  "aij-realizada",
  "memoriais",
  "sentenca",
  "recurso-interposto",
  "acordao-recurso",
  "transito-julgado",
  "execucao-inicio",
  "outro",
]);

async function assertProcessoInWorkspace(processoId: number, workspaceId: number) {
  const [row] = await db
    .select({ id: processos.id })
    .from(processos)
    .where(and(eq(processos.id, processoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Processo não encontrado");
}

async function assertMarcoInWorkspace(marcoId: number, workspaceId: number) {
  const [row] = await db
    .select({ id: marcosProcessuais.id, processoId: marcosProcessuais.processoId })
    .from(marcosProcessuais)
    .innerJoin(processos, eq(processos.id, marcosProcessuais.processoId))
    .where(and(eq(marcosProcessuais.id, marcoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Marco não encontrado");
  return row;
}

export const cronologiaRouter = router({
  listMarcos: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db
        .select()
        .from(marcosProcessuais)
        .where(eq(marcosProcessuais.processoId, input.processoId))
        .orderBy(marcosProcessuais.data);
    }),

  createMarco: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        tipo: MARCO_TIPO,
        data: z.string(),
        documentoReferencia: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db
        .insert(marcosProcessuais)
        .values({
          processoId: input.processoId,
          tipo: input.tipo,
          data: input.data,
          documentoReferencia: input.documentoReferencia ?? null,
          observacoes: input.observacoes ?? null,
          fonte: "manual",
        })
        .returning({ id: marcosProcessuais.id });
      return { id: row.id };
    }),

  updateMarco: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        patch: z.object({
          tipo: MARCO_TIPO.optional(),
          data: z.string().optional(),
          documentoReferencia: z.string().optional().nullable(),
          observacoes: z.string().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertMarcoInWorkspace(input.id, ctx.user.workspaceId ?? 1);
      await db
        .update(marcosProcessuais)
        .set({
          ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
          ...(input.patch.data !== undefined && { data: input.patch.data }),
          ...(input.patch.documentoReferencia !== undefined && {
            documentoReferencia: input.patch.documentoReferencia,
          }),
          ...(input.patch.observacoes !== undefined && {
            observacoes: input.patch.observacoes,
          }),
          updatedAt: new Date(),
        })
        .where(eq(marcosProcessuais.id, input.id));
      return { id: input.id, updated: true };
    }),

  deleteMarco: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertMarcoInWorkspace(input.id, ctx.user.workspaceId ?? 1);
      await db.delete(marcosProcessuais).where(eq(marcosProcessuais.id, input.id));
      return { deleted: true };
    }),
});
