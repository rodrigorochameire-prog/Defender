/**
 * Router tRPC para Extração Inteligente de Documentos
 *
 * Permite extrair dados de múltiplos arquivos (PDF, imagem, áudio, vídeo)
 * e sugerir preenchimento de campos para Assistido, Processo e Caso.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { driveFiles, assistidos, processos, casos } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { pythonBackend, type SmartExtractResponse } from "@/lib/services/python-backend";

// ==========================================
// SCHEMAS
// ==========================================

const fileInfoSchema = z.object({
  driveFileId: z.string().optional(),
  fileName: z.string(),
  mimeType: z.string().optional(),
});

const targetEntitySchema = z.enum(["assistido", "processo", "caso"]);

const extractMultipleInputSchema = z.object({
  fileIds: z.array(z.number()), // IDs da tabela drive_files
  targetEntities: z.array(targetEntitySchema),
  assistidoId: z.number().optional(),
  processoId: z.number().optional(),
  casoId: z.number().optional(),
});

const applySuggestionsInputSchema = z.object({
  assistidoId: z.number().optional(),
  processoId: z.number().optional(),
  casoId: z.number().optional(),
  selectedFields: z.object({
    assistido: z.record(z.unknown()).optional(),
    processo: z.record(z.unknown()).optional(),
    caso: z.record(z.unknown()).optional(),
  }),
});

// ==========================================
// ROUTER
// ==========================================

export const smartExtractRouter = router({
  /**
   * Extrai dados de múltiplos arquivos e retorna sugestões
   */
  extractMultiple: protectedProcedure
    .input(extractMultipleInputSchema)
    .mutation(async ({ input }) => {
      const { fileIds, targetEntities, assistidoId, processoId, casoId } = input;

      // 1. Buscar arquivos no banco
      const files = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
        })
        .from(driveFiles)
        .where(inArray(driveFiles.id, fileIds));

      if (files.length === 0) {
        return {
          success: false,
          error: "Nenhum arquivo encontrado com os IDs fornecidos",
        };
      }

      // 2. Preparar lista de arquivos para o backend Python
      const fileInfos = files.map((f) => ({
        drive_file_id: f.driveFileId,
        file_name: f.name,
        mime_type: f.mimeType,
      }));

      // 3. Chamar backend Python para extração inteligente
      try {
        const result = await pythonBackend.smartExtract(
          fileInfos,
          targetEntities,
          {
            assistidoId,
            processoId,
            casoId,
          }
        );

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro na extração",
        };
      }
    }),

  /**
   * Aplica sugestões selecionadas às entidades
   */
  applySuggestions: protectedProcedure
    .input(applySuggestionsInputSchema)
    .mutation(async ({ input }) => {
      const { assistidoId, processoId, casoId, selectedFields } = input;
      const results: Record<string, boolean> = {};

      // 1. Atualizar Assistido se houver campos selecionados
      if (assistidoId && selectedFields.assistido && Object.keys(selectedFields.assistido).length > 0) {
        try {
          const assistidoUpdate: Record<string, unknown> = {};
          const fields = selectedFields.assistido;

          // Mapear campos
          if (fields.nome_completo) assistidoUpdate.nome = fields.nome_completo;
          if (fields.cpf) assistidoUpdate.cpf = fields.cpf;
          if (fields.rg) assistidoUpdate.rg = fields.rg;
          if (fields.data_nascimento) {
            // Converter string DD/MM/YYYY para Date
            const parts = (fields.data_nascimento as string).split("/");
            if (parts.length === 3) {
              assistidoUpdate.dataNascimento = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
            }
          }
          if (fields.filiacao_mae) assistidoUpdate.nomeMae = fields.filiacao_mae;
          if (fields.filiacao_pai) assistidoUpdate.nomePai = fields.filiacao_pai;
          if (fields.endereco) assistidoUpdate.endereco = fields.endereco;
          if (fields.telefone) assistidoUpdate.telefone = fields.telefone;
          if (fields.naturalidade) assistidoUpdate.naturalidade = fields.naturalidade;
          if (fields.status_prisional) assistidoUpdate.statusPrisional = fields.status_prisional;
          if (fields.local_prisao) assistidoUpdate.localPrisao = fields.local_prisao;
          if (fields.data_prisao) {
            const parts = (fields.data_prisao as string).split("/");
            if (parts.length === 3) {
              assistidoUpdate.dataPrisao = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
            }
          }

          if (Object.keys(assistidoUpdate).length > 0) {
            assistidoUpdate.updatedAt = new Date();
            await db
              .update(assistidos)
              .set(assistidoUpdate)
              .where(eq(assistidos.id, assistidoId));
            results.assistido = true;
          }
        } catch (error) {
          console.error("Erro ao atualizar assistido:", error);
          results.assistido = false;
        }
      }

      // 2. Atualizar Processo se houver campos selecionados
      if (processoId && selectedFields.processo && Object.keys(selectedFields.processo).length > 0) {
        try {
          const processoUpdate: Record<string, unknown> = {};
          const fields = selectedFields.processo;

          if (fields.numero) processoUpdate.numeroAutos = fields.numero;
          if (fields.vara) processoUpdate.vara = fields.vara;
          if (fields.comarca) processoUpdate.comarca = fields.comarca;
          if (fields.fase_processual) processoUpdate.fase = fields.fase_processual;
          // crimes e partes podem ser armazenados em campos JSONB se existirem

          if (Object.keys(processoUpdate).length > 0) {
            processoUpdate.updatedAt = new Date();
            await db
              .update(processos)
              .set(processoUpdate)
              .where(eq(processos.id, processoId));
            results.processo = true;
          }
        } catch (error) {
          console.error("Erro ao atualizar processo:", error);
          results.processo = false;
        }
      }

      // 3. Atualizar Caso se houver campos selecionados
      if (casoId && selectedFields.caso && Object.keys(selectedFields.caso).length > 0) {
        try {
          const casoUpdate: Record<string, unknown> = {};
          const fields = selectedFields.caso;

          if (fields.titulo) casoUpdate.titulo = fields.titulo;
          if (fields.codigo) casoUpdate.codigo = fields.codigo;
          if (fields.narrativa_defesa) casoUpdate.teoriaFatos = fields.narrativa_defesa;
          if (fields.tese_principal) casoUpdate.teoriaDireito = fields.tese_principal;
          if (fields.status) casoUpdate.status = fields.status;
          if (fields.fase) casoUpdate.fase = fields.fase;
          // tags pode incluir pontos_fortes, pontos_fracos, teses_subsidiarias como JSON

          if (Object.keys(casoUpdate).length > 0) {
            casoUpdate.updatedAt = new Date();
            await db
              .update(casos)
              .set(casoUpdate)
              .where(eq(casos.id, casoId));
            results.caso = true;
          }
        } catch (error) {
          console.error("Erro ao atualizar caso:", error);
          results.caso = false;
        }
      }

      return {
        success: Object.values(results).some(Boolean),
        results,
      };
    }),

  /**
   * Busca arquivos disponíveis para extração de uma entidade
   */
  getFilesForEntity: protectedProcedure
    .input(
      z.object({
        entityType: targetEntitySchema,
        entityId: z.number(),
        driveFolderId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { entityType, entityId, driveFolderId } = input;

      // Buscar arquivos vinculados à entidade ou na pasta do Drive
      let query = db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          fileSize: driveFiles.fileSize,
          lastModifiedTime: driveFiles.lastModifiedTime,
          thumbnailLink: driveFiles.thumbnailLink,
          iconLink: driveFiles.iconLink,
        })
        .from(driveFiles);

      // Filtrar por entidade
      if (entityType === "assistido") {
        query = query.where(eq(driveFiles.assistidoId, entityId)) as typeof query;
      } else if (entityType === "processo") {
        query = query.where(eq(driveFiles.processoId, entityId)) as typeof query;
      } else if (driveFolderId) {
        // Para caso, buscar pela pasta do Drive se fornecida
        query = query.where(eq(driveFiles.driveFolderId, driveFolderId)) as typeof query;
      }

      const files = await query;

      // Filtrar apenas arquivos suportados para extração
      const supportedExtensions = [
        ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".odt",
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp",
        ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac",
        ".mp4", ".mkv", ".avi", ".mov", ".webm",
      ];

      const supportedFiles = files.filter((f) => {
        const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
        return supportedExtensions.includes(ext);
      });

      return supportedFiles;
    }),

  /**
   * Verifica status do backend Python
   */
  checkBackendStatus: protectedProcedure.query(async () => {
    try {
      const health = await pythonBackend.health();
      return {
        available: health.status === "healthy",
        details: health,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : "Backend indisponível",
      };
    }
  }),
});

export type SmartExtractRouter = typeof smartExtractRouter;
