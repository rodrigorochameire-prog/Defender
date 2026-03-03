import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db";
import { eq, and, desc, sql, isNull, or, like, not, gt, lt } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  listFilesInFolder,
  listAllItemsInFolder,
  listAllFilesRecursively,
  syncFolderWithDatabase,
  smartSync,
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
  getAuthenticatedAccountInfo,
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
  // Novas funções de integração profunda
  createOrFindAssistidoFolder,
  createOrFindProcessoFolder,
  moveAssistidoFolder,
  mapAtribuicaoToFolderKey,
  autoLinkByHierarchy,
  moveFileInDrive,
  // Webhook & health
  registerWebhookForFolder,
  checkSyncHealth,
  // Auth
  getAccessToken,
} from "@/lib/services/google-drive";
import { processos, assistidos, casos, demandas, atendimentos } from "@/lib/db/schema";
import {
  enrichmentClient,
  type TranscribeOutput,
} from "@/lib/services/enrichment-client";

/**
 * Calcula a similaridade entre duas strings usando distância de Levenshtein normalizada
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}

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
   * Obtém informações da conta Google autenticada
   * Útil para saber qual conta precisa ter acesso às pastas
   */
  getAccountInfo: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const accountInfo = await getAuthenticatedAccountInfo();
      return accountInfo;
    }, "Erro ao obter informações da conta");
  }),

  /**
   * Lista pastas configuradas para sincronização
   */
  syncFolders: protectedProcedure.query(async () => {
    return safeAsync(async () => {
      const folders = await getSyncFolders();

      // Enrich with file counts per folder
      const fileCounts = await db
        .select({
          driveFolderId: driveFiles.driveFolderId,
          fileCount: sql<number>`count(*)::int`,
        })
        .from(driveFiles)
        .where(eq(driveFiles.isFolder, false))
        .groupBy(driveFiles.driveFolderId);

      const countMap: Record<string, number> = {};
      for (const row of fileCounts) {
        countMap[row.driveFolderId] = row.fileCount;
      }

      return folders.map((f) => ({
        ...f,
        fileCount: countMap[f.driveFolderId] ?? 0,
      }));
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
          // Se erro de acesso, incluir email da conta autenticada na mensagem
          if (result.error?.includes("Não foi possível acessar")) {
            const accountInfo = await getAuthenticatedAccountInfo();
            const emailInfo = accountInfo?.email
              ? `\n\nA pasta deve estar acessível pela conta: ${accountInfo.email}`
              : "\n\nVerifique se a pasta está compartilhada com sua conta Google.";
            throw Errors.validation(result.error + emailInfo);
          }
          throw Errors.validation(result.error || "Falha ao registrar pasta para sincronização");
        }

        // Auto-register webhook for real-time notifications
        const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
        if (webhookBaseUrl) {
          try {
            const webhookResult = await registerWebhookForFolder(input.folderId, webhookBaseUrl);
            if (webhookResult) {
              console.log(`[Drive] Webhook registered for folder ${input.folderId}, expires ${webhookResult.expiration.toISOString()}`);
            } else {
              console.warn(`[Drive] Failed to register webhook for folder ${input.folderId} — will use polling fallback`);
            }
          } catch (err) {
            console.error('[Drive] Error registering webhook:', err);
            // Non-fatal — folder is still registered for sync via polling
          }
        }

        return { success: true, folderName: result.folderName };
      }, "Erro ao registrar pasta para sincronização");
    }),

  /**
   * Registra todas as pastas de atribuição de uma vez
   * Útil para configurar rapidamente o sistema
   */
  registerAllAtribuicoes: adminProcedure.mutation(async ({ ctx }) => {
    const { ATRIBUICAO_FOLDER_IDS, SPECIAL_FOLDER_IDS } = await import("@/lib/utils/text-extraction");

    const folders = [
      { id: ATRIBUICAO_FOLDER_IDS.JURI, name: "Júri", description: "Assistidos da atribuição do Tribunal do Júri" },
      { id: ATRIBUICAO_FOLDER_IDS.VVD, name: "VVD", description: "Violência e Vítimas Domésticas" },
      { id: ATRIBUICAO_FOLDER_IDS.EP, name: "Execução Penal", description: "Assistidos em Execução Penal" },
      { id: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO, name: "Substituição", description: "Substituição Criminal" },
      { id: SPECIAL_FOLDER_IDS.DISTRIBUICAO, name: "Distribuição", description: "Pasta para distribuição de documentos" },
    ];

    const results = [];

    for (const folder of folders) {
      try {
        // Verificar se já existe
        const [existing] = await db
          .select()
          .from(driveSyncFolders)
          .where(eq(driveSyncFolders.driveFolderId, folder.id))
          .limit(1);

        if (existing) {
          // Reativar se estiver inativo
          if (!existing.isActive) {
            await db
              .update(driveSyncFolders)
              .set({ isActive: true, updatedAt: new Date() })
              .where(eq(driveSyncFolders.id, existing.id));
            results.push({ name: folder.name, status: "reactivated" });
          } else {
            results.push({ name: folder.name, status: "already_exists" });
          }
        } else {
          // Registrar nova pasta
          const result = await registerSyncFolder(
            folder.id,
            folder.name,
            folder.description,
            "bidirectional",
            ctx.user.id
          );
          results.push({ name: folder.name, status: result.success ? "registered" : "failed" });
        }
      } catch (error) {
        console.error(`Erro ao registrar pasta ${folder.name}:`, error);
        results.push({ name: folder.name, status: "error" });
      }
    }

    return { results };
  }),

  /**
   * Auto-vincula assistidos com pastas do Drive pelo nome
   * Busca pastas nas atribuições que correspondem ao nome do assistido
   */
  autoLinkAssistidosByName: adminProcedure.mutation(async ({ ctx }) => {
    const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");

    // Buscar todos os assistidos sem pasta vinculada
    const assistidosSemPasta = await db
      .select({
        id: assistidos.id,
        nome: assistidos.nome,
        atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
      })
      .from(assistidos)
      .where(isNull(assistidos.driveFolderId));

    const results = {
      total: assistidosSemPasta.length,
      linked: 0,
      notFound: 0,
      errors: 0,
      details: [] as { nome: string; status: string; folderId?: string; searchedIn?: string }[],
    };

    // Mapeia atribuicaoPrimaria (enum do banco) para chave do ATRIBUICAO_FOLDER_IDS
    const atribToFolder: Record<string, string> = {
      JURI_CAMACARI: "JURI",
      GRUPO_JURI: "GRUPO_JURI",
      VVD_CAMACARI: "VVD",
      EXECUCAO_PENAL: "EP",
      SUBSTITUICAO: "SUBSTITUICAO",
      SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
    };

    for (const assistido of assistidosSemPasta) {
      try {
        // Determinar a atribuição para buscar (CORRIGIDO: usa atribuicaoPrimaria)
        const atribKey = atribToFolder[assistido.atribuicaoPrimaria || ""] || null;

        // Normalizar nome: remove acentos + lowercase para matching robusto
        const nomeNorm = normalizeName(assistido.nome).toLowerCase().replace(/\s+/g, " ").trim();

        // Buscar em TODAS as atribuições se a primária não deu match,
        // mas priorizando a atribuição primária
        const foldersToSearch: Array<{ key: string; folderId: string; priority: number }> = [];

        // Prioridade 1: atribuição primária do assistido
        if (atribKey && ATRIBUICAO_FOLDER_IDS[atribKey as keyof typeof ATRIBUICAO_FOLDER_IDS]) {
          foldersToSearch.push({
            key: atribKey,
            folderId: ATRIBUICAO_FOLDER_IDS[atribKey as keyof typeof ATRIBUICAO_FOLDER_IDS],
            priority: 1,
          });
        }

        // Prioridade 2: todas as outras atribuições (fallback)
        for (const [key, folderId] of Object.entries(ATRIBUICAO_FOLDER_IDS)) {
          if (key !== atribKey) {
            foldersToSearch.push({ key, folderId, priority: 2 });
          }
        }

        if (foldersToSearch.length === 0) {
          results.notFound++;
          results.details.push({ nome: assistido.nome, status: "atribuicao_invalida" });
          continue;
        }

        let matchingFolder = null;
        let matchedIn = "";

        for (const { key, folderId } of foldersToSearch) {
          const subfolders = await listAllItemsInFolder(folderId);
          if (!subfolders || subfolders.length === 0) continue;

          for (const folder of subfolders) {
            if (folder.mimeType !== "application/vnd.google-apps.folder") continue;

            // Normalizar nome da pasta: remove acentos + lowercase
            const folderNorm = normalizeName(folder.name).toLowerCase().replace(/\s+/g, " ").trim();

            // Match exato, parcial ou fuzzy (com nomes sem acento)
            if (
              folderNorm === nomeNorm ||
              folderNorm.startsWith(nomeNorm) ||
              nomeNorm.startsWith(folderNorm) ||
              calculateSimilarity(folderNorm, nomeNorm) > 0.8
            ) {
              matchingFolder = folder;
              matchedIn = key;
              break;
            }
          }

          if (matchingFolder) break;
        }

        if (matchingFolder) {
          await db
            .update(assistidos)
            .set({ driveFolderId: matchingFolder.id, updatedAt: new Date() })
            .where(eq(assistidos.id, assistido.id));

          results.linked++;
          results.details.push({
            nome: assistido.nome,
            status: "linked",
            folderId: matchingFolder.id,
            searchedIn: matchedIn,
          });
        } else {
          results.notFound++;
          results.details.push({ nome: assistido.nome, status: "pasta_nao_encontrada" });
        }
      } catch (error) {
        console.error(`Erro ao vincular ${assistido.nome}:`, error);
        results.errors++;
        results.details.push({ nome: assistido.nome, status: "error" });
      }
    }

    return results;
  }),

  /**
   * Busca sugestões de pastas para vincular a um assistido específico
   */
  suggestFoldersForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");
      const { mapAtribuicaoToFolderKey } = await import("@/lib/services/google-drive");

      // Buscar assistido
      const [assistido] = await db
        .select()
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        return { suggestions: [], assistidoNome: "" };
      }

      const folderKey = mapAtribuicaoToFolderKey(assistido.atribuicaoPrimaria || "SUBSTITUICAO");
      const atribuicaoFolderId = folderKey
        ? ATRIBUICAO_FOLDER_IDS[folderKey as keyof typeof ATRIBUICAO_FOLDER_IDS]
        : null;

      // Buscar em todas as atribuições, priorizando a do assistido
      const allSuggestions: Array<{ id: string; name: string; similarity: number; atribuicao: string }> = [];
      const nomeNorm = normalizeName(assistido.nome).toLowerCase().replace(/\s+/g, " ").trim();

      for (const [key, fId] of Object.entries(ATRIBUICAO_FOLDER_IDS)) {
        const items = await listAllItemsInFolder(fId);
        if (!items || items.length === 0) continue;

        for (const folder of items) {
          if (folder.mimeType !== "application/vnd.google-apps.folder") continue;
          const folderNorm = normalizeName(folder.name).toLowerCase().replace(/\s+/g, " ").trim();
          const similarity = calculateSimilarity(folderNorm, nomeNorm);
          if (similarity > 0.3) {
            // Boost de prioridade se for da atribuição do assistido
            const boost = (atribuicaoFolderId && fId === atribuicaoFolderId) ? 0.1 : 0;
            allSuggestions.push({
              id: folder.id,
              name: folder.name,
              similarity: Math.min(similarity + boost, 1),
              atribuicao: key,
            });
          }
        }
      }

      const suggestions = allSuggestions
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      return { suggestions, assistidoNome: assistido.nome };
    }),

  /**
   * Vincula manualmente um assistido a uma pasta do Drive
   */
  linkAssistidoToFolder: adminProcedure
    .input(z.object({ assistidoId: z.number(), folderId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(assistidos)
        .set({ driveFolderId: input.folderId, updatedAt: new Date() })
        .where(eq(assistidos.id, input.assistidoId));

      return { success: true };
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
   * Força sincronização de uma pasta (usa smartSync para incremental quando possível)
   */
  syncFolder: protectedProcedure
    .input(z.object({ folderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const result = await smartSync(input.folderId, ctx.user.id);
        return result;
      }, "Erro ao sincronizar pasta");
    }),

  /**
   * Sincroniza todas as pastas configuradas.
   * Usa smartSync (incremental quando syncToken disponível, full apenas na 1ª vez).
   * Após sync, tenta registrar webhooks para push notifications automáticas.
   */
  syncAll: adminProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const folders = await getSyncFolders();

      // Sync all folders in parallel — each folder is independent
      const settled = await Promise.allSettled(
        folders.map(async (folder) => {
          const result = await smartSync(folder.driveFolderId, ctx.user.id);

          // Após sync bem-sucedido, registrar webhook se ainda não existe
          if (result.success) {
            try {
              const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL
                || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
                || "https://ombuds.vercel.app";
              await registerWebhookForFolder(folder.driveFolderId, webhookBaseUrl);
            } catch {
              // Webhook registration is non-fatal
              console.warn("[Drive Sync] Webhook registration failed for", folder.name);
            }
          }

          return {
            folderId: folder.driveFolderId,
            folderName: folder.name,
            ...result,
          };
        })
      );

      return settled.map((s, i) => {
        if (s.status === "fulfilled") return s.value;
        return {
          folderId: folders[i].driveFolderId,
          folderName: folders[i].name,
          success: false,
          filesAdded: 0,
          filesUpdated: 0,
          filesRemoved: 0,
          errors: [s.reason instanceof Error ? s.reason.message : String(s.reason)],
          newFileIds: [],
        };
      });
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
        parentDriveFileId: z.string().optional(), // ID do Drive do parent (alternativa a parentFileId)
        search: z.string().optional(),
        mimeType: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(driveFiles.driveFolderId, input.folderId)];

        // Se tiver parentDriveFileId, buscar o ID do banco primeiro
        if (input.parentDriveFileId) {
          const [parentFolder] = await db
            .select({ id: driveFiles.id })
            .from(driveFiles)
            .where(eq(driveFiles.driveFileId, input.parentDriveFileId))
            .limit(1);

          if (parentFolder) {
            conditions.push(eq(driveFiles.parentFileId, parentFolder.id));
          } else {
            // Parent não encontrado, retornar vazio
            return { files: [], total: 0 };
          }
        } else if (input.parentFileId !== undefined) {
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
        return await listFilesInFolder(input.folderId, input.pageToken, input.pageSize);
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
            numero: processos.numeroAutos,
            assistidoId: processos.assistidoId,
            assistidoNome: assistidos.nome,
          })
          .from(processos)
          .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
          .where(
            or(
              like(processos.numeroAutos, `%${input.search}%`),
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

  /**
   * Busca assistido pelo nome da pasta (para sidebar contextual)
   */
  getAssistidoByFolderName: protectedProcedure
    .input(z.object({ folderName: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        // Busca fuzzy pelo nome - a pasta geralmente tem o nome do assistido
        const normalizedName = input.folderName.trim().toLowerCase();

        // Buscar assistido que tenha nome similar
        const results = await db
          .select({
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
            statusPrisional: assistidos.statusPrisional,
            localPrisao: assistidos.localPrisao,
            telefone: assistidos.telefone,
            telefoneContato: assistidos.telefoneContato,
            nomeContato: assistidos.nomeContato,
            photoUrl: assistidos.photoUrl,
            driveFolderId: assistidos.driveFolderId,
          })
          .from(assistidos)
          .where(
            or(
              // Match exato (case insensitive)
              sql`LOWER(${assistidos.nome}) = ${normalizedName}`,
              // Match parcial
              sql`LOWER(${assistidos.nome}) LIKE ${`%${normalizedName}%`}`,
              // Nome da pasta pode ser parte do nome
              sql`${normalizedName} LIKE '%' || LOWER(${assistidos.nome}) || '%'`
            )
          )
          .limit(1);

        if (results.length === 0) return null;

        const assistido = results[0];

        // Buscar processos do assistido
        const processosResult = await db
          .select({
            id: processos.id,
            numero: processos.numeroAutos,
            status: processos.situacao,
            vara: processos.vara,
            tipoAcao: processos.classeProcessual,
          })
          .from(processos)
          .where(eq(processos.assistidoId, assistido.id))
          .limit(5);

        // Buscar próximas demandas
        const demandasResult = await db
          .select({
            id: demandas.id,
            ato: demandas.ato,
            prazo: demandas.prazo,
            status: demandas.status,
            prioridade: demandas.prioridade,
          })
          .from(demandas)
          .where(
            and(
              eq(demandas.assistidoId, assistido.id),
              not(eq(demandas.status, "CONCLUIDO")),
              not(eq(demandas.status, "ARQUIVADO"))
            )
          )
          .orderBy(demandas.prazo)
          .limit(3);

        return {
          ...assistido,
          processos: processosResult,
          demandas: demandasResult,
        };
      }, "Erro ao buscar assistido");
    }),

  /**
   * Atualiza tags de um arquivo
   */
  updateFileTags: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      tags: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db
          .update(driveFiles)
          .set({
            description: JSON.stringify({ tags: input.tags }),
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, input.fileId));

        return { success: true };
      }, "Erro ao atualizar tags");
    }),

  /**
   * Busca arquivos com filtro por tags
   */
  filesWithTags: protectedProcedure
    .input(z.object({
      folderId: z.string(),
      tags: z.array(z.string()).optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let query = db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.driveFolderId, input.folderId))
          .limit(input.limit);

        const files = await query;

        // Filtrar por tags se especificado
        if (input.tags && input.tags.length > 0) {
          return files.filter(file => {
            try {
              const desc = JSON.parse(file.description || '{}');
              const fileTags = desc.tags || [];
              return input.tags!.some(tag => fileTags.includes(tag));
            } catch {
              return false;
            }
          });
        }

        return files;
      }, "Erro ao buscar arquivos com tags");
    }),

  /**
   * Timeline de documentos (ordenados por data)
   */
  timeline: protectedProcedure
    .input(z.object({
      folderId: z.string(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [
          eq(driveFiles.driveFolderId, input.folderId),
          eq(driveFiles.isFolder, false), // Apenas arquivos, não pastas
        ];

        if (input.assistidoId) {
          conditions.push(eq(driveFiles.assistidoId, input.assistidoId));
        }

        if (input.processoId) {
          conditions.push(eq(driveFiles.processoId, input.processoId));
        }

        const files = await db
          .select()
          .from(driveFiles)
          .where(and(...conditions))
          .orderBy(desc(driveFiles.lastModifiedTime));

        // Agrupar por mês/ano
        const grouped: Record<string, typeof files> = {};

        for (const file of files) {
          const date = file.lastModifiedTime || file.createdAt;
          const key = date
            ? new Date(date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
            : 'Sem data';

          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(file);
        }

        return {
          files,
          grouped,
          total: files.length,
        };
      }, "Erro ao buscar timeline");
    }),

  /**
   * Estatísticas detalhadas por atribuição
   */
  statsDetailed: protectedProcedure
    .input(z.object({ folderId: z.string().optional() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const folderFilter = input.folderId ? eq(driveFiles.driveFolderId, input.folderId) : undefined;

        // Total de arquivos (excluindo pastas)
        const [totalResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(and(folderFilter, eq(driveFiles.isFolder, false)));

        // Arquivos vinculados (com assistidoId ou processoId)
        const [linkedResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(
            and(
              folderFilter,
              eq(driveFiles.isFolder, false),
              sql`(${driveFiles.assistidoId} IS NOT NULL OR ${driveFiles.processoId} IS NOT NULL)`
            )
          );

        // Arquivos por enrichmentStatus
        const byEnrichment = await db
          .select({
            enrichmentStatus: driveFiles.enrichmentStatus,
            count: sql<number>`count(*)::int`,
          })
          .from(driveFiles)
          .where(and(folderFilter, eq(driveFiles.isFolder, false)))
          .groupBy(driveFiles.enrichmentStatus);

        // Arquivos por tipo
        const byType = await db
          .select({
            mimeType: driveFiles.mimeType,
            count: sql<number>`count(*)::int`,
          })
          .from(driveFiles)
          .where(and(folderFilter, eq(driveFiles.isFolder, false)))
          .groupBy(driveFiles.mimeType);

        // Arquivos novos (últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [newFilesResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(
            and(
              folderFilter,
              gt(driveFiles.lastModifiedTime, sevenDaysAgo)
            )
          );

        // Tamanho total
        const [sizeResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(${driveFiles.fileSize}), 0)::bigint` })
          .from(driveFiles)
          .where(folderFilter);

        // Categorizar tipos de arquivos
        const categories: Record<string, number> = {
          pdf: 0, document: 0, image: 0, audio: 0, other: 0,
        };
        for (const row of byType) {
          const mt = row.mimeType || "";
          if (mt.includes("pdf")) categories.pdf += row.count;
          else if (mt.includes("document") || mt.includes("word") || mt.includes("spreadsheet")) categories.document += row.count;
          else if (mt.includes("image")) categories.image += row.count;
          else if (mt.includes("audio")) categories.audio += row.count;
          else categories.other += row.count;
        }

        const total = totalResult?.count ?? 0;
        const linked = linkedResult?.count ?? 0;
        const enrichmentMap: Record<string, number> = {};
        for (const row of byEnrichment) {
          enrichmentMap[row.enrichmentStatus || "pending"] = row.count;
        }

        return {
          total,
          linked,
          totalFiles: total,
          newFiles: newFilesResult?.count ?? 0,
          totalSize: Number(sizeResult?.total ?? 0),
          byCategory: categories,
          byEnrichment: byEnrichment.map((r) => ({
            enrichmentStatus: r.enrichmentStatus,
            count: r.count,
          })),
        };
      }, "Erro ao buscar estatísticas detalhadas");
    }),

  /**
   * Vincular arquivo a assistido/processo
   */
  getFileById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const [file] = await db
          .select({
            id: driveFiles.id,
            assistidoId: driveFiles.assistidoId,
            processoId: driveFiles.processoId,
            fileSize: driveFiles.fileSize,
            enrichmentStatus: driveFiles.enrichmentStatus,
          })
          .from(driveFiles)
          .where(eq(driveFiles.id, input.id))
          .limit(1);
        return file || null;
      }, "Erro ao buscar arquivo");
    }),

  linkFileToEntity: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const updates: any = { updatedAt: new Date() };

        if (input.assistidoId !== undefined) {
          updates.assistidoId = input.assistidoId;
        }
        if (input.processoId !== undefined) {
          updates.processoId = input.processoId;
        }

        await db
          .update(driveFiles)
          .set(updates)
          .where(eq(driveFiles.id, input.fileId));

        return { success: true };
      }, "Erro ao vincular arquivo");
    }),

  // ==========================================
  // INTEGRAÇÃO PROFUNDA - LIFECYCLE & STATUS
  // ==========================================

  /**
   * Criar pasta no Drive para um assistido (baseado na atribuição)
   * Retorna o folderId criado/encontrado
   */
  createFolderForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input }) => {
      const [assistido] = await db
        .select()
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        throw new Error("Assistido não encontrado");
      }

      const folderKey = mapAtribuicaoToFolderKey(
        assistido.atribuicaoPrimaria || "SUBSTITUICAO"
      );

      if (!folderKey) {
        return { success: false, error: "Atribuição sem pasta raiz configurada" };
      }

      const folder = await createOrFindAssistidoFolder(folderKey, assistido.nome);
      if (!folder) {
        return { success: false, error: "Erro ao criar pasta no Drive" };
      }

      // Atualizar assistido com o folderId
      await db
        .update(assistidos)
        .set({ driveFolderId: folder.id, updatedAt: new Date() })
        .where(eq(assistidos.id, input.assistidoId));

      return {
        success: true,
        folderId: folder.id,
        folderName: folder.name,
        webViewLink: folder.webViewLink,
      };
    }),

  /**
   * Criar pasta no Drive para um processo (subpasta do assistido)
   */
  createFolderForProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .mutation(async ({ input }) => {
      const [processo] = await db
        .select()
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) {
        throw new Error("Processo não encontrado");
      }

      // Buscar assistido principal
      const [assistido] = processo.assistidoId
        ? await db
            .select()
            .from(assistidos)
            .where(eq(assistidos.id, processo.assistidoId))
            .limit(1)
        : [];

      if (!assistido?.driveFolderId) {
        return {
          success: false,
          error: "Assistido não tem pasta no Drive. Crie a pasta do assistido primeiro.",
        };
      }

      const folder = await createOrFindProcessoFolder(
        assistido.driveFolderId,
        processo.numeroAutos
      );

      if (!folder) {
        return { success: false, error: "Erro ao criar pasta no Drive" };
      }

      // Atualizar processo
      await db
        .update(processos)
        .set({
          driveFolderId: folder.id,
          linkDrive: folder.webViewLink,
          updatedAt: new Date(),
        })
        .where(eq(processos.id, input.processoId));

      return {
        success: true,
        folderId: folder.id,
        folderName: folder.name,
        webViewLink: folder.webViewLink,
      };
    }),

  /**
   * Obter status completo do Drive para um assistido (header bar)
   */
  getDriveStatusForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const [assistido] = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          driveFolderId: assistidos.driveFolderId,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
          analyzedAt: assistidos.analyzedAt,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) return null;

      if (!assistido.driveFolderId) {
        return {
          linked: false,
          folderId: null,
          folderUrl: null,
          atribuicao: assistido.atribuicaoPrimaria,
          totalDocs: 0,
          enrichedDocs: 0,
          processingDocs: 0,
          failedDocs: 0,
          pendingDocs: 0,
          lastSyncAt: null,
          recentFiles: [],
          processosWithFolder: [],
        };
      }

      // Contar arquivos por status
      const statusCounts = await db
        .select({
          enrichmentStatus: driveFiles.enrichmentStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.assistidoId, input.assistidoId),
            eq(driveFiles.isFolder, false)
          )
        )
        .groupBy(driveFiles.enrichmentStatus);

      const counts = {
        totalDocs: 0,
        enrichedDocs: 0,
        processingDocs: 0,
        failedDocs: 0,
        pendingDocs: 0,
      };

      for (const row of statusCounts) {
        const c = row.count;
        counts.totalDocs += c;
        if (row.enrichmentStatus === "completed") counts.enrichedDocs += c;
        else if (row.enrichmentStatus === "processing") counts.processingDocs += c;
        else if (row.enrichmentStatus === "failed") counts.failedDocs += c;
        else if (row.enrichmentStatus === "pending") counts.pendingDocs += c;
      }

      // Novos docs desde última análise
      let newSinceAnalysis = 0;
      if (assistido.analyzedAt) {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(
            and(
              eq(driveFiles.assistidoId, input.assistidoId),
              eq(driveFiles.isFolder, false),
              eq(driveFiles.enrichmentStatus, "completed"),
              sql`${driveFiles.enrichedAt} > ${assistido.analyzedAt}`
            )
          );
        newSinceAnalysis = result?.count || 0;
      }

      // Últimos 3 arquivos
      const recentFiles = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          webViewLink: driveFiles.webViewLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          documentType: driveFiles.documentType,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.assistidoId, input.assistidoId),
            eq(driveFiles.isFolder, false)
          )
        )
        .orderBy(desc(driveFiles.lastModifiedTime))
        .limit(3);

      // Processos com pasta
      const processosWithFolder = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          driveFolderId: processos.driveFolderId,
        })
        .from(processos)
        .where(
          and(
            eq(processos.assistidoId, input.assistidoId),
            sql`${processos.driveFolderId} IS NOT NULL`
          )
        );

      // Contagem de docs por processo
      const processosComDocs = await Promise.all(
        processosWithFolder.map(async (p) => {
          const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.processoId, p.id),
                eq(driveFiles.isFolder, false)
              )
            );
          return {
            id: p.id,
            numeroAutos: p.numeroAutos,
            driveFolderId: p.driveFolderId,
            docCount: result?.count || 0,
          };
        })
      );

      // Último sync
      const [syncFolder] = await db
        .select({ lastSyncAt: driveSyncFolders.lastSyncAt })
        .from(driveSyncFolders)
        .where(eq(driveSyncFolders.driveFolderId, assistido.driveFolderId))
        .limit(1);

      return {
        linked: true,
        folderId: assistido.driveFolderId,
        folderUrl: `https://drive.google.com/drive/folders/${assistido.driveFolderId}`,
        atribuicao: assistido.atribuicaoPrimaria,
        ...counts,
        newSinceAnalysis,
        lastSyncAt: syncFolder?.lastSyncAt || null,
        recentFiles,
        processosWithFolder: processosComDocs,
      };
    }),

  /**
   * Obter status completo do Drive para um processo (header bar)
   */
  getDriveStatusForProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [processo] = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          driveFolderId: processos.driveFolderId,
          linkDrive: processos.linkDrive,
          analyzedAt: processos.analyzedAt,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      if (!processo) return null;

      if (!processo.driveFolderId) {
        return {
          linked: false,
          folderId: null,
          folderUrl: processo.linkDrive || null,
          totalDocs: 0,
          enrichedDocs: 0,
          processingDocs: 0,
          failedDocs: 0,
          pendingDocs: 0,
          lastSyncAt: null,
          recentFiles: [],
          subfolders: [],
        };
      }

      // Contar arquivos por status
      const statusCounts = await db
        .select({
          enrichmentStatus: driveFiles.enrichmentStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.processoId, input.processoId),
            eq(driveFiles.isFolder, false)
          )
        )
        .groupBy(driveFiles.enrichmentStatus);

      const counts = {
        totalDocs: 0,
        enrichedDocs: 0,
        processingDocs: 0,
        failedDocs: 0,
        pendingDocs: 0,
      };

      for (const row of statusCounts) {
        const c = row.count;
        counts.totalDocs += c;
        if (row.enrichmentStatus === "completed") counts.enrichedDocs += c;
        else if (row.enrichmentStatus === "processing") counts.processingDocs += c;
        else if (row.enrichmentStatus === "failed") counts.failedDocs += c;
        else if (row.enrichmentStatus === "pending") counts.pendingDocs += c;
      }

      // Novos desde análise
      let newSinceAnalysis = 0;
      if (processo.analyzedAt) {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(
            and(
              eq(driveFiles.processoId, input.processoId),
              eq(driveFiles.isFolder, false),
              eq(driveFiles.enrichmentStatus, "completed"),
              sql`${driveFiles.enrichedAt} > ${processo.analyzedAt}`
            )
          );
        newSinceAnalysis = result?.count || 0;
      }

      // Últimos 3 arquivos
      const recentFiles = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          webViewLink: driveFiles.webViewLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          documentType: driveFiles.documentType,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.processoId, input.processoId),
            eq(driveFiles.isFolder, false)
          )
        )
        .orderBy(desc(driveFiles.lastModifiedTime))
        .limit(3);

      // Subpastas do processo (01-05)
      const subfolders = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          driveFileId: driveFiles.driveFileId,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.processoId, input.processoId),
            eq(driveFiles.isFolder, true)
          )
        )
        .orderBy(driveFiles.name);

      // Contagem por subpasta
      const subfoldersWithCount = await Promise.all(
        subfolders.map(async (sf) => {
          const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.parentFileId, sf.id),
                eq(driveFiles.isFolder, false)
              )
            );
          return { ...sf, docCount: result?.count || 0 };
        })
      );

      return {
        linked: true,
        folderId: processo.driveFolderId,
        folderUrl: processo.linkDrive || `https://drive.google.com/drive/folders/${processo.driveFolderId}`,
        ...counts,
        newSinceAnalysis,
        lastSyncAt: null,
        recentFiles,
        subfolders: subfoldersWithCount,
      };
    }),

  /**
   * Obter arquivos com status de enrichment para a aba Drive aprimorada
   */
  getFilesWithEnrichmentStatus: protectedProcedure
    .input(z.object({
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
      enrichmentStatus: z.enum(["pending", "processing", "completed", "failed", "unsupported"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.assistidoId) conditions.push(eq(driveFiles.assistidoId, input.assistidoId));
      if (input.processoId) conditions.push(eq(driveFiles.processoId, input.processoId));
      if (input.enrichmentStatus) conditions.push(eq(driveFiles.enrichmentStatus, input.enrichmentStatus));
      if (input.search) conditions.push(like(driveFiles.name, `%${input.search}%`));

      const files = await db
        .select()
        .from(driveFiles)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(driveFiles.lastModifiedTime))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        files,
        total: countResult?.count || 0,
      };
    }),

  /**
   * Retry enrichment para arquivos com erro
   */
  retryEnrichment: protectedProcedure
    .input(z.object({
      fileIds: z.array(z.number()).optional(),
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const conditions = [eq(driveFiles.enrichmentStatus, "failed")];
      if (input.assistidoId) conditions.push(eq(driveFiles.assistidoId, input.assistidoId));
      if (input.processoId) conditions.push(eq(driveFiles.processoId, input.processoId));

      if (input.fileIds && input.fileIds.length > 0) {
        // Retry arquivos específicos
        for (const id of input.fileIds) {
          await db
            .update(driveFiles)
            .set({ enrichmentStatus: "pending", enrichmentError: null, updatedAt: new Date() })
            .where(eq(driveFiles.id, id));
        }
        return { reset: input.fileIds.length };
      }

      // Retry todos com erro para o assistido/processo
      const result = await db
        .update(driveFiles)
        .set({ enrichmentStatus: "pending", enrichmentError: null, updatedAt: new Date() })
        .where(and(...conditions))
        .returning({ id: driveFiles.id });

      return { reset: result.length };
    }),

  /**
   * Health status do sistema de sincronização Drive
   * Retorna métricas de saúde: webhooks ativos, folders sincronizados, etc.
   */
  healthStatus: adminProcedure.query(async () => {
    return checkSyncHealth();
  }),

  // ==========================================
  // TRANSCRIPTION (Whisper + pyannote)
  // ==========================================

  /**
   * Transcrever arquivo de áudio/vídeo do Drive.
   * Chama enrichment engine /api/transcribe-async que retorna 202 imediatamente.
   * O enrichment engine processa em background (Railway, sem timeout) e
   * atualiza drive_files via Supabase diretamente quando terminar.
   * O UI faz polling a cada 5s para detectar mudanças de status.
   */
  transcreverDrive: protectedProcedure
    .input(
      z.object({
        driveFileId: z.string(),
        processoId: z.number().optional(),
        assistidoId: z.number().optional(),
        diarize: z.boolean().default(true),
        expectedSpeakers: z.number().optional(),
        language: z.string().default("pt"),
      }),
    )
    .mutation(async ({ input }) => {
      // 0. Recovery: resetar arquivos stuck em "processing" por mais de 15 min
      await db
        .update(driveFiles)
        .set({
          enrichmentStatus: "failed",
          enrichmentError: "Timeout: transcrição ficou em processing por mais de 15 minutos. Tente novamente.",
        })
        .where(
          and(
            eq(driveFiles.enrichmentStatus, "processing"),
            lt(driveFiles.updatedAt, new Date(Date.now() - 15 * 60 * 1000)),
          ),
        );

      // 1. Buscar arquivo no DB e validar
      const [file] = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          fileSize: driveFiles.fileSize,
          driveFileId: driveFiles.driveFileId,
          enrichmentStatus: driveFiles.enrichmentStatus,
          updatedAt: driveFiles.updatedAt,
        })
        .from(driveFiles)
        .where(eq(driveFiles.driveFileId, input.driveFileId))
        .limit(1);

      if (!file) {
        throw new Error(`Arquivo não encontrado no Drive: ${input.driveFileId}`);
      }

      // Idempotência: se já está em processing (e não é stuck — o reset acima já tratou stuck),
      // retornar sem re-enfileirar para evitar transcrições duplicadas.
      if (file.enrichmentStatus === "processing") {
        return {
          queued: false,
          driveFileId: input.driveFileId,
          message: `Transcrição de "${file.name}" já está em andamento. Aguarde a conclusão.`,
        };
      }

      // Verificar se é áudio/vídeo
      const audioVideoMimes = ["audio/", "video/", "application/ogg", "application/octet-stream"];
      const isAudioVideo = audioVideoMimes.some((m) => file.mimeType?.startsWith(m));
      if (!isAudioVideo) {
        throw new Error(
          `Arquivo não é áudio/vídeo: ${file.mimeType}. Apenas áudio/vídeo pode ser transcrito.`,
        );
      }

      // Verificar tamanho (>500MB)
      const fileSizeMB = (file.fileSize ?? 0) / (1024 * 1024);
      if (fileSizeMB > 500) {
        throw new Error(`Arquivo muito grande (${fileSizeMB.toFixed(0)}MB). Máximo recomendado: 500MB.`);
      }

      // 2. Obter token de acesso do Google Drive
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Não foi possível obter token de acesso do Google Drive.");
      }

      // 3. Marcar como "processing"
      await db
        .update(driveFiles)
        .set({
          enrichmentStatus: "processing",
          enrichmentError: null,
          updatedAt: new Date(),
        })
        .where(eq(driveFiles.driveFileId, input.driveFileId));

      // 4. Chamar enrichment engine ASYNC (retorna 202 Accepted em <1s)
      // O enrichment engine processa em background e atualiza o DB via Supabase
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`;

      try {
        await enrichmentClient.transcribeAsync({
          fileUrl: downloadUrl,
          fileName: file.name || "audio.mp3",
          language: input.language,
          diarize: input.diarize,
          expectedSpeakers: input.expectedSpeakers ?? null,
          authHeader: `Bearer ${accessToken}`,
          driveFileId: input.driveFileId,
          dbRecordId: file.id,
        });
      } catch (error) {
        // Se o enrichment engine estiver indisponível, marcar como failed
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "failed",
            enrichmentError: `Enrichment engine indisponível: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          })
          .where(eq(driveFiles.driveFileId, input.driveFileId));

        throw new Error(
          `Falha ao iniciar transcrição: ${error instanceof Error ? error.message : "Enrichment engine indisponível"}`,
        );
      }

      return {
        queued: true,
        driveFileId: input.driveFileId,
        message: `Transcrição de "${file.name}" iniciada em background. O status será atualizado automaticamente.`,
      };
    }),

  /**
   * Move um arquivo de uma pasta para outra no Google Drive.
   * Usado pelo workflow Protocolar para mover DOCX para subpasta correta.
   */
  moveFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      newParentId: z.string(),
      oldParentId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await moveFileInDrive(
        input.fileId,
        input.newParentId,
        input.oldParentId,
      );

      if (!result) {
        return {
          success: false,
          error: "Falha ao mover arquivo no Drive",
        };
      }

      return {
        success: true,
        file: {
          id: result.id,
          name: result.name,
          webViewLink: result.webViewLink,
          parents: result.parents,
        },
      };
    }),

  /**
   * Sugere links (processo/assistido) a partir de enrichmentData dos arquivos.
   * Lê enrichmentData e tenta match por número de processo ou nome de pessoa.
   */
  suggestLinksFromEnrichment: protectedProcedure
    .input(z.object({
      fileIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      const suggestions: Array<{
        fileId: number;
        fileName: string;
        suggestedProcessoId: number | null;
        suggestedProcessoNumero: string | null;
        suggestedAssistidoId: number | null;
        suggestedAssistidoNome: string | null;
        confidence: number;
        reason: string;
      }> = [];

      for (const fileId of input.fileIds) {
        const file = await db.query.driveFiles.findFirst({
          where: eq(driveFiles.id, fileId),
        });
        if (!file || !file.enrichmentData) continue;

        const data = file.enrichmentData as Record<string, unknown>;

        // Try to match by processo number
        if (data.numero_processo && typeof data.numero_processo === "string") {
          const processo = await db.query.processos.findFirst({
            where: and(
              eq(processos.numeroAutos, data.numero_processo),
              isNull(processos.deletedAt),
            ),
          });
          if (processo) {
            let suggestedAssistidoNome: string | null = null;
            if (processo.assistidoId) {
              const assistido = await db.query.assistidos.findFirst({
                where: eq(assistidos.id, processo.assistidoId),
                columns: { nome: true },
              });
              if (assistido) {
                suggestedAssistidoNome = assistido.nome;
              }
            }

            suggestions.push({
              fileId,
              fileName: file.name,
              suggestedProcessoId: processo.id,
              suggestedProcessoNumero: processo.numeroAutos,
              suggestedAssistidoId: processo.assistidoId,
              suggestedAssistidoNome,
              confidence: 0.9,
              reason: `Número do processo ${data.numero_processo} encontrado no documento`,
            });
            continue;
          }
        }

        // Try to match by pessoa name
        if (data.pessoa_nome && typeof data.pessoa_nome === "string") {
          const candidatos = await db
            .select({ id: assistidos.id, nome: assistidos.nome })
            .from(assistidos)
            .where(isNull(assistidos.deletedAt))
            .limit(50);

          for (const candidato of candidatos) {
            const similarity = calculateSimilarity(candidato.nome, data.pessoa_nome as string);
            if (similarity >= 0.85) {
              suggestions.push({
                fileId,
                fileName: file.name,
                suggestedProcessoId: null,
                suggestedProcessoNumero: null,
                suggestedAssistidoId: candidato.id,
                suggestedAssistidoNome: candidato.nome,
                confidence: similarity,
                reason: `Nome "${data.pessoa_nome}" similar a assistido "${candidato.nome}"`,
              });
              break;
            }
          }
        }
      }

      return suggestions;
    }),

  /**
   * Aplica sugestões de link confirmadas pelo usuário.
   * Vincula driveFiles a processos e/ou assistidos.
   */
  applyLinkSuggestions: protectedProcedure
    .input(z.object({
      suggestions: z.array(z.object({
        fileId: z.number(),
        processoId: z.number().nullable(),
        assistidoId: z.number().nullable(),
      })),
    }))
    .mutation(async ({ input }) => {
      let linked = 0;
      for (const suggestion of input.suggestions) {
        const updates: Record<string, unknown> = {};
        if (suggestion.processoId) updates.processoId = suggestion.processoId;
        if (suggestion.assistidoId) updates.assistidoId = suggestion.assistidoId;

        if (Object.keys(updates).length > 0) {
          await db.update(driveFiles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(driveFiles.id, suggestion.fileId));
          linked++;
        }
      }
      return { linked };
    }),
});
