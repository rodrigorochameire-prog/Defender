import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { marcosProcessuais, prisoes, cautelares } from "@/lib/db/schema/cronologia";
import { processos } from "@/lib/db/schema/core";
import { eq, and, desc } from "drizzle-orm";

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

  listPrisoes: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db.select().from(prisoes)
        .where(eq(prisoes.processoId, input.processoId))
        .orderBy(desc(prisoes.dataInicio));
    }),

  createPrisao: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]),
      dataInicio: z.string(),
      dataFim: z.string().nullable().optional(),
      motivo: z.string().nullable().optional(),
      unidade: z.string().nullable().optional(),
      situacao: z.enum(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]).default("ativa"),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db.insert(prisoes).values({
        processoId: input.processoId,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        motivo: input.motivo ?? null,
        unidade: input.unidade ?? null,
        situacao: input.situacao,
        fonte: "manual",
      }).returning({ id: prisoes.id });
      return { id: row.id };
    }),

  updatePrisao: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        tipo: z.enum(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().nullable().optional(),
        motivo: z.string().nullable().optional(),
        unidade: z.string().nullable().optional(),
        situacao: z.enum(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]).optional(),
        pessoaId: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: prisoes.id })
        .from(prisoes)
        .innerJoin(processos, eq(processos.id, prisoes.processoId))
        .where(and(eq(prisoes.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Prisão não encontrada");
      await db.update(prisoes).set({
        ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
        ...(input.patch.dataInicio !== undefined && { dataInicio: input.patch.dataInicio }),
        ...(input.patch.dataFim !== undefined && { dataFim: input.patch.dataFim }),
        ...(input.patch.motivo !== undefined && { motivo: input.patch.motivo }),
        ...(input.patch.unidade !== undefined && { unidade: input.patch.unidade }),
        ...(input.patch.situacao !== undefined && { situacao: input.patch.situacao }),
        ...(input.patch.pessoaId !== undefined && { pessoaId: input.patch.pessoaId }),
        updatedAt: new Date(),
      }).where(eq(prisoes.id, input.id));
      return { id: input.id, updated: true };
    }),

  deletePrisao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: prisoes.id })
        .from(prisoes)
        .innerJoin(processos, eq(processos.id, prisoes.processoId))
        .where(and(eq(prisoes.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Prisão não encontrada");
      await db.delete(prisoes).where(eq(prisoes.id, input.id));
      return { deleted: true };
    }),

  listCautelares: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      return await db.select().from(cautelares)
        .where(eq(cautelares.processoId, input.processoId))
        .orderBy(desc(cautelares.dataInicio));
    }),

  createCautelar: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum([
        "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
        "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
        "suspensao-porte-arma","suspensao-habilitacao","outro",
      ]),
      dataInicio: z.string(),
      dataFim: z.string().nullable().optional(),
      detalhes: z.string().nullable().optional(),
      status: z.enum(["ativa","cumprida","descumprida","revogada","extinta"]).default("ativa"),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoInWorkspace(input.processoId, ctx.user.workspaceId ?? 1);
      const [row] = await db.insert(cautelares).values({
        processoId: input.processoId,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        detalhes: input.detalhes ?? null,
        status: input.status,
        fonte: "manual",
      }).returning({ id: cautelares.id });
      return { id: row.id };
    }),

  updateCautelar: protectedProcedure
    .input(z.object({
      id: z.number(),
      patch: z.object({
        tipo: z.enum([
          "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
          "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
          "suspensao-porte-arma","suspensao-habilitacao","outro",
        ]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().nullable().optional(),
        detalhes: z.string().nullable().optional(),
        status: z.enum(["ativa","cumprida","descumprida","revogada","extinta"]).optional(),
        pessoaId: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: cautelares.id })
        .from(cautelares)
        .innerJoin(processos, eq(processos.id, cautelares.processoId))
        .where(and(eq(cautelares.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Cautelar não encontrada");
      await db.update(cautelares).set({
        ...(input.patch.tipo !== undefined && { tipo: input.patch.tipo }),
        ...(input.patch.dataInicio !== undefined && { dataInicio: input.patch.dataInicio }),
        ...(input.patch.dataFim !== undefined && { dataFim: input.patch.dataFim }),
        ...(input.patch.detalhes !== undefined && { detalhes: input.patch.detalhes }),
        ...(input.patch.status !== undefined && { status: input.patch.status }),
        ...(input.patch.pessoaId !== undefined && { pessoaId: input.patch.pessoaId }),
        updatedAt: new Date(),
      }).where(eq(cautelares.id, input.id));
      return { id: input.id, updated: true };
    }),

  deleteCautelar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const [row] = await db.select({ id: cautelares.id })
        .from(cautelares)
        .innerJoin(processos, eq(processos.id, cautelares.processoId))
        .where(and(eq(cautelares.id, input.id), eq(processos.workspaceId, workspaceId)))
        .limit(1);
      if (!row) throw new Error("Cautelar não encontrada");
      await db.delete(cautelares).where(eq(cautelares.id, input.id));
      return { deleted: true };
    }),
});
