import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db";
import { eq, and, desc, sql, isNull, or, like } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  listFilesInFolder,
  listAllFilesRecursively,
  syncFolderWithDatabase,
  registerSyncFolder,
  getSyncFolders,
  getSyncedFiles,
  getSyncLogs,
  uploadFileBuffer,
  deleteFileFromDrive,
  renameFileInDrive,
  createFolder,
  getFileInfo,
  isGoogleDriveConfigured,
  getRootFolderLink,
  findExistingFile,
  syncPautaDocument,
  syncMultiplePautaDocuments,
  registrarAudienciaNoDrive,
  verificarIntegridadeSincronizacao,
  criarPastaProcesso,
  // Novas funções de vinculação automática
  syncFolderWithAutoLink,
  autoLinkMultipleFiles,
  autoLinkFileToProcesso,
  linkFileToProcesso,
  linkFileToAssistido,
  unlinkFile,
  detectProcessoByFolderName,
} from "@/lib/services/google-drive";
import { processos, assistidos, casos } from "@/lib/db/schema";

export const driveRouter = router({
  /**
   * Verifica se o Google Drive está configurado
   */
  isConfigured: protectedProcedure.query(async () => {
    return {
      configured: isGoogleDriveConfigured(),
    };
  }),

  /**
   * Obtém link da pasta raiz
   */
  getRootLink: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const link = await getRootFolderLink();
      return { link };
    }, "Erro ao obter link da pasta raiz");
  }),

  /**
   * Lista pastas configuradas para sincronização
   */
  syncFolders: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const folders = await getSyncFolders();
      return folders;
    }, "Erro ao listar pastas de sincronização");
  }),

  /**
   * Registra uma nova pasta para sincronização
   */
  registerFolder: adminProcedure
    .input(
      z.object({
        folderId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        syncDirection: z.enum(["bidirectional", "drive_to_app", "app_to_drive"]).default("bidirectional"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const result = await registerSyncFolder(
          input.folderId,
          input.name,
          input.description,
          input.syncDirection,
          ctx.user.id
        );

        if (!result.success) {
          throw Errors.validation(result.error || "Falha ao registrar pasta para sincronização");
        }

        return { success: true, folderName: result.folderName };
      }, "Erro ao registrar pasta para sincronização");
    }),

  /**
   * Remove uma pasta da sincronização
   */
  removeFolder: adminProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db
          .update(driveSyncFolders)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(driveSyncFolders.driveFolderId, input.folderId));

        return { success: true };
      }, "Erro ao remover pasta da sincronização");
    }),

  /**
   * Força sincronização de uma pasta
   */
  syncFolder: protectedProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const result = await syncFolderWithDatabase(input.folderId, ctx.user.id);
        return result;
      }, "Erro ao sincronizar pasta");
    }),

  /**
   * Sincroniza todas as pastas configuradas
   */
  syncAll: adminProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const folders = await getSyncFolders();
      const results = [];

      for (const folder of folders) {
        const result = await syncFolderWithDatabase(folder.driveFolderId, ctx.user.id);
        results.push({
          folderId: folder.driveFolderId,
          folderName: folder.name,
          ...result,
        });
      }

      return results;
    }, "Erro ao sincronizar todas as pastas");
  }),

  /**
   * Lista arquivos sincronizados de uma pasta
   */
  files: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        parentFileId: z.number().nullable().optional(),
        search: z.string().optional(),
        mimeType: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(driveFiles.driveFolderId, input.folderId)];

        if (input.parentFileId !== undefined) {
          if (input.parentFileId === null) {
            conditions.push(isNull(driveFiles.parentFileId));
          } else {
            conditions.push(eq(driveFiles.parentFileId, input.parentFileId));
          }
        }

        if (input.search) {
          conditions.push(like(driveFiles.name, `%${input.search}%`));
        }

        if (input.mimeType) {
          conditions.push(eq(driveFiles.mimeType, input.mimeType));
        }

        const files = await db
          .select()
          .from(driveFiles)
          .where(and(...conditions))
          .orderBy(desc(driveFiles.isFolder), driveFiles.name)
          .limit(input.limit)
          .offset(input.offset);

        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(and(...conditions));

        return {
          files,
          total: countResult?.count || 0,
        };
      }, "Erro ao listar arquivos");
    }),

  /**
   * Lista arquivos diretamente do Drive (não do cache)
   */
  filesFromDrive: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        pageToken: z.string().optional(),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await listFilesInFolder(input.folderId, input.pageToken, input.pageSize);
        
        if (!result) {
          throw Errors.internal("Falha ao listar arquivos do Drive");
        }

        return result;
      }, "Erro ao listar arquivos do Drive");
    }),

  /**
   * Obtém informações de um arquivo
   */
  fileInfo: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        // Primeiro tenta do banco local
        const [localFile] = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.driveFileId, input.fileId));

        if (localFile) {
          return localFile;
        }

        // Se não encontrar, busca do Drive
        const driveFileInfo = await getFileInfo(input.fileId);
        return driveFileInfo;
      }, "Erro ao obter informações do arquivo");
    }),

  /**
   * Cria uma nova pasta no Drive
   */
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        parentFolderId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const folder = await createFolder(input.name, input.parentFolderId);
        
        if (!folder) {
          throw Errors.internal("Falha ao criar pasta no Drive");
        }

        return folder;
      }, "Erro ao criar pasta");
    }),

  /**
   * Upload de arquivo para o Drive
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileBase64: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Converter base64 para buffer
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const file = await uploadFileBuffer(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId,
          input.description
        );

        if (!file) {
          throw Errors.internal("Falha ao fazer upload do arquivo");
        }

        // Inserir no banco local para sincronização
        await db.insert(driveFiles).values({
          driveFileId: file.id,
          driveFolderId: input.folderId,
          name: file.name,
          mimeType: file.mimeType,
          fileSize: file.size ? parseInt(file.size) : null,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          thumbnailLink: file.thumbnailLink,
          iconLink: file.iconLink,
          driveChecksum: file.md5Checksum,
          isFolder: false,
          syncStatus: "synced",
          lastSyncAt: new Date(),
          lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
          createdById: ctx.user.id,
        });

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: file.id,
          action: "upload",
          status: "success",
          details: `Arquivo ${file.name} enviado`,
          userId: ctx.user.id,
        });

        return file;
      }, "Erro ao fazer upload do arquivo");
    }),

  /**
   * Renomeia um arquivo no Drive
   */
  renameFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        newName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const result = await renameFileInDrive(input.fileId, input.newName);

        if (!result) {
          throw Errors.internal("Falha ao renomear arquivo");
        }

        // Atualizar no banco local
        await db
          .update(driveFiles)
          .set({
            name: input.newName,
            updatedAt: new Date(),
            lastSyncAt: new Date(),
          })
          .where(eq(driveFiles.driveFileId, input.fileId));

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: input.fileId,
          action: "rename",
          status: "success",
          details: `Renomeado para ${input.newName}`,
          userId: ctx.user.id,
        });

        return result;
      }, "Erro ao renomear arquivo");
    }),

  /**
   * Exclui um arquivo do Drive
   */
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const success = await deleteFileFromDrive(input.fileId);

        if (!success) {
          throw Errors.internal("Falha ao excluir arquivo");
        }

        // Remover do banco local
        await db
          .delete(driveFiles)
          .where(eq(driveFiles.driveFileId, input.fileId));

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: input.fileId,
          action: "delete",
          status: "success",
          details: "Arquivo excluído",
          userId: ctx.user.id,
        });

        return { success: true };
      }, "Erro ao excluir arquivo");
    }),

  /**
   * Obtém logs de sincronização
   */
  syncLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        action: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [];

        if (input?.action) {
          conditions.push(eq(driveSyncLogs.action, input.action));
        }

        const logs = await db
          .select()
          .from(driveSyncLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(driveSyncLogs.createdAt))
          .limit(input?.limit || 50);

        return logs;
      }, "Erro ao obter logs de sincronização");
    }),

  /**
   * Estatísticas do Drive
   */
  stats: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const [totalFiles] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(eq(driveFiles.isFolder, false));

      const [totalFolders] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(eq(driveFiles.isFolder, true));

      const [syncedFolders] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveSyncFolders)
        .where(eq(driveSyncFolders.isActive, true));

      const [pendingSync] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(
          or(
            eq(driveFiles.syncStatus, "pending_upload"),
            eq(driveFiles.syncStatus, "pending_download")
          )
        );

      const [lastSync] = await db
        .select({ lastSyncAt: driveSyncFolders.lastSyncAt })
        .from(driveSyncFolders)
        .where(eq(driveSyncFolders.isActive, true))
        .orderBy(desc(driveSyncFolders.lastSyncAt))
        .limit(1);

      return {
        totalFiles: totalFiles?.count || 0,
        totalFolders: totalFolders?.count || 0,
        syncedFolders: syncedFolders?.count || 0,
        pendingSync: pendingSync?.count || 0,
        lastSyncAt: lastSync?.lastSyncAt || null,
      };
    }, "Erro ao obter estatísticas");
  }),

  // ============================================
  // SINCRONIZAÇÃO COM PAUTA E INTIMAÇÕES
  // ============================================

  /**
   * Verifica se um arquivo já existe no Drive (para evitar duplicação)
   */
  checkDuplicate: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      folderId: z.string(),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const existing = await findExistingFile(input.fileName, input.folderId);
        return {
          exists: !!existing,
          file: existing,
        };
      }, "Erro ao verificar duplicação");
    }),

  /**
   * Sincroniza um documento de pauta/intimação com o Drive
   * Evita duplicações automaticamente
   */
  syncPautaDocument: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      driveFolderId: z.string(),
      documento: z.object({
        nome: z.string(),
        tipo: z.enum(["pauta", "intimacao", "despacho", "sentenca", "outros"]),
        url: z.string().optional(),
        dataDocumento: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const result = await syncPautaDocument(
          input.processoId,
          input.driveFolderId,
          {
            nome: input.documento.nome,
            tipo: input.documento.tipo,
            url: input.documento.url,
            dataDocumento: input.documento.dataDocumento 
              ? new Date(input.documento.dataDocumento) 
              : undefined,
          }
        );
        return result;
      }, "Erro ao sincronizar documento");
    }),

  /**
   * Sincroniza múltiplos documentos de uma pauta/intimação
   */
  syncMultiplePautaDocuments: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      driveFolderId: z.string(),
      documentos: z.array(z.object({
        nome: z.string(),
        tipo: z.enum(["pauta", "intimacao", "despacho", "sentenca", "outros"]),
        url: z.string().optional(),
        dataDocumento: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const result = await syncMultiplePautaDocuments(
          input.processoId,
          input.driveFolderId,
          input.documentos.map(doc => ({
            nome: doc.nome,
            tipo: doc.tipo,
            url: doc.url,
            dataDocumento: doc.dataDocumento ? new Date(doc.dataDocumento) : undefined,
          }))
        );
        return result;
      }, "Erro ao sincronizar documentos");
    }),

  /**
   * Registra uma audiência no Drive
   */
  registrarAudiencia: protectedProcedure
    .input(z.object({
      driveFolderId: z.string(),
      audiencia: z.object({
        data: z.string(),
        hora: z.string(),
        tipo: z.string(),
        local: z.string().optional(),
        observacoes: z.string().optional(),
        numeroProcesso: z.string(),
        nomeAssistido: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const result = await registrarAudienciaNoDrive(
          input.driveFolderId,
          {
            ...input.audiencia,
            data: new Date(input.audiencia.data),
          }
        );
        return result;
      }, "Erro ao registrar audiência no Drive");
    }),

  /**
   * Verifica integridade da sincronização entre banco e Drive
   */
  verificarIntegridade: adminProcedure
    .input(z.object({ folderId: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await verificarIntegridadeSincronizacao(input.folderId);
        return result;
      }, "Erro ao verificar integridade");
    }),

  /**
   * Cria pasta para um processo no Drive
   */
  criarPastaProcesso: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      nomeAssistido: z.string(),
      numeroAutos: z.string(),
      area: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const result = await criarPastaProcesso(
          input.processoId,
          input.nomeAssistido,
          input.numeroAutos,
          input.area
        );
        
        if (!result) {
          throw Errors.internal("Falha ao criar pasta do processo");
        }
        
        return result;
      }, "Erro ao criar pasta do processo");
    }),

  /**
   * Upload de arquivo com prevenção de duplicação
   */
  uploadFileSafe: protectedProcedure
    .input(z.object({
      folderId: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileBase64: z.string(),
      description: z.string().optional(),
      preventDuplicates: z.boolean().default(true),
      updateIfExists: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Converter base64 para buffer
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const file = await uploadFileBuffer(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId,
          input.description,
          {
            preventDuplicates: input.preventDuplicates,
            updateIfExists: input.updateIfExists,
          }
        );

        if (!file) {
          throw Errors.internal("Falha ao fazer upload do arquivo");
        }

        // Inserir/atualizar no banco local
        const existing = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.driveFileId, file.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(driveFiles).values({
            driveFileId: file.id,
            driveFolderId: input.folderId,
            name: file.name,
            mimeType: file.mimeType,
            fileSize: file.size ? parseInt(file.size) : null,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            iconLink: file.iconLink,
            driveChecksum: file.md5Checksum,
            isFolder: false,
            syncStatus: "synced",
            lastSyncAt: new Date(),
            lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
            createdById: ctx.user.id,
          });
        } else {
          await db
            .update(driveFiles)
            .set({
              name: file.name,
              fileSize: file.size ? parseInt(file.size) : null,
              driveChecksum: file.md5Checksum,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.driveFileId, file.id));
        }

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: file.id,
          action: existing.length === 0 ? "upload" : "update",
          status: "success",
          details: `Arquivo ${file.name} sincronizado`,
          userId: ctx.user.id,
        });

        return file;
      }, "Erro ao fazer upload do arquivo");
    }),

  // ============================================
  // VINCULAÇÃO AUTOMÁTICA DE ARQUIVOS
  // ============================================

  /**
   * Sincroniza pasta com vinculação automática a processos
   */
  syncWithAutoLink: adminProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const result = await syncFolderWithAutoLink(input.folderId, ctx.user.id);
        return result;
      }, "Erro ao sincronizar com vinculação automática");
    }),

  /**
   * Vincula arquivos automaticamente a processos de uma pasta
   */
  autoLinkFiles: adminProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const result = await autoLinkMultipleFiles(input.folderId);
        return result;
      }, "Erro ao vincular arquivos automaticamente");
    }),

  /**
   * Vincula um arquivo a um processo específico
   */
  linkFileToProcesso: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      processoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const success = await linkFileToProcesso(input.fileId, input.processoId);

        if (!success) {
          throw Errors.internal("Falha ao vincular arquivo ao processo");
        }

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: null,
          action: "link_processo",
          status: "success",
          details: `Arquivo ${input.fileId} vinculado ao processo ${input.processoId}`,
          userId: ctx.user.id,
        });

        return { success: true };
      }, "Erro ao vincular arquivo ao processo");
    }),

  /**
   * Vincula um arquivo a um assistido específico
   */
  linkFileToAssistido: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      assistidoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const success = await linkFileToAssistido(input.fileId, input.assistidoId);

        if (!success) {
          throw Errors.internal("Falha ao vincular arquivo ao assistido");
        }

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: null,
          action: "link_assistido",
          status: "success",
          details: `Arquivo ${input.fileId} vinculado ao assistido ${input.assistidoId}`,
          userId: ctx.user.id,
        });

        return { success: true };
      }, "Erro ao vincular arquivo ao assistido");
    }),

  /**
   * Remove vinculação de um arquivo
   */
  unlinkFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const success = await unlinkFile(input.fileId);

        if (!success) {
          throw Errors.internal("Falha ao remover vinculação");
        }

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: null,
          action: "unlink",
          status: "success",
          details: `Vinculação removida do arquivo ${input.fileId}`,
          userId: ctx.user.id,
        });

        return { success: true };
      }, "Erro ao remover vinculação");
    }),

  /**
   * Lista arquivos vinculados a um processo
   */
  filesByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const files = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.processoId, input.processoId))
          .orderBy(desc(driveFiles.lastModifiedTime));

        return files;
      }, "Erro ao listar arquivos do processo");
    }),

  /**
   * Lista arquivos vinculados a um assistido
   */
  filesByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const files = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.assistidoId, input.assistidoId))
          .orderBy(desc(driveFiles.lastModifiedTime));

        return files;
      }, "Erro ao listar arquivos do assistido");
    }),

  /**
   * Estatísticas de vinculação
   */
  linkStats: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const [totalFiles] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(eq(driveFiles.isFolder, false));

      const [linkedToProcesso] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.isFolder, false),
            sql`${driveFiles.processoId} IS NOT NULL`
          )
        );

      const [linkedToAssistido] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.isFolder, false),
            sql`${driveFiles.assistidoId} IS NOT NULL`
          )
        );

      const [unlinked] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.isFolder, false),
            sql`${driveFiles.processoId} IS NULL`,
            sql`${driveFiles.assistidoId} IS NULL`
          )
        );

      return {
        totalFiles: totalFiles?.count || 0,
        linkedToProcesso: linkedToProcesso?.count || 0,
        linkedToAssistido: linkedToAssistido?.count || 0,
        unlinked: unlinked?.count || 0,
      };
    }, "Erro ao obter estatísticas de vinculação");
  }),

  /**
   * Upload de arquivo com vinculação imediata
   */
  uploadWithLink: protectedProcedure
    .input(z.object({
      folderId: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileBase64: z.string(),
      description: z.string().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      casoId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Converter base64 para buffer
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const file = await uploadFileBuffer(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId,
          input.description,
          { preventDuplicates: true, updateIfExists: false }
        );

        if (!file) {
          throw Errors.internal("Falha ao fazer upload do arquivo");
        }

        // Se processoId fornecido, buscar assistidoId do processo
        let assistidoId = input.assistidoId;
        if (input.processoId && !assistidoId) {
          const [processo] = await db
            .select({ assistidoId: processos.assistidoId })
            .from(processos)
            .where(eq(processos.id, input.processoId))
            .limit(1);
          assistidoId = processo?.assistidoId || undefined;
        }

        // Inserir no banco local com vinculação
        await db.insert(driveFiles).values({
          driveFileId: file.id,
          driveFolderId: input.folderId,
          name: file.name,
          mimeType: file.mimeType,
          fileSize: file.size ? parseInt(file.size) : null,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          thumbnailLink: file.thumbnailLink,
          iconLink: file.iconLink,
          driveChecksum: file.md5Checksum,
          isFolder: false,
          syncStatus: "synced",
          lastSyncAt: new Date(),
          lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
          createdById: ctx.user.id,
          // Vinculações
          processoId: input.processoId,
          assistidoId: assistidoId,
        });

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: file.id,
          action: "upload_with_link",
          status: "success",
          details: `Arquivo ${file.name} enviado e vinculado (processo: ${input.processoId || 'N/A'}, assistido: ${assistidoId || 'N/A'})`,
          userId: ctx.user.id,
        });

        return file;
      }, "Erro ao fazer upload do arquivo");
    }),

  /**
   * Busca processos para seleção de vinculação
   */
  searchProcessosForLink: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const results = await db
          .select({
            id: processos.id,
            numero: processos.numero,
            assistidoId: processos.assistidoId,
            assistidoNome: assistidos.nome,
          })
          .from(processos)
          .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
          .where(
            or(
              like(processos.numero, `%${input.search}%`),
              like(assistidos.nome, `%${input.search}%`)
            )
          )
          .limit(10);

        return results;
      }, "Erro ao buscar processos");
    }),

  /**
   * Busca assistidos para seleção de vinculação
   */
  searchAssistidosForLink: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const results = await db
          .select({
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
          })
          .from(assistidos)
          .where(
            or(
              like(assistidos.nome, `%${input.search}%`),
              like(assistidos.cpf, `%${input.search}%`)
            )
          )
          .limit(10);

        return results;
      }, "Erro ao buscar assistidos");
    }),
});
