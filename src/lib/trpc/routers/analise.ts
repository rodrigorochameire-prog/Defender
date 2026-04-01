/**
 * Router de Analise (Claude Code Tasks + Casos)
 *
 * Gerencia criacao de tasks para analise via Claude Code,
 * consulta de status, e leitura de dados de analise de casos/processos.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks, casos } from "@/lib/db/schema/casos";
import { processos, assistidos } from "@/lib/db/schema/core";
import { eq, and, or, isNull, inArray } from "drizzle-orm";

// ==========================================
// ANALISE ROUTER
// ==========================================

export const analiseRouter = router({
  // ==========================================
  // MUTATIONS
  // ==========================================

  /**
   * criarTask — Cria uma entrada em claude_code_tasks
   * Verifica duplicatas pendentes antes de inserir.
   */
  criarTask: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        processoId: z.number().optional(),
        casoId: z.number().optional(),
        skill: z.string(),
        instrucaoAdicional: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assistidoId, processoId, casoId, skill, instrucaoAdicional } = input;

      // Check for existing pending/processing task
      const existingConditions = [
        inArray(claudeCodeTasks.status, ["pending", "processing"]),
      ];

      if (casoId) {
        existingConditions.push(eq(claudeCodeTasks.casoId, casoId));
      } else {
        existingConditions.push(eq(claudeCodeTasks.assistidoId, assistidoId));
        existingConditions.push(isNull(claudeCodeTasks.casoId));
      }

      const [existing] = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(and(...existingConditions))
        .limit(1);

      if (existing) {
        return {
          success: true,
          taskId: existing.id,
          message: "Analise ja em andamento",
          existing: true,
        };
      }

      // Build prompt from assistido + processo data
      const [assistido] = await db
        .select({
          nome: assistidos.nome,
        })
        .from(assistidos)
        .where(eq(assistidos.id, assistidoId))
        .limit(1);

      if (!assistido) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistido nao encontrado",
        });
      }

      let promptParts: string[] = [`Assistido: ${assistido.nome}`];

      if (processoId) {
        const [processo] = await db
          .select({
            numeroAutos: processos.numeroAutos,
            classeProcessual: processos.classeProcessual,
            vara: processos.vara,
            comarca: processos.comarca,
            atribuicao: processos.atribuicao,
          })
          .from(processos)
          .where(eq(processos.id, processoId))
          .limit(1);

        if (processo) {
          promptParts.push(`Processo: ${processo.numeroAutos}`);
          if (processo.classeProcessual) promptParts.push(`Classe: ${processo.classeProcessual}`);
          if (processo.vara) promptParts.push(`Vara: ${processo.vara}`);
          if (processo.comarca) promptParts.push(`Comarca: ${processo.comarca}`);
          if (processo.atribuicao) promptParts.push(`Atribuicao: ${processo.atribuicao}`);
        }
      }

      const prompt = promptParts.join("\n");

      const [newTask] = await db
        .insert(claudeCodeTasks)
        .values({
          assistidoId,
          processoId: processoId ?? null,
          casoId: casoId ?? null,
          skill,
          prompt,
          instrucaoAdicional: instrucaoAdicional ?? null,
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return {
        success: true,
        taskId: newTask.id,
        message: "Analise disparada",
      };
    }),

  /**
   * cancelarTask — Cancela uma task pendente
   */
  cancelarTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .update(claudeCodeTasks)
        .set({
          status: "failed",
          erro: "Cancelado pelo usuario",
        })
        .where(
          and(
            eq(claudeCodeTasks.id, input.taskId),
            eq(claudeCodeTasks.status, "pending")
          )
        )
        .returning({ id: claudeCodeTasks.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task nao encontrada ou nao esta pendente",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // QUERIES
  // ==========================================

  /**
   * getTaskStatus — Retorna o status atual de uma task
   */
  getTaskStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({
          id: claudeCodeTasks.id,
          status: claudeCodeTasks.status,
          etapa: claudeCodeTasks.etapa,
          resultado: claudeCodeTasks.resultado,
          erro: claudeCodeTasks.erro,
          completedAt: claudeCodeTasks.completedAt,
        })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task nao encontrada",
        });
      }

      return task;
    }),

  /**
   * getCasosDoAssistido — Lista casos com seus processos
   * Inclui processos orfaos (sem casoId) como grupo "Sem caso"
   */
  getCasosDoAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const { assistidoId } = input;

      // Fetch all cases for the assistido
      const casosDoAssistido = await db
        .select()
        .from(casos)
        .where(
          and(
            eq(casos.assistidoId, assistidoId),
            isNull(casos.deletedAt)
          )
        );

      // For each case, fetch linked processos
      const result = await Promise.all(
        casosDoAssistido.map(async (caso) => {
          const processosVinculados = await db
            .select()
            .from(processos)
            .where(
              and(
                eq(processos.assistidoId, assistidoId),
                eq(processos.casoId, caso.id),
                isNull(processos.deletedAt)
              )
            );

          // Find latest completed analysis task for this case
          const [ultimaAnalise] = await db
            .select({
              analyzedAt: claudeCodeTasks.completedAt,
              skill: claudeCodeTasks.skill,
            })
            .from(claudeCodeTasks)
            .where(
              and(
                eq(claudeCodeTasks.casoId, caso.id),
                eq(claudeCodeTasks.status, "completed")
              )
            )
            .orderBy(claudeCodeTasks.completedAt)
            .limit(1);

          return {
            caso,
            processos: processosVinculados,
            ultimaAnalise: ultimaAnalise
              ? {
                  analyzedAt: ultimaAnalise.analyzedAt,
                  skill: ultimaAnalise.skill,
                }
              : undefined,
          };
        })
      );

      // Fetch orphan processos (no casoId)
      const processosOrfaos = await db
        .select()
        .from(processos)
        .where(
          and(
            eq(processos.assistidoId, assistidoId),
            isNull(processos.casoId),
            isNull(processos.deletedAt)
          )
        );

      return {
        casos: result,
        processosOrfaos,
      };
    }),

  /**
   * getAnaliseDoCaso — Retorna os dados de analise (JSONB) de um caso
   */
  getAnaliseDoCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      const [caso] = await db
        .select({
          analysisData: casos.analysisData,
          analysisStatus: casos.analysisStatus,
          analyzedAt: casos.analyzedAt,
          analysisVersion: casos.analysisVersion,
        })
        .from(casos)
        .where(eq(casos.id, input.casoId))
        .limit(1);

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso nao encontrado",
        });
      }

      return caso;
    }),

  /**
   * getAnaliseDoProcesso — Retorna dados de analise de um processo orfao (sem caso)
   */
  getAnaliseDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [processo] = await db
        .select({
          analysisData: processos.analysisData,
          analysisStatus: processos.analysisStatus,
          analyzedAt: processos.analyzedAt,
          analysisVersion: processos.analysisVersion,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo nao encontrado",
        });
      }

      return processo;
    }),
});
