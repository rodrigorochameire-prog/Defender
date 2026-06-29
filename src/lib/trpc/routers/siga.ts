// src/lib/trpc/routers/siga.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { ausencias, vidaFuncionalEventos, sigaImportStaging } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { projecaoEventoDeAusencia } from "@/lib/ausencias/projecao";
import { criarAusenciaComEvento } from "@/lib/ausencias/persist";
import { decidir } from "@/lib/siga-import/dedup";
import { mapToAusencia } from "@/lib/siga-import/mapToAusencia";
import { enrichmentClient } from "@/lib/services/enrichment-client";
import type { ExistingAusencia } from "@/lib/siga-import/dedup";

export const sigaRouter = router({
  /**
   * extrair — Chama o enrichment engine para extrair a carreira do SIGA,
   * roda dedup contra ausências existentes e staging as linhas importáveis.
   * Ferias e afastamentos são staged mas marcados importavel=false.
   */
  extrair: protectedProcedure.mutation(async ({ ctx }) => {
    const out = await enrichmentClient.sigaExtrairCarreira();
    if (!out.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: out.error ?? "SIGA: falha ao extrair carreira",
      });
    }

    const sessionId = crypto.randomUUID();

    // Carregar ausências existentes para o dedup
    const scope = getVidaFuncionalScope(ctx.user);
    const existingAusencias = await db
      .select({
        id: ausencias.id,
        nSiga: ausencias.nSiga,
        situacao: ausencias.situacao,
        dataInicio: ausencias.dataInicio,
        dataFim: ausencias.dataFim,
        motivo: ausencias.motivo,
      })
      .from(ausencias)
      .where(and(isNull(ausencias.deletedAt), inArray(ausencias.defensorId, scope)));

    const porNSiga = new Map<string, ExistingAusencia>();
    for (const a of existingAusencias) {
      if (a.nSiga) porNSiga.set(a.nSiga, a as ExistingAusencia);
    }

    type StagingInsert = {
      defensorId: number;
      sessionId: string;
      tipo: string;
      nSiga: string | null;
      numeroSolicitacao: string | null;
      payload: Record<string, unknown>;
      decisao: "nova" | "ja_importada" | "atualizada";
      matchedAusenciaId: number | null;
      importavel: boolean;
      selected: boolean;
    };

    const rows: StagingInsert[] = [];

    // licencas e outras: importavel = true, dedup via decidir
    const licencas = out.licencas ?? [];
    const outras = out.outras ?? [];

    for (const row of licencas) {
      const tipo = "licenca" as const;
      const mapped = mapToAusencia(tipo, row as unknown as Record<string, unknown>);
      const { decisao, matchedAusenciaId } = decidir(
        { nSiga: row.nSiga ?? null, mapped },
        porNSiga,
      );
      rows.push({
        defensorId: ctx.user.id,
        sessionId,
        tipo,
        nSiga: row.nSiga ?? null,
        numeroSolicitacao: row.numeroSolicitacao ?? null,
        payload: row as unknown as Record<string, unknown>,
        decisao,
        matchedAusenciaId,
        importavel: true,
        selected: false,
      });
    }

    for (const row of outras) {
      const tipo = "outra_ausencia" as const;
      const mapped = mapToAusencia(tipo, row as unknown as Record<string, unknown>);
      const { decisao, matchedAusenciaId } = decidir(
        { nSiga: row.nSiga ?? null, mapped },
        porNSiga,
      );
      rows.push({
        defensorId: ctx.user.id,
        sessionId,
        tipo,
        nSiga: row.nSiga ?? null,
        numeroSolicitacao: row.numeroSolicitacao ?? null,
        payload: row as unknown as Record<string, unknown>,
        decisao,
        matchedAusenciaId,
        importavel: true,
        selected: false,
      });
    }

    // ferias e afastamentos: importavel = false, decisao = "nova"
    const ferias = out.ferias ?? [];
    const afastamentos = out.afastamentos ?? [];

    for (const row of ferias) {
      rows.push({
        defensorId: ctx.user.id,
        sessionId,
        tipo: "ferias",
        nSiga: row.nSiga ?? null,
        numeroSolicitacao: row.numeroSolicitacao ?? null,
        payload: row as unknown as Record<string, unknown>,
        decisao: "nova",
        matchedAusenciaId: null,
        importavel: false,
        selected: false,
      });
    }

    for (const row of afastamentos) {
      rows.push({
        defensorId: ctx.user.id,
        sessionId,
        tipo: "afastamento",
        nSiga: row.nSiga ?? null,
        numeroSolicitacao: row.numeroSolicitacao ?? null,
        payload: row as unknown as Record<string, unknown>,
        decisao: "nova",
        matchedAusenciaId: null,
        importavel: false,
        selected: false,
      });
    }

    if (rows.length > 0) {
      await db.insert(sigaImportStaging).values(rows);
    }

    return {
      sessionId,
      counts: {
        licencas: licencas.length,
        outras: outras.length,
        ferias: ferias.length,
        afastamentos: afastamentos.length,
        total: rows.length,
      },
    };
  }),

  /**
   * listStaging — Retorna as linhas staged para a sessão do usuário,
   * ordenadas por tipo + id para agrupamento na UI.
   */
  listStaging: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stagingRows = await db
        .select()
        .from(sigaImportStaging)
        .where(
          and(
            eq(sigaImportStaging.defensorId, ctx.user.id),
            eq(sigaImportStaging.sessionId, input.sessionId),
          ),
        )
        .orderBy(asc(sigaImportStaging.tipo), asc(sigaImportStaging.id));

      return stagingRows;
    }),

  /**
   * confirmar — Importa as linhas selecionadas para `ausencias`:
   *   nova       → criarAusenciaComEvento (+ sigaSyncedAt)
   *   atualizada → update direto (SIGA é autoritativo, bypass de transição) + cascata evento
   *   ja_importada → skip
   */
  confirmar: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        selectedIds: z.array(z.number().int()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allRows = await db
        .select()
        .from(sigaImportStaging)
        .where(
          and(
            eq(sigaImportStaging.defensorId, ctx.user.id),
            eq(sigaImportStaging.sessionId, input.sessionId),
          ),
        );

      const selectedSet = new Set(input.selectedIds);
      const toProcess = allRows.filter(
        (r) => selectedSet.has(r.id) && r.importavel && r.defensorId === ctx.user.id,
      );

      let criadas = 0;
      let atualizadas = 0;
      let puladas = 0;

      await db.transaction(async (tx) => {
        for (const row of toProcess) {
          if (row.decisao === "ja_importada") {
            puladas++;
            continue;
          }

          const mapped = mapToAusencia(
            row.tipo as "licenca" | "outra_ausencia",
            row.payload,
          );

          type AusenciaSituacao = "solicitada" | "deferida" | "gozada" | "indeferida" | "cancelada";
          if (row.decisao === "nova") {
            await criarAusenciaComEvento(tx, ctx.user.id, {
              ...mapped,
              situacao: mapped.situacao as AusenciaSituacao,
              sigaSyncedAt: new Date(),
            });
            criadas++;
          } else if (row.decisao === "atualizada" && row.matchedAusenciaId != null) {
            const [a] = await tx
              .select()
              .from(ausencias)
              .where(
                and(
                  eq(ausencias.id, row.matchedAusenciaId),
                  eq(ausencias.defensorId, ctx.user.id),
                  isNull(ausencias.deletedAt),
                ),
              )
              .limit(1);

            if (!a) {
              // ausência deletada entre a extração e a confirmação → cria nova
              await criarAusenciaComEvento(tx, ctx.user.id, {
                ...mapped,
                situacao: mapped.situacao as AusenciaSituacao,
                sigaSyncedAt: new Date(),
              });
              criadas++;
              continue;
            }

            // Atualização direta — SIGA é autoritativo (bypass de transição de estado)
            await tx
              .update(ausencias)
              .set({
                tipo: mapped.tipo,
                motivo: mapped.motivo,
                dataInicio: mapped.dataInicio,
                dataFim: mapped.dataFim,
                situacao: mapped.situacao as
                  | "solicitada"
                  | "deferida"
                  | "gozada"
                  | "indeferida"
                  | "cancelada",
                interrompida: mapped.interrompida,
                suspensa: mapped.suspensa,
                numeroSolicitacao: mapped.numeroSolicitacao ?? null,
                nSiga: mapped.nSiga ?? null,
                dataPublicacao: mapped.dataPublicacao ?? null,
                observacao: mapped.observacao ?? null,
                situacaoSiga: mapped.situacaoSiga ?? null,
                sigaSyncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(ausencias.id, a.id));

            // Cascata: atualizar o evento de vida funcional vinculado
            if (a.vidaFuncionalEventoId != null) {
              if (mapped.situacao === "indeferida" || mapped.situacao === "cancelada") {
                // Soft-delete: ausência negada/cancelada não gera evento
                await tx
                  .update(vidaFuncionalEventos)
                  .set({ deletedAt: new Date() })
                  .where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
              } else {
                const proj = projecaoEventoDeAusencia({
                  id: a.id,
                  tipo: mapped.tipo,
                  motivo: mapped.motivo,
                  dataInicio: mapped.dataInicio,
                  dataFim: mapped.dataFim,
                  situacao: mapped.situacao,
                });
                await tx
                  .update(vidaFuncionalEventos)
                  .set({
                    tipo: proj.tipo,
                    status: proj.status,
                    dataEvento: proj.dataEvento,
                    dataFim: proj.dataFim,
                    titulo: proj.titulo,
                    updatedAt: new Date(),
                  })
                  .where(eq(vidaFuncionalEventos.id, a.vidaFuncionalEventoId));
              }
            }

            atualizadas++;
          }
        }
      });

      return { criadas, atualizadas, puladas };
    }),
});
