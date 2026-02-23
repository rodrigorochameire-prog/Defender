/**
 * Router tRPC para integração Solar (DPEBA)
 *
 * Permite sincronizar processos do Sistema Solar da Defensoria Pública
 * com o OMBUDS: consulta movimentações, extrai dados, baixa PDFs
 * e envia ao Google Drive.
 *
 * Endpoints:
 * - solar.status: Status da conexão Solar
 * - solar.syncProcesso: Sincroniza um processo
 * - solar.syncBatch: Sincroniza múltiplos processos
 * - solar.avisos: Lista avisos pendentes (PJe/SEEU)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos, documentos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  enrichmentClient,
  type SolarSyncOutput,
  type SolarNomeSyncOutput,
  type SolarCadastrarOutput,
  type SigadExportarOutput,
  type SigadBuscarOutput,
} from "@/lib/services/enrichment-client";
import { uploadFileBuffer } from "@/lib/services/google-drive";

// ==========================================
// SOLAR ROUTER
// ==========================================

export const solarRouter = router({
  /**
   * Status da integração Solar.
   * Checa configuração, autenticação, seletores.
   */
  status: protectedProcedure.query(async () => {
    try {
      const status = await enrichmentClient.solarStatus();
      return {
        available: true,
        ...status,
      };
    } catch (error) {
      return {
        available: false,
        configured: false,
        authenticated: false,
        session_age_seconds: null,
        solar_reachable: false,
        selectors_mapped: false,
        unmapped_selectors: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Sincroniza um processo do Solar.
   * 1. Busca numeroAutos no DB
   * 2. Chama Enrichment Engine /solar/sync-processo
   * 3. Upload PDFs retornados ao Google Drive
   * 4. Cria registros documentos no DB
   */
  syncProcesso: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        downloadPdfs: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar processo no DB
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
        columns: {
          id: true,
          numeroAutos: true,
          assistidoId: true,
          casoId: true,
          driveFolderId: true,
        },
      });

      if (!processo) {
        throw new Error(`Processo ${input.processoId} não encontrado`);
      }

      if (!processo.numeroAutos) {
        throw new Error("Processo sem número de autos cadastrado");
      }

      // 2. Chamar Enrichment Engine
      const result: SolarSyncOutput = await enrichmentClient.solarSyncProcesso({
        numeroProcesso: processo.numeroAutos,
        processoId: processo.id,
        assistidoId: processo.assistidoId,
        casoId: processo.casoId,
        downloadPdfs: input.downloadPdfs,
      });

      // 3. Upload PDFs ao Drive (se retornados e pasta existe)
      const uploadedDocs: { filename: string; driveFileId?: string }[] = [];

      if (result.pdfs && result.pdfs.length > 0 && processo.driveFolderId) {
        for (const pdf of result.pdfs) {
          try {
            const buffer = Buffer.from(pdf.content_base64, "base64");
            const driveResult = await uploadFileBuffer(
              buffer,
              pdf.filename,
              pdf.mime_type,
              processo.driveFolderId,
            );
            uploadedDocs.push({
              filename: pdf.filename,
              driveFileId: driveResult?.id,
            });
          } catch (error) {
            console.error(`Failed to upload PDF ${pdf.filename} to Drive:`, error);
            uploadedDocs.push({ filename: pdf.filename });
          }
        }
      }

      return {
        ...result,
        uploaded_to_drive: uploadedDocs,
        pdfs: undefined, // Remove base64 data from response (já foi uploaded)
      };
    }),

  /**
   * Sincroniza múltiplos processos do Solar.
   */
  syncBatch: protectedProcedure
    .input(
      z.object({
        processoIds: z.array(z.number()).max(20),
        downloadPdfs: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar todos os processos
      const processosDb = await Promise.all(
        input.processoIds.map((id) =>
          db.query.processos.findFirst({
            where: eq(processos.id, id),
            columns: {
              id: true,
              numeroAutos: true,
              assistidoId: true,
              casoId: true,
              driveFolderId: true,
            },
          }),
        ),
      );

      // Filtrar processos válidos
      const validProcessos = processosDb.filter(
        (p): p is NonNullable<typeof p> => p !== undefined && p !== null && !!p.numeroAutos,
      );

      if (validProcessos.length === 0) {
        throw new Error("Nenhum processo válido encontrado");
      }

      // Chamar Enrichment Engine batch
      const result = await enrichmentClient.solarSyncBatch({
        processos: validProcessos.map((p) => ({
          numeroProcesso: p.numeroAutos!,
          processoId: p.id,
          assistidoId: p.assistidoId,
          casoId: p.casoId,
          downloadPdfs: input.downloadPdfs,
        })),
      });

      // Upload PDFs de cada resultado ao Drive
      for (const syncResult of result.results) {
        if (!syncResult.pdfs || syncResult.pdfs.length === 0) continue;

        const proc = validProcessos.find(
          (p) => p.numeroAutos === syncResult.numero_processo,
        );
        if (!proc?.driveFolderId) continue;

        for (const pdf of syncResult.pdfs) {
          try {
            const buffer = Buffer.from(pdf.content_base64, "base64");
            await uploadFileBuffer(
              buffer,
              pdf.filename,
              pdf.mime_type,
              proc.driveFolderId,
            );
          } catch (error) {
            console.error(`Failed to upload ${pdf.filename}:`, error);
          }
        }
      }

      return {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        results: result.results.map((r) => ({
          ...r,
          pdfs: undefined, // Remove base64 from response
        })),
      };
    }),

  /**
   * Lista avisos pendentes do Solar (intimações PJe/SEEU).
   */
  avisos: protectedProcedure.query(async () => {
    try {
      return await enrichmentClient.solarAvisos();
    } catch (error) {
      return {
        avisos: [],
        total: 0,
        error: error instanceof Error ? error.message : "Failed to fetch avisos",
      };
    }
  }),

  /**
   * Busca todos os processos de um defensor pelo nome no Solar.
   * Útil para: "rodrigo rocha meire", "juliane andrade pereira"
   */
  syncPorNome: protectedProcedure
    .input(z.object({ nome: z.string().min(3) }))
    .mutation(async ({ input }): Promise<SolarNomeSyncOutput> => {
      return enrichmentClient.solarSyncPorNome({ nome: input.nome });
    }),

  /**
   * Cadastra um processo no Solar se ainda não existir.
   * Busca pelo número → se não encontrado → clica 'Novo Processo Judicial'.
   */
  cadastrarNoSolar: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        grau: z.number().default(1),
      }),
    )
    .mutation(async ({ input }): Promise<SolarCadastrarOutput> => {
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
        columns: { id: true, numeroAutos: true },
      });

      if (!processo) {
        throw new Error(`Processo ${input.processoId} não encontrado`);
      }
      if (!processo.numeroAutos) {
        throw new Error("Processo sem número de autos cadastrado");
      }

      return enrichmentClient.solarCadastrarProcesso({
        numeroProcesso: processo.numeroAutos,
        grau: input.grau,
      });
    }),

  /**
   * Exporta assistido do SIGAD para o Solar.
   * Fluxo: busca assistido por CPF no SIGAD → clica EXPORTAR PARA O SOLAR.
   * Requer: assistido com CPF cadastrado no OMBUDS e no SIGAD.
   */
  exportarViaSigad: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
      }),
    )
    .mutation(async ({ input }): Promise<SigadExportarOutput> => {
      const { assistidos } = await import("@/lib/db/schema");

      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: { id: true, nome: true, cpf: true },
      });

      if (!assistido) {
        throw new Error(`Assistido ${input.assistidoId} não encontrado`);
      }
      if (!assistido.cpf) {
        throw new Error(
          `Assistido ${assistido.nome} não tem CPF cadastrado no OMBUDS`,
        );
      }

      return enrichmentClient.sigadExportarAssistido({
        cpf: assistido.cpf,
        ombudsAssistidoId: assistido.id,
      });
    }),

  /**
   * Verifica se assistido existe no SIGAD pelo CPF (sem exportar).
   */
  buscarNoSigad: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }): Promise<SigadBuscarOutput> => {
      const { assistidos } = await import("@/lib/db/schema");

      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: { id: true, nome: true, cpf: true },
      });

      if (!assistido?.cpf) {
        return {
          success: false,
          encontrado: false,
          error: "Assistido sem CPF no OMBUDS",
        };
      }

      return enrichmentClient.sigadBuscarAssistido({ cpf: assistido.cpf });
    }),
});
