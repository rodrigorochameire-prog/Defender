import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, driveFiles, driveSyncFolders, driveSyncLogs, driveWebhooks, users, userMicrosoftTokens } from "@/lib/db";
import { type SQL, eq, and, desc, asc, sql, isNull, or, like, not, gt, lt, inArray } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import { getDriveProvider, getProviderForFile } from "@/lib/services/drive-factory";
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
  stopChannel,
  // Auth
  getAccessToken,
  ATRIBUICAO_FOLDER_IDS,
} from "@/lib/services/google-drive";
import { inngest } from "@/lib/inngest/client";
import { getFolderIdForAtribuicao, mapAtribuicaoEnumToSimple } from "@/lib/utils/text-extraction";
import { processos, assistidos, casos, demandas, atendimentos, audiencias, driveDocumentSections, driveFileContents } from "@/lib/db/schema";
import {
  enrichmentClient,
  type TranscribeOutput,
} from "@/lib/services/enrichment-client";
import { calculateSimilarity, normalizeNameForMatch } from "@/lib/utils/name-matching";

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
   * Verifica saúde do token OAuth (se funciona, tipo de auth, email, etc.)
   */
  tokenHealth: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const token = await getAccessToken();
      if (!token) {
        return {
          status: "error" as const,
          message: "Nenhum método de autenticação funcionou",
          email: null,
          authMethod: null,
          needsReauth: true,
        };
      }

      // Test token by calling userinfo
      try {
        const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          return {
            status: "error" as const,
            message: "Token inválido ou expirado",
            email: null,
            authMethod: null,
            needsReauth: true,
          };
        }
        const data = await resp.json();

        // Check if we have a DB token
        const dbTokenResult = await db.execute(
          sql`SELECT email, updated_at FROM google_tokens ORDER BY updated_at DESC LIMIT 1`
        );
        const dbRows = dbTokenResult as unknown as Array<{ email: string; updated_at: Date }>;
        const hasDbToken = dbRows && dbRows.length > 0;

        return {
          status: "ok" as const,
          message: "Token OAuth funcionando",
          email: data.email || null,
          authMethod: hasDbToken ? "oauth_db" : "oauth_env",
          needsReauth: false,
          dbTokenDate: hasDbToken ? dbRows[0].updated_at : null,
        };
      } catch {
        return {
          status: "error" as const,
          message: "Erro ao verificar token",
          email: null,
          authMethod: null,
          needsReauth: true,
        };
      }
    }, "Erro ao verificar saúde do token");
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
  registerFolder: protectedProcedure
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
  registerAllAtribuicoes: protectedProcedure.mutation(async ({ ctx }) => {
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
   * Smart sync: scan-once + match-in-memory com dry-run
   * Substitui autoLinkAssistidosByName com algoritmo O(A+F) em vez de O(A×F)
   */
  smartSync: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
      createMissing: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");

      // 1. SCAN: List all subfolders from all 5 atribuições in parallel
      const atribuicaoKeys = Object.keys(ATRIBUICAO_FOLDER_IDS) as (keyof typeof ATRIBUICAO_FOLDER_IDS)[];

      const scanResults = await Promise.allSettled(
        atribuicaoKeys.map(async (key) => {
          const folderId = ATRIBUICAO_FOLDER_IDS[key];
          const items = await listAllItemsInFolder(folderId);
          const folders = items.filter(item => item.mimeType === "application/vnd.google-apps.folder");
          return { key, folders };
        })
      );

      // Build in-memory map of all Drive folders
      type FolderEntry = { id: string; name: string; normalizedName: string; atribuicaoKey: string };
      const folderMap: FolderEntry[] = [];
      const scanned: Array<{ atribuicao: string; folderCount: number }> = [];

      for (const result of scanResults) {
        if (result.status === "fulfilled") {
          const { key, folders } = result.value;
          scanned.push({ atribuicao: key, folderCount: folders.length });
          for (const folder of folders) {
            folderMap.push({
              id: folder.id,
              name: folder.name,
              normalizedName: normalizeName(folder.name).toLowerCase().replace(/\s+/g, " ").trim(),
              atribuicaoKey: key,
            });
          }
        } else {
          console.error(`[smartSync] Erro ao listar pastas:`, result.reason);
        }
      }

      // 2. LOAD: Get all unlinked assistidos
      const unlinkedAssistidos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(isNull(assistidos.driveFolderId));

      // 3. MATCH: For each assistido, find best matching folder in memory
      const atribToFolder: Record<string, string> = {
        JURI_CAMACARI: "JURI",
        GRUPO_JURI: "GRUPO_JURI",
        VVD_CAMACARI: "VVD",
        EXECUCAO_PENAL: "EP",
        SUBSTITUICAO: "SUBSTITUICAO",
        SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
      };

      type SyncAction = {
        assistidoId: number;
        assistidoNome: string;
        atribuicao: string;
        action: "link" | "create" | "no_atribuicao";
        folderId?: string;
        folderName?: string;
        confidence: number;
        matchType: "exact" | "first_last" | "contains" | "fuzzy" | "none";
      };

      const actions: SyncAction[] = [];

      for (const assistido of unlinkedAssistidos) {
        const atribKey = atribToFolder[assistido.atribuicaoPrimaria || ""] || null;

        if (!atribKey) {
          actions.push({
            assistidoId: assistido.id,
            assistidoNome: assistido.nome,
            atribuicao: assistido.atribuicaoPrimaria || "N/A",
            action: "no_atribuicao",
            confidence: 0,
            matchType: "none",
          });
          continue;
        }

        const nomeNorm = normalizeName(assistido.nome).toLowerCase().replace(/\s+/g, " ").trim();
        const nomeParts = nomeNorm.split(" ").filter((p: string) => p.length > 0);
        const firstName = nomeParts[0] || "";
        const lastName = nomeParts[nomeParts.length - 1] || "";

        let bestMatch: { folder: FolderEntry; confidence: number; matchType: SyncAction["matchType"] } | null = null;

        for (const folder of folderMap) {
          let confidence = 0;
          let matchType: SyncAction["matchType"] = "none";

          // a) Exact normalized match → 100%
          if (folder.normalizedName === nomeNorm) {
            confidence = 1.0;
            matchType = "exact";
          }
          // b) First + Last name match → 95%
          else {
            const folderParts = folder.normalizedName.split(" ").filter((p: string) => p.length > 0);
            const folderFirst = folderParts[0] || "";
            const folderLast = folderParts[folderParts.length - 1] || "";

            if (firstName && lastName && firstName !== lastName && folderFirst === firstName && folderLast === lastName) {
              confidence = 0.95;
              matchType = "first_last";
            }
            // c) Contains (one starts with the other, min 6 chars overlap)
            else if (
              (folder.normalizedName.startsWith(nomeNorm) || nomeNorm.startsWith(folder.normalizedName)) &&
              Math.min(folder.normalizedName.length, nomeNorm.length) > 5
            ) {
              confidence = 0.90;
              matchType = "contains";
            }
            // d) Levenshtein fuzzy >= 0.85
            else {
              const sim = calculateSimilarity(folder.normalizedName, nomeNorm);
              if (sim >= 0.85) {
                confidence = sim;
                matchType = "fuzzy";
              }
            }
          }

          // Boost if same atribuição (+0.05)
          if (confidence > 0 && folder.atribuicaoKey === atribKey) {
            confidence = Math.min(confidence + 0.05, 1.0);
          }

          if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
            bestMatch = { folder, confidence, matchType };
          }
        }

        if (bestMatch && bestMatch.confidence >= 0.85) {
          actions.push({
            assistidoId: assistido.id,
            assistidoNome: assistido.nome,
            atribuicao: atribKey,
            action: "link",
            folderId: bestMatch.folder.id,
            folderName: bestMatch.folder.name,
            confidence: Math.round(bestMatch.confidence * 100) / 100,
            matchType: bestMatch.matchType,
          });
        } else if (input.createMissing) {
          actions.push({
            assistidoId: assistido.id,
            assistidoNome: assistido.nome,
            atribuicao: atribKey,
            action: "create",
            confidence: 0,
            matchType: "none",
          });
        }
      }

      // 4. EXECUTE if not dry-run
      let executed = { linked: 0, created: 0, errors: 0 };
      if (!input.dryRun) {
        for (const action of actions) {
          try {
            if (action.action === "link" && action.folderId) {
              await db
                .update(assistidos)
                .set({ driveFolderId: action.folderId, updatedAt: new Date() })
                .where(eq(assistidos.id, action.assistidoId));
              executed.linked++;
            } else if (action.action === "create") {
              const folder = await createOrFindAssistidoFolder(action.atribuicao as "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI", action.assistidoNome);
              if (folder) {
                await db
                  .update(assistidos)
                  .set({ driveFolderId: folder.id, updatedAt: new Date() })
                  .where(eq(assistidos.id, action.assistidoId));
                action.folderId = folder.id;
                action.folderName = folder.name;
                executed.created++;
              } else {
                executed.errors++;
              }
            }
          } catch (error) {
            console.error(`[smartSync] Erro ao executar para ${action.assistidoNome}:`, error);
            executed.errors++;
          }
        }
      }

      // 5. Return
      return {
        scanned,
        actions,
        stats: {
          totalUnlinked: unlinkedAssistidos.length,
          willLink: actions.filter(a => a.action === "link").length,
          willCreate: actions.filter(a => a.action === "create").length,
          noAtribuicao: actions.filter(a => a.action === "no_atribuicao").length,
        },
        executed: input.dryRun ? null : executed,
        dryRun: input.dryRun,
      };
    }),

  /**
   * Dashboard de vínculos Drive↔Assistidos
   * Retorna stats por atribuição + contagem de pastas no Drive
   */
  syncDashboard: adminProcedure.query(async () => {
    const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");

    // 1. Get assistido counts per atribuição from DB
    const dbCounts = await db
      .select({
        atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        total: sql<number>`cast(count(*) as integer)`,
        linked: sql<number>`cast(count(${assistidos.driveFolderId}) as integer)`,
      })
      .from(assistidos)
      .groupBy(assistidos.atribuicaoPrimaria);

    // 2. Map DB enums to folder keys and aggregate
    const atribToFolder: Record<string, string> = {
      JURI_CAMACARI: "JURI",
      GRUPO_JURI: "GRUPO_JURI",
      VVD_CAMACARI: "VVD",
      EXECUCAO_PENAL: "EP",
      SUBSTITUICAO: "SUBSTITUICAO",
      SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
    };

    const atribLabels: Record<string, string> = {
      JURI: "Júri",
      VVD: "VVD",
      EP: "Exec. Penal",
      SUBSTITUICAO: "Substituição",
      GRUPO_JURI: "Grupo Júri",
    };

    const aggregated: Record<string, { linked: number; unlinked: number }> = {};
    for (const key of Object.keys(ATRIBUICAO_FOLDER_IDS)) {
      aggregated[key] = { linked: 0, unlinked: 0 };
    }

    for (const row of dbCounts) {
      const key = atribToFolder[row.atribuicaoPrimaria || ""] || null;
      if (key && aggregated[key]) {
        aggregated[key].linked += Number(row.linked);
        aggregated[key].unlinked += Number(row.total) - Number(row.linked);
      }
    }

    // 3. Scan Drive folders in parallel (5 API calls)
    const atribuicaoKeys = Object.keys(ATRIBUICAO_FOLDER_IDS) as (keyof typeof ATRIBUICAO_FOLDER_IDS)[];

    let driveFolderCounts: Record<string, number> = {};
    try {
      const scanResults = await Promise.allSettled(
        atribuicaoKeys.map(async (key) => {
          const folderId = ATRIBUICAO_FOLDER_IDS[key];
          const items = await listAllItemsInFolder(folderId);
          const folderCount = items.filter(item => item.mimeType === "application/vnd.google-apps.folder").length;
          return { key, folderCount };
        })
      );

      for (const result of scanResults) {
        if (result.status === "fulfilled") {
          driveFolderCounts[result.value.key] = result.value.folderCount;
        }
      }
    } catch (error) {
      console.error("[syncDashboard] Erro ao escanear Drive:", error);
    }

    // 4. Build response
    const byAtribuicao = atribuicaoKeys.map(key => {
      const dbData = aggregated[key] || { linked: 0, unlinked: 0 };
      const driveFolders = driveFolderCounts[key] || 0;

      return {
        key,
        label: atribLabels[key] || key,
        linked: dbData.linked,
        unlinked: dbData.unlinked,
        driveFolders,
        orphanFolders: Math.max(0, driveFolders - dbData.linked),
      };
    });

    const totalAssistidos = byAtribuicao.reduce((sum, a) => sum + a.linked + a.unlinked, 0);
    const totalLinked = byAtribuicao.reduce((sum, a) => sum + a.linked, 0);
    const totalUnlinked = byAtribuicao.reduce((sum, a) => sum + a.unlinked, 0);

    return {
      byAtribuicao,
      totals: {
        totalAssistidos,
        linked: totalLinked,
        unlinked: totalUnlinked,
        linkRate: totalAssistidos > 0 ? Math.round((totalLinked / totalAssistidos) * 100) : 0,
      },
    };
  }),

  /**
   * Diagnóstico completo: mostra near-misses entre assistidos e pastas Drive
   * Para entender POR QUE nomes não batem e o que corrigir
   */
  diagnoseOrphans: adminProcedure
    .input(z.object({
      atribuicao: z.enum(["JURI", "VVD", "EP", "SUBSTITUICAO", "GRUPO_JURI"]).optional(),
      minConfidence: z.number().default(0.4),
    }))
    .query(async ({ input }) => {
      const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");

      const atribToFolder: Record<string, string> = {
        JURI_CAMACARI: "JURI",
        GRUPO_JURI: "GRUPO_JURI",
        VVD_CAMACARI: "VVD",
        EXECUCAO_PENAL: "EP",
        SUBSTITUICAO: "SUBSTITUICAO",
        SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
      };

      // 1. SCAN Drive folders
      const keysToScan = input.atribuicao
        ? [input.atribuicao as keyof typeof ATRIBUICAO_FOLDER_IDS]
        : Object.keys(ATRIBUICAO_FOLDER_IDS) as (keyof typeof ATRIBUICAO_FOLDER_IDS)[];

      type FolderEntry = { id: string; name: string; normalizedName: string; atribuicaoKey: string };
      const drivefolders: FolderEntry[] = [];

      const scanResults = await Promise.allSettled(
        keysToScan.map(async (key) => {
          const folderId = ATRIBUICAO_FOLDER_IDS[key];
          const items = await listAllItemsInFolder(folderId);
          return { key, folders: items.filter(item => item.mimeType === "application/vnd.google-apps.folder") };
        })
      );

      for (const result of scanResults) {
        if (result.status === "fulfilled") {
          for (const folder of result.value.folders) {
            drivefolders.push({
              id: folder.id,
              name: folder.name,
              normalizedName: normalizeName(folder.name).toLowerCase().replace(/\s+/g, " ").trim(),
              atribuicaoKey: result.value.key,
            });
          }
        }
      }

      // 2. LOAD unlinked assistidos
      const unlinkedAssistidos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(isNull(assistidos.driveFolderId));

      // 3. Get IDs of folders already linked to ANY assistido
      const linkedFolderIds = new Set(
        (await db
          .select({ driveFolderId: assistidos.driveFolderId })
          .from(assistidos)
          .where(sql`${assistidos.driveFolderId} IS NOT NULL`)
        ).map(r => r.driveFolderId)
      );

      // 4. For each unlinked assistido: find TOP 3 matches (even below threshold)
      const assistidoMatches: Array<{
        assistidoId: number;
        assistidoNome: string;
        assistidoNomeNorm: string;
        atribuicao: string;
        topMatches: Array<{
          folderId: string;
          folderName: string;
          folderNameNorm: string;
          folderAtribuicao: string;
          confidence: number;
          matchType: string;
          alreadyLinked: boolean;
        }>;
      }> = [];

      for (const assistido of unlinkedAssistidos) {
        const atribKey = atribToFolder[assistido.atribuicaoPrimaria || ""] || null;
        if (!atribKey) continue;
        // If filtering by atribuicao, skip others
        if (input.atribuicao && atribKey !== input.atribuicao) continue;

        const nomeNorm = normalizeName(assistido.nome).toLowerCase().replace(/\s+/g, " ").trim();
        const nomeParts = nomeNorm.split(" ").filter((p: string) => p.length > 0);
        const firstName = nomeParts[0] || "";
        const lastName = nomeParts[nomeParts.length - 1] || "";

        const matches: Array<{
          folderId: string;
          folderName: string;
          folderNameNorm: string;
          folderAtribuicao: string;
          confidence: number;
          matchType: string;
          alreadyLinked: boolean;
        }> = [];

        for (const folder of drivefolders) {
          let confidence = 0;
          let matchType = "none";

          if (folder.normalizedName === nomeNorm) {
            confidence = 1.0;
            matchType = "exact";
          } else {
            const folderParts = folder.normalizedName.split(" ").filter((p: string) => p.length > 0);
            const folderFirst = folderParts[0] || "";
            const folderLast = folderParts[folderParts.length - 1] || "";

            if (firstName && lastName && firstName !== lastName && folderFirst === firstName && folderLast === lastName) {
              confidence = 0.95;
              matchType = "first_last";
            } else if (
              (folder.normalizedName.startsWith(nomeNorm) || nomeNorm.startsWith(folder.normalizedName)) &&
              Math.min(folder.normalizedName.length, nomeNorm.length) > 5
            ) {
              confidence = 0.90;
              matchType = "contains";
            } else {
              const sim = calculateSimilarity(folder.normalizedName, nomeNorm);
              if (sim >= input.minConfidence) {
                confidence = sim;
                matchType = "fuzzy";
              }
            }
          }

          if (folder.atribuicaoKey === atribKey && confidence > 0) {
            confidence = Math.min(confidence + 0.05, 1.0);
          }

          if (confidence >= input.minConfidence) {
            matches.push({
              folderId: folder.id,
              folderName: folder.name,
              folderNameNorm: folder.normalizedName,
              folderAtribuicao: folder.atribuicaoKey,
              confidence: Math.round(confidence * 100) / 100,
              matchType,
              alreadyLinked: linkedFolderIds.has(folder.id),
            });
          }
        }

        // Sort by confidence desc, take top 3
        matches.sort((a, b) => b.confidence - a.confidence);

        assistidoMatches.push({
          assistidoId: assistido.id,
          assistidoNome: assistido.nome,
          assistidoNomeNorm: nomeNorm,
          atribuicao: atribKey,
          topMatches: matches.slice(0, 3),
        });
      }

      // 5. Find orphan folders (not linked to any assistido)
      const orphanFolders = drivefolders
        .filter(f => !linkedFolderIds.has(f.id))
        .map(f => ({
          folderId: f.id,
          folderName: f.name,
          folderNameNorm: f.normalizedName,
          atribuicao: f.atribuicaoKey,
        }));

      // 6. Stats
      const noMatch = assistidoMatches.filter(a => a.topMatches.length === 0).length;
      const nearMiss = assistidoMatches.filter(a =>
        a.topMatches.length > 0 && a.topMatches[0].confidence < 0.85 && a.topMatches[0].confidence >= 0.5
      ).length;
      const wouldLink = assistidoMatches.filter(a =>
        a.topMatches.length > 0 && a.topMatches[0].confidence >= 0.85 && !a.topMatches[0].alreadyLinked
      ).length;

      return {
        assistidoMatches,
        orphanFolders,
        stats: {
          totalUnlinked: assistidoMatches.length,
          noMatch,
          nearMiss,
          wouldLink,
          totalOrphanFolders: orphanFolders.length,
          totalDriveFolders: drivefolders.length,
        },
      };
    }),

  /**
   * Reverse Sync on-demand: Scan atribuição folders for orphan folders
   * and create assistido records for them.
   *
   * dryRun=true: Returns preview of what would be created
   * dryRun=false: Actually creates the assistidos
   */
  detectNewFolders: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
      atribuicao: z.enum(["JURI", "VVD", "EP", "SUBSTITUICAO", "GRUPO_JURI"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { ATRIBUICAO_FOLDER_IDS, normalizeName } = await import("@/lib/utils/text-extraction");
      const { handleNewAssistidoFolder } = await import("@/lib/services/google-drive");

      // 1. Determine which atribuição folders to scan
      type AtribKey = keyof typeof ATRIBUICAO_FOLDER_IDS;
      const atribuicoes: AtribKey[] = input.atribuicao
        ? [input.atribuicao]
        : ["JURI", "VVD", "EP", "SUBSTITUICAO", "GRUPO_JURI"];

      // 2. Get all existing assistidos with driveFolderId
      const linkedAssistidos = await db
        .select({ driveFolderId: assistidos.driveFolderId })
        .from(assistidos)
        .where(and(
          not(isNull(assistidos.driveFolderId)),
          isNull(assistidos.deletedAt),
        ));
      const linkedFolderIds = new Set(linkedAssistidos.map(a => a.driveFolderId).filter(Boolean));

      // 3. Scan each atribuição folder
      const orphans: Array<{
        folderId: string;
        folderName: string;
        atribuicao: string;
        parentFolderId: string;
      }> = [];

      for (const atribKey of atribuicoes) {
        const parentFolderId = ATRIBUICAO_FOLDER_IDS[atribKey];
        const subfolders = await listAllItemsInFolder(parentFolderId);

        for (const folder of subfolders) {
          if (folder.mimeType !== "application/vnd.google-apps.folder") continue;
          if (linkedFolderIds.has(folder.id)) continue;

          orphans.push({
            folderId: folder.id,
            folderName: folder.name,
            atribuicao: atribKey,
            parentFolderId,
          });
        }
      }

      if (input.dryRun) {
        return {
          dryRun: true,
          orphanCount: orphans.length,
          orphans: orphans.map(o => ({
            folderId: o.folderId,
            folderName: o.folderName,
            atribuicao: o.atribuicao,
          })),
          results: [],
        };
      }

      // 4. Process each orphan folder
      const results = [];
      for (const orphan of orphans) {
        try {
          const result = await handleNewAssistidoFolder(
            orphan.folderId,
            orphan.folderName,
            orphan.parentFolderId
          );
          if (result) {
            results.push(result);
          }
        } catch (error) {
          results.push({
            action: "error" as const,
            folderName: orphan.folderName,
            folderId: orphan.folderId,
            atribuicao: orphan.atribuicao,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        dryRun: false,
        orphanCount: orphans.length,
        orphans: [],
        results,
      };
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
  removeFolder: protectedProcedure
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
   * Sincroniza uma pasta (usa smartSync: incremental quando possível, full na 1ª vez)
   */
  syncFolder: protectedProcedure
    .input(z.object({ folderId: z.string(), forceFullSync: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Force full sync: clear syncToken so smartSync does a complete re-scan
        if (input.forceFullSync) {
          await db
            .update(driveSyncFolders)
            .set({ syncToken: null, updatedAt: new Date() })
            .where(eq(driveSyncFolders.driveFolderId, input.folderId));
          console.log(`[Drive] Forced full re-sync for folder ${input.folderId}`);
        }
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
        limit: z.number().max(2000).default(500),
        offset: z.number().default(0),
        cursor: z.number().optional(), // Cursor-based pagination: files with id > cursor (ascending by id)
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
            return { files: [], total: 0, nextCursor: null };
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

        // When cursor is provided, use id-based pagination
        if (input.cursor) {
          conditions.push(gt(driveFiles.id, input.cursor));
        }

        const fetchLimit = input.cursor ? input.limit + 1 : input.limit;

        const files = await db
          .select()
          .from(driveFiles)
          .where(and(...conditions))
          .orderBy(...(input.cursor
            ? [asc(driveFiles.id)]
            : [desc(driveFiles.isFolder), driveFiles.name]
          ))
          .limit(fetchLimit)
          .offset(input.cursor ? 0 : input.offset); // When using cursor, ignore offset

        // Detect if there are more results
        const hasMore = input.cursor ? files.length > input.limit : false;
        if (input.cursor && files.length > input.limit) {
          files.pop(); // Remove extra detection item
        }

        const nextCursor = hasMore && files.length > 0
          ? files[files.length - 1].id
          : null;

        // Only run expensive COUNT when not using cursor pagination
        let total = 0;
        if (!input.cursor) {
          const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(driveFiles)
            .where(and(...conditions));
          total = countResult?.count || 0;
        }

        return {
          files,
          total,
          nextCursor,
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

        // Factory: resolve provider based on user preference (Google or OneDrive)
        const provider = await getDriveProvider(ctx.user.id);
        const storageFile = await provider.uploadFile(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId
        );

        // Inserir no banco local para sincronização
        await db.insert(driveFiles).values({
          driveFileId: storageFile.id,
          provider: provider.getProviderName(),
          driveFolderId: input.folderId,
          name: storageFile.name,
          mimeType: storageFile.mimeType,
          fileSize: storageFile.size ?? null,
          webViewLink: storageFile.webUrl,
          webContentLink: storageFile.downloadUrl,
          isFolder: false,
          syncStatus: "synced",
          lastSyncAt: new Date(),
          lastModifiedTime: storageFile.modifiedAt ? new Date(storageFile.modifiedAt) : new Date(),
          createdById: ctx.user.id,
        });

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: storageFile.id,
          provider: provider.getProviderName(),
          action: "upload",
          status: "success",
          details: `Arquivo ${storageFile.name} enviado`,
          userId: ctx.user.id,
        });

        return storageFile;
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
        // Factory: resolve provider from the file's own provider field
        const dbFile = await db.query.driveFiles.findFirst({
          where: eq(driveFiles.driveFileId, input.fileId),
          columns: { provider: true },
        });
        const fileProvider = (dbFile?.provider ?? "google") as "google" | "onedrive";
        const provider = await getProviderForFile(fileProvider, ctx.user.id);

        const result = await provider.renameFile(input.fileId, input.newName);

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
          provider: fileProvider,
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
        // Factory: resolve provider from the file's own provider field
        const dbFile = await db.query.driveFiles.findFirst({
          where: eq(driveFiles.driveFileId, input.fileId),
          columns: { provider: true },
        });
        const fileProvider = (dbFile?.provider ?? "google") as "google" | "onedrive";
        const provider = await getProviderForFile(fileProvider, ctx.user.id);

        await provider.deleteFile(input.fileId);

        // Remover do banco local
        await db
          .delete(driveFiles)
          .where(eq(driveFiles.driveFileId, input.fileId));

        // Log
        await db.insert(driveSyncLogs).values({
          driveFileId: input.fileId,
          provider: fileProvider,
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

        // Factory: resolve provider based on user preference (Google or OneDrive)
        // Note: preventDuplicates/updateIfExists logic is handled inside the provider
        const provider = await getDriveProvider(ctx.user.id);
        const storageFile = await provider.uploadFile(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId
        );

        // Inserir/atualizar no banco local
        const existing = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.driveFileId, storageFile.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(driveFiles).values({
            driveFileId: storageFile.id,
            provider: provider.getProviderName(),
            driveFolderId: input.folderId,
            name: storageFile.name,
            mimeType: storageFile.mimeType,
            fileSize: storageFile.size ?? null,
            webViewLink: storageFile.webUrl,
            webContentLink: storageFile.downloadUrl,
            isFolder: false,
            syncStatus: "synced",
            lastSyncAt: new Date(),
            lastModifiedTime: storageFile.modifiedAt ? new Date(storageFile.modifiedAt) : new Date(),
            createdById: ctx.user.id,
          });
        } else {
          await db
            .update(driveFiles)
            .set({
              name: storageFile.name,
              fileSize: storageFile.size ?? null,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              lastModifiedTime: storageFile.modifiedAt ? new Date(storageFile.modifiedAt) : new Date(),
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.driveFileId, storageFile.id));
        }

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: storageFile.id,
          provider: provider.getProviderName(),
          action: existing.length === 0 ? "upload" : "update",
          status: "success",
          details: `Arquivo ${storageFile.name} sincronizado`,
          userId: ctx.user.id,
        });

        return storageFile;
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

        // Factory: resolve provider based on user preference (Google or OneDrive)
        const provider = await getDriveProvider(ctx.user.id);
        const storageFile = await provider.uploadFile(
          buffer,
          input.fileName,
          input.mimeType,
          input.folderId
        );

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
          driveFileId: storageFile.id,
          provider: provider.getProviderName(),
          driveFolderId: input.folderId,
          name: storageFile.name,
          mimeType: storageFile.mimeType,
          fileSize: storageFile.size ?? null,
          webViewLink: storageFile.webUrl,
          webContentLink: storageFile.downloadUrl,
          isFolder: false,
          syncStatus: "synced",
          lastSyncAt: new Date(),
          lastModifiedTime: storageFile.modifiedAt ? new Date(storageFile.modifiedAt) : new Date(),
          createdById: ctx.user.id,
          // Vinculações
          processoId: input.processoId,
          assistidoId: assistidoId,
        });

        // Log da ação
        await db.insert(driveSyncLogs).values({
          driveFileId: storageFile.id,
          provider: provider.getProviderName(),
          action: "upload_with_link",
          status: "success",
          details: `Arquivo ${storageFile.name} enviado e vinculado (processo: ${input.processoId || 'N/A'}, assistido: ${assistidoId || 'N/A'})`,
          userId: ctx.user.id,
        });

        return storageFile;
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

      // Contagem de docs por processo (batch instead of N+1)
      let processosComDocs: Array<{ id: number; numeroAutos: string | null; driveFolderId: string | null; docCount: number }> = [];
      if (processosWithFolder.length > 0) {
        const processoIds = processosWithFolder.map((p) => p.id);
        const docCounts = await db
          .select({
            processoId: driveFiles.processoId,
            count: sql<number>`count(*)::int`,
          })
          .from(driveFiles)
          .where(
            and(
              inArray(driveFiles.processoId, processoIds),
              eq(driveFiles.isFolder, false)
            )
          )
          .groupBy(driveFiles.processoId);

        const countMap = new Map(docCounts.map((r) => [r.processoId, r.count]));
        processosComDocs = processosWithFolder.map((p) => ({
          id: p.id,
          numeroAutos: p.numeroAutos,
          driveFolderId: p.driveFolderId,
          docCount: countMap.get(p.id) || 0,
        }));
      }

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
      cursor: z.number().optional(), // Cursor-based pagination: files with id < cursor (reverse chronological)
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.assistidoId) conditions.push(eq(driveFiles.assistidoId, input.assistidoId));
      if (input.processoId) conditions.push(eq(driveFiles.processoId, input.processoId));
      if (input.enrichmentStatus) conditions.push(eq(driveFiles.enrichmentStatus, input.enrichmentStatus));
      if (input.search) conditions.push(like(driveFiles.name, `%${input.search}%`));

      // When cursor is provided, use id-based pagination (reverse chronological)
      if (input.cursor) {
        conditions.push(lt(driveFiles.id, input.cursor));
      }

      const fetchLimit = input.cursor ? input.limit + 1 : input.limit;

      const files = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          driveFolderId: driveFiles.driveFolderId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          fileSize: driveFiles.fileSize,
          webViewLink: driveFiles.webViewLink,
          webContentLink: driveFiles.webContentLink,
          thumbnailLink: driveFiles.thumbnailLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          isFolder: driveFiles.isFolder,
          parentFileId: driveFiles.parentFileId,
          processoId: driveFiles.processoId,
          assistidoId: driveFiles.assistidoId,
          documentoId: driveFiles.documentoId,
          enrichmentStatus: driveFiles.enrichmentStatus,
          enrichmentError: driveFiles.enrichmentError,
          enrichedAt: driveFiles.enrichedAt,
          categoria: driveFiles.categoria,
          documentType: driveFiles.documentType,
          createdAt: driveFiles.createdAt,
        })
        .from(driveFiles)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(input.cursor ? desc(driveFiles.id) : desc(driveFiles.lastModifiedTime))
        .limit(fetchLimit)
        .offset(input.cursor ? 0 : input.offset); // When using cursor, ignore offset

      // Detect if there are more results
      const hasMore = input.cursor ? files.length > input.limit : false;
      if (input.cursor && files.length > input.limit) {
        files.pop(); // Remove extra detection item
      }

      const nextCursor = hasMore && files.length > 0
        ? files[files.length - 1].id
        : null;

      // Only run expensive COUNT when not using cursor pagination
      let total = 0;
      if (!input.cursor) {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(driveFiles)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        total = countResult?.count || 0;
      }

      return {
        files,
        total,
        nextCursor,
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
   * Lazy-load enrichmentData for specific files.
   * Called on-demand when user opens Mídias tab or transcript viewer.
   */
  getFilesEnrichmentData: protectedProcedure
    .input(z.object({
      fileIds: z.array(z.number()).max(50),
    }))
    .query(async ({ input }) => {
      if (input.fileIds.length === 0) return [];
      return db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          enrichmentData: driveFiles.enrichmentData,
          enrichmentStatus: driveFiles.enrichmentStatus,
        })
        .from(driveFiles)
        .where(inArray(driveFiles.id, input.fileIds));
    }),

  /**
   * Lightweight status check for specific files (replaces heavy polling).
   * Returns only id + enrichmentStatus for polling during transcription.
   */
  getFileStatuses: protectedProcedure
    .input(z.object({
      driveFileIds: z.array(z.string()).max(20),
    }))
    .query(async ({ input }) => {
      if (input.driveFileIds.length === 0) return [];
      return db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          enrichmentStatus: driveFiles.enrichmentStatus,
        })
        .from(driveFiles)
        .where(inArray(driveFiles.driveFileId, input.driveFileIds));
    }),

  /**
   * Últimos arquivos modificados (global, sem filtro de pasta)
   */
  recentFiles: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(8) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 8;
      const files = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          webViewLink: driveFiles.webViewLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          documentType: driveFiles.documentType,
          driveFolderId: driveFiles.driveFolderId,
        })
        .from(driveFiles)
        .where(eq(driveFiles.isFolder, false))
        .orderBy(desc(driveFiles.lastModifiedTime))
        .limit(limit);
      return files;
    }),

  /**
   * Status de sync por pasta monitorada — usado pelo painel /admin/drive-sync
   * Retorna health per-folder (lastSyncAt, webhook, fileCount) + stats globais.
   */
  getSyncStatus: adminProcedure.query(async () => {
    const now = new Date();

    // Batch 1: pastas ativas
    const folders = await db
      .select()
      .from(driveSyncFolders)
      .where(eq(driveSyncFolders.isActive, true));

    // Batch 2: file counts por pasta (1 query com GROUP BY)
    const fileCounts = await db
      .select({
        driveFolderId: driveFiles.driveFolderId,
        count: sql<number>`count(*)::int`,
      })
      .from(driveFiles)
      .groupBy(driveFiles.driveFolderId);

    const fileCountMap = new Map(fileCounts.map((r) => [r.driveFolderId, r.count]));

    // Batch 3: webhook mais recente ativo por pasta (1 query)
    const activeWebhooks = await db
      .select({
        folderId: driveWebhooks.folderId,
        channelId: driveWebhooks.channelId,
        expiration: driveWebhooks.expiration,
      })
      .from(driveWebhooks)
      .where(and(eq(driveWebhooks.isActive, true), gt(driveWebhooks.expiration, now)))
      .orderBy(desc(driveWebhooks.expiration));

    const webhookMap = new Map<string, { channelId: string; expiration: Date }>();
    for (const w of activeWebhooks) {
      if (!webhookMap.has(w.folderId)) {
        webhookMap.set(w.folderId, { channelId: w.channelId, expiration: w.expiration! });
      }
    }

    const result = folders.map((folder) => {
      const webhook = webhookMap.get(folder.driveFolderId) ?? null;
      const syncAgoMs = folder.lastSyncAt
        ? now.getTime() - folder.lastSyncAt.getTime()
        : null;
      const syncAgoMin = syncAgoMs !== null ? Math.floor(syncAgoMs / 60000) : null;

      const health: "healthy" | "warning" | "critical" =
        !folder.lastSyncAt || syncAgoMin! > 60
          ? "critical"
          : syncAgoMin! > 15 || !webhook
          ? "warning"
          : "healthy";

      return {
        id: folder.id,
        name: folder.name,
        driveFolderId: folder.driveFolderId,
        lastSyncAt: folder.lastSyncAt,
        syncAgoMin,
        fileCount: Number(fileCountMap.get(folder.driveFolderId) ?? 0),
        hasSyncToken: !!folder.syncToken,
        health,
        activeWebhook: webhook,
      };
    });

    // Stats globais via checkSyncHealth existente
    const globalHealth = await checkSyncHealth();

    return { folders: result, global: globalHealth };
  }),

  /**
   * Força sync imediato de uma pasta específica via Inngest.
   * Usado pelo botão "Forçar sync" no painel /admin/drive-sync.
   */
  forceSyncFolder: adminProcedure
    .input(z.object({ driveFolderId: z.string() }))
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "drive/incremental-sync",
        data: { folderId: input.driveFolderId, triggerSource: "admin-force" },
      });
      return { dispatched: true };
    }),

  /**
   * Marca canais expirados como inativos no banco e tenta stopá-los no Google.
   * Usado pelo botão "Limpar canais expirados" no painel /admin/drive-sync.
   */
  cleanExpiredChannels: adminProcedure.mutation(async () => {
    const cleaned = await db
      .update(driveWebhooks)
      .set({ isActive: false })
      .where(
        and(
          eq(driveWebhooks.isActive, true),
          lt(driveWebhooks.expiration, new Date())
        )
      )
      .returning({
        channelId: driveWebhooks.channelId,
        resourceId: driveWebhooks.resourceId,
      });

    // Best-effort: tentar parar no Google (404 = já expirou, tratado como sucesso)
    for (const ch of cleaned) {
      if (ch.resourceId) {
        stopChannel(ch.channelId, ch.resourceId).catch(() => {});
      }
    }

    return { cleaned: cleaned.length };
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
   * Move um arquivo de uma pasta para outra no Drive.
   * Usado pelo workflow Protocolar para mover DOCX para subpasta correta.
   */
  moveFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      newParentId: z.string(),
      oldParentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Factory: resolve provider from the file's own provider field
      const dbFile = await db.query.driveFiles.findFirst({
        where: eq(driveFiles.driveFileId, input.fileId),
        columns: { provider: true },
      });
      const fileProvider = (dbFile?.provider ?? "google") as "google" | "onedrive";
      const provider = await getProviderForFile(fileProvider, ctx.user.id);

      try {
        const result = await provider.moveFile(input.fileId, input.newParentId);

        // Atualizar pasta no banco local
        await db
          .update(driveFiles)
          .set({ driveFolderId: input.newParentId, updatedAt: new Date(), lastSyncAt: new Date() })
          .where(eq(driveFiles.driveFileId, input.fileId));

        return {
          success: true,
          file: {
            id: result.id,
            name: result.name,
            webViewLink: result.webUrl,
          },
        };
      } catch {
        return {
          success: false,
          error: "Falha ao mover arquivo no Drive",
        };
      }
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

      if (input.fileIds.length === 0) return suggestions;

      // Batch fetch all files at once instead of N+1
      const files = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          enrichmentData: driveFiles.enrichmentData,
        })
        .from(driveFiles)
        .where(inArray(driveFiles.id, input.fileIds));

      // Collect unique processo numbers and pessoa names for batch lookup
      const processoNumbers: string[] = [];
      const filesWithData: Array<{ id: number; name: string; data: Record<string, unknown> }> = [];

      for (const file of files) {
        if (!file.enrichmentData) continue;
        const data = file.enrichmentData as Record<string, unknown>;
        filesWithData.push({ id: file.id, name: file.name, data });
        if (data.numero_processo && typeof data.numero_processo === "string") {
          processoNumbers.push(data.numero_processo);
        }
      }

      // Batch fetch processos by number
      const matchedProcessos = processoNumbers.length > 0
        ? await db
            .select({
              id: processos.id,
              numeroAutos: processos.numeroAutos,
              assistidoId: processos.assistidoId,
            })
            .from(processos)
            .where(and(inArray(processos.numeroAutos, processoNumbers), isNull(processos.deletedAt)))
        : [];
      const processoMap = new Map(matchedProcessos.map((p) => [p.numeroAutos, p]));

      // Batch fetch assistido names for matched processos
      const assistidoIds = matchedProcessos
        .map((p) => p.assistidoId)
        .filter((id): id is number => id !== null);
      const matchedAssistidos = assistidoIds.length > 0
        ? await db
            .select({ id: assistidos.id, nome: assistidos.nome })
            .from(assistidos)
            .where(inArray(assistidos.id, assistidoIds))
        : [];
      const assistidoMap = new Map(matchedAssistidos.map((a) => [a.id, a.nome]));

      // Fetch candidatos once for name matching (instead of per-file)
      const needsNameMatch = filesWithData.some(
        (f) => f.data.pessoa_nome && typeof f.data.pessoa_nome === "string" && !processoMap.has(f.data.numero_processo as string)
      );
      const candidatos = needsNameMatch
        ? await db
            .select({ id: assistidos.id, nome: assistidos.nome })
            .from(assistidos)
            .where(isNull(assistidos.deletedAt))
            .limit(50)
        : [];

      for (const { id: fileId, name: fileName, data } of filesWithData) {
        // Try match by processo number
        if (data.numero_processo && typeof data.numero_processo === "string") {
          const processo = processoMap.get(data.numero_processo);
          if (processo) {
            suggestions.push({
              fileId,
              fileName,
              suggestedProcessoId: processo.id,
              suggestedProcessoNumero: processo.numeroAutos,
              suggestedAssistidoId: processo.assistidoId,
              suggestedAssistidoNome: processo.assistidoId ? assistidoMap.get(processo.assistidoId) ?? null : null,
              confidence: 0.9,
              reason: `Número do processo ${data.numero_processo} encontrado no documento`,
            });
            continue;
          }
        }

        // Try match by pessoa name
        if (data.pessoa_nome && typeof data.pessoa_nome === "string") {
          for (const candidato of candidatos) {
            const similarity = calculateSimilarity(candidato.nome, data.pessoa_nome as string);
            if (similarity >= 0.85) {
              suggestions.push({
                fileId,
                fileName,
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

  /**
   * Backfill: criar pastas Drive para todos os assistidos que ainda não possuem.
   * Processa em batches de 10 com delay de 1s entre batches para respeitar rate limits.
   */
  backfillAssistidoFolders: protectedProcedure
    .mutation(async () => {
      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google Drive not configured" });
      }

      // Fetch all assistidos without drive folder
      const missing = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          atribuicao: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(isNull(assistidos.driveFolderId))
        .orderBy(assistidos.id);

      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches of 10
      for (let i = 0; i < missing.length; i += 10) {
        const batch = missing.slice(i, i + 10);
        for (const a of batch) {
          try {
            if (!a.atribuicao) {
              errors.push(`${a.id} ${a.nome}: sem atribuicao`);
              failed++;
              continue;
            }
            const folderKey = mapAtribuicaoToFolderKey(a.atribuicao);
            if (!folderKey) {
              errors.push(`${a.id} ${a.nome}: atribuicao ${a.atribuicao} sem mapping`);
              failed++;
              continue;
            }
            const folder = await createOrFindAssistidoFolder(folderKey, a.nome);
            if (folder) {
              await db.update(assistidos).set({
                driveFolderId: folder.id,
                updatedAt: new Date(),
              }).where(eq(assistidos.id, a.id));
              created++;
            } else {
              errors.push(`${a.id} ${a.nome}: createOrFindAssistidoFolder retornou null`);
              failed++;
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${a.id} ${a.nome}: ${msg}`);
            failed++;
          }
        }
        // Small delay between batches to respect rate limits
        if (i + 10 < missing.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      return { total: missing.length, created, failed, errors: errors.slice(0, 20) };
    }),

  // ==========================================
  // SISTEMA NERVOSO VIVO — QUERIES
  // ==========================================

  /**
   * Timeline de atos processuais para um processo.
   * Combina driveDocumentSections + driveFiles para gerar timeline cronologica.
   * Inclui midias com status de transcricao.
   */
  timelineByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      // 1. Get all driveFiles linked to this processo
      const files = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          webViewLink: driveFiles.webViewLink,
          webContentLink: driveFiles.webContentLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          documentType: driveFiles.documentType,
          isFolder: driveFiles.isFolder,
        })
        .from(driveFiles)
        .where(and(
          eq(driveFiles.processoId, input.processoId),
          eq(driveFiles.isFolder, false),
        ))
        .orderBy(desc(driveFiles.lastModifiedTime));

      if (files.length === 0) return { events: [], stats: { total: 0, enriched: 0, media: 0 } };

      const fileIds = files.map(f => f.id);

      // 2. Get document sections for these files
      const sections = await db
        .select({
          id: driveDocumentSections.id,
          driveFileId: driveDocumentSections.driveFileId,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
          metadata: driveDocumentSections.metadata,
          confianca: driveDocumentSections.confianca,
        })
        .from(driveDocumentSections)
        .where(inArray(driveDocumentSections.driveFileId, fileIds))
        .orderBy(driveDocumentSections.paginaInicio);

      // 3. Build timeline events
      type TimelineEvent = {
        id: string;
        tipo: string;
        titulo: string;
        data: string | null;
        resumo: string | null;
        fileId: number;
        fileName: string;
        webViewLink: string | null;
        webContentLink: string | null;
        mimeType: string | null;
        isMedia: boolean;
        enrichmentStatus: string | null;
        paginaInicio?: number;
        paginaFim?: number;
        confianca?: number;
        metadata?: Record<string, unknown> | null;
      };

      const events: TimelineEvent[] = [];

      // Group sections by file
      const sectionsByFile = new Map<number, typeof sections>();
      for (const s of sections) {
        const existing = sectionsByFile.get(s.driveFileId) || [];
        existing.push(s);
        sectionsByFile.set(s.driveFileId, existing);
      }

      for (const file of files) {
        const fileSections = sectionsByFile.get(file.id);
        const isMedia = !!(file.mimeType?.startsWith("audio/") || file.mimeType?.startsWith("video/"));

        if (fileSections && fileSections.length > 0) {
          // File has classified sections — create event per section
          for (const section of fileSections) {
            const datasExtraidas = (section.metadata as Record<string, unknown>)?.datasExtraidas as string[] | undefined;
            events.push({
              id: `section-${section.id}`,
              tipo: section.tipo,
              titulo: section.titulo,
              data: datasExtraidas?.[0] || (file.lastModifiedTime ? new Date(file.lastModifiedTime).toISOString() : null),
              resumo: section.resumo,
              fileId: file.id,
              fileName: file.name,
              webViewLink: file.webViewLink,
              webContentLink: file.webContentLink,
              mimeType: file.mimeType,
              isMedia,
              enrichmentStatus: file.enrichmentStatus,
              paginaInicio: section.paginaInicio,
              paginaFim: section.paginaFim,
              confianca: section.confianca ?? undefined,
              metadata: section.metadata as Record<string, unknown> | null,
            });
          }
        } else {
          // No sections — create event from file metadata
          events.push({
            id: `file-${file.id}`,
            tipo: isMedia ? "midia" : (file.documentType || "documento"),
            titulo: file.name,
            data: file.lastModifiedTime ? new Date(file.lastModifiedTime).toISOString() : null,
            resumo: null,
            fileId: file.id,
            fileName: file.name,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            mimeType: file.mimeType,
            isMedia,
            enrichmentStatus: file.enrichmentStatus,
          });
        }
      }

      // Sort by date (newest first), nulls last
      events.sort((a, b) => {
        if (!a.data && !b.data) return 0;
        if (!a.data) return 1;
        if (!b.data) return -1;
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      });

      return {
        events,
        stats: {
          total: files.length,
          enriched: files.filter(f => f.enrichmentStatus === "completed").length,
          media: files.filter(f => f.mimeType?.startsWith("audio/") || f.mimeType?.startsWith("video/")).length,
        },
      };
    }),

  /**
   * Timeline consolidada para um assistido (todos os processos).
   * Retorna eventos de todos os processos com seções classificadas e arquivos brutos.
   */
  timelineByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      // Get assistido's processos (via many-to-many + legacy direct FK)
      const assistidoProcessos = await db
        .select({ id: processos.id, numeroAutos: processos.numeroAutos })
        .from(processos)
        .where(or(
          eq(processos.assistidoId, input.assistidoId),
          sql`${processos.id} IN (SELECT processo_id FROM assistidos_processos WHERE assistido_id = ${input.assistidoId})`,
        ));

      if (assistidoProcessos.length === 0) return { processos: [], stats: { totalEvents: 0, totalProcessos: 0 } };

      const processoIds = assistidoProcessos.map(p => p.id);
      const processoMap = new Map(assistidoProcessos.map(p => [p.id, p.numeroAutos]));

      // Get files from all processos
      const files = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          webViewLink: driveFiles.webViewLink,
          webContentLink: driveFiles.webContentLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          documentType: driveFiles.documentType,
          processoId: driveFiles.processoId,
        })
        .from(driveFiles)
        .where(and(
          inArray(driveFiles.processoId, processoIds),
          eq(driveFiles.isFolder, false),
        ))
        .orderBy(desc(driveFiles.lastModifiedTime));

      if (files.length === 0) return { processos: [], stats: { totalEvents: 0, totalProcessos: assistidoProcessos.length } };

      const fileIds = files.map(f => f.id);

      // Get document sections
      const sections = await db
        .select({
          id: driveDocumentSections.id,
          driveFileId: driveDocumentSections.driveFileId,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          resumo: driveDocumentSections.resumo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          metadata: driveDocumentSections.metadata,
          confianca: driveDocumentSections.confianca,
        })
        .from(driveDocumentSections)
        .where(inArray(driveDocumentSections.driveFileId, fileIds));

      const sectionsByFile = new Map<number, typeof sections>();
      for (const s of sections) {
        const existing = sectionsByFile.get(s.driveFileId) || [];
        existing.push(s);
        sectionsByFile.set(s.driveFileId, existing);
      }

      // Build events grouped by processo
      type TimelineEvent = {
        id: string;
        tipo: string;
        titulo: string;
        data: string | null;
        resumo: string | null;
        fileId: number;
        fileName: string;
        webViewLink: string | null;
        webContentLink: string | null;
        mimeType: string | null;
        isMedia: boolean;
        enrichmentStatus: string | null;
      };

      const processoGroups: { processoId: number; numeroAutos: string; events: TimelineEvent[] }[] = [];

      for (const pId of processoIds) {
        const processoFiles = files.filter(f => f.processoId === pId);
        const events: TimelineEvent[] = [];

        for (const file of processoFiles) {
          const fileSections = sectionsByFile.get(file.id);
          const isMedia = !!(file.mimeType?.startsWith("audio/") || file.mimeType?.startsWith("video/"));

          if (fileSections && fileSections.length > 0) {
            for (const section of fileSections) {
              const datasExtraidas = (section.metadata as Record<string, unknown>)?.datasExtraidas as string[] | undefined;
              events.push({
                id: `section-${section.id}`,
                tipo: section.tipo,
                titulo: section.titulo,
                data: datasExtraidas?.[0] || (file.lastModifiedTime ? new Date(file.lastModifiedTime).toISOString() : null),
                resumo: section.resumo,
                fileId: file.id,
                fileName: file.name,
                webViewLink: file.webViewLink,
                webContentLink: file.webContentLink,
                mimeType: file.mimeType,
                isMedia,
                enrichmentStatus: file.enrichmentStatus,
              });
            }
          } else {
            events.push({
              id: `file-${file.id}`,
              tipo: isMedia ? "midia" : (file.documentType || "documento"),
              titulo: file.name,
              data: file.lastModifiedTime ? new Date(file.lastModifiedTime).toISOString() : null,
              resumo: null,
              fileId: file.id,
              fileName: file.name,
              webViewLink: file.webViewLink,
              webContentLink: file.webContentLink,
              mimeType: file.mimeType,
              isMedia,
              enrichmentStatus: file.enrichmentStatus,
            });
          }
        }

        events.sort((a, b) => {
          if (!a.data && !b.data) return 0;
          if (!a.data) return 1;
          if (!b.data) return -1;
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        });

        if (events.length > 0) {
          processoGroups.push({
            processoId: pId,
            numeroAutos: processoMap.get(pId) || `Processo #${pId}`,
            events,
          });
        }
      }

      return {
        processos: processoGroups,
        stats: {
          totalEvents: processoGroups.reduce((sum, g) => sum + g.events.length, 0),
          totalProcessos: processoGroups.length,
        },
      };
    }),

  /**
   * Midias agrupadas por processo para um assistido.
   * Retorna audio/video files com enrichmentData (transcricao, analise).
   */
  midiasByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      // Get all media files linked to this assistido's folder
      const [assistido] = await db
        .select({ driveFolderId: assistidos.driveFolderId })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido?.driveFolderId) return { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } };

      // Get media files
      const mediaFiles = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          webViewLink: driveFiles.webViewLink,
          webContentLink: driveFiles.webContentLink,
          lastModifiedTime: driveFiles.lastModifiedTime,
          enrichmentStatus: driveFiles.enrichmentStatus,
          enrichmentData: driveFiles.enrichmentData,
          documentType: driveFiles.documentType,
          processoId: driveFiles.processoId,
          fileSize: driveFiles.fileSize,
        })
        .from(driveFiles)
        .where(and(
          eq(driveFiles.driveFolderId, assistido.driveFolderId),
          eq(driveFiles.isFolder, false),
          or(
            sql`${driveFiles.mimeType} LIKE 'audio/%'`,
            sql`${driveFiles.mimeType} LIKE 'video/%'`,
            eq(driveFiles.documentType, "transcricao_plaud"),
          ),
        ))
        .orderBy(desc(driveFiles.lastModifiedTime));

      // Get processo names for grouping
      const processoIds = [...new Set(mediaFiles.filter(f => f.processoId).map(f => f.processoId!))];
      const processoNames = processoIds.length > 0
        ? await db
            .select({ id: processos.id, numeroAutos: processos.numeroAutos })
            .from(processos)
            .where(inArray(processos.id, processoIds))
        : [];

      const processoMap = new Map(processoNames.map(p => [p.id, p.numeroAutos]));

      // Group by processo
      type MediaFile = typeof mediaFiles[number] & {
        hasTranscript: boolean;
        hasAnalysis: boolean;
        transcript_plain?: string;
        summary?: string;
        speakers?: unknown[];
        analysisHighlights?: {
          pontosFavoraveis?: number;
          pontosDesfavoraveis?: number;
          contradicoes?: number;
        };
      };

      const enrichMedia = (file: typeof mediaFiles[number]): MediaFile => {
        const ed = file.enrichmentData as Record<string, unknown> | null;
        const analysis = ed?.analysis as Record<string, unknown> | null;
        return {
          ...file,
          hasTranscript: !!(ed?.transcript || ed?.transcript_plain),
          hasAnalysis: !!analysis,
          transcript_plain: (ed?.transcript_plain as string) || undefined,
          summary: (ed?.summary as string) || (analysis?.resumo_defesa as string) || undefined,
          speakers: (ed?.speakers as unknown[]) || undefined,
          analysisHighlights: analysis ? {
            pontosFavoraveis: (analysis.pontos_favoraveis as unknown[])?.length || 0,
            pontosDesfavoraveis: (analysis.pontos_desfavoraveis as unknown[])?.length || 0,
            contradicoes: (analysis.contradicoes as unknown[])?.length || 0,
          } : undefined,
        };
      };

      const grouped = new Map<number, MediaFile[]>();
      const ungrouped: MediaFile[] = [];

      for (const file of mediaFiles) {
        const enriched = enrichMedia(file);
        if (file.processoId) {
          const existing = grouped.get(file.processoId) || [];
          existing.push(enriched);
          grouped.set(file.processoId, existing);
        } else {
          ungrouped.push(enriched);
        }
      }

      const processoGroups = Array.from(grouped.entries()).map(([pId, files]) => ({
        processoId: pId,
        numeroAutos: processoMap.get(pId) || `Processo #${pId}`,
        files,
      }));

      const transcribed = mediaFiles.filter(f => {
        const ed = f.enrichmentData as Record<string, unknown> | null;
        return !!(ed?.transcript || ed?.transcript_plain);
      }).length;
      const analyzed = mediaFiles.filter(f => {
        const ed = f.enrichmentData as Record<string, unknown> | null;
        return !!(ed?.analysis);
      }).length;

      return {
        processos: processoGroups,
        ungrouped: ungrouped,
        stats: {
          total: mediaFiles.length,
          transcribed,
          analyzed,
        },
      };
    }),

  // ============================================
  // PIPELINE COMPLETO: DRIVE ↔ ASSISTIDO
  // ============================================

  /**
   * Pipeline completo de sincronização Drive↔Assistido.
   *
   * 1. Garante que assistido tem driveFolderId (match por nome ou cria pasta)
   * 2. Registra pasta em drive_sync_folders (upsert)
   * 3. Sincroniza conteúdo (smartSync: incremental ou full)
   * 4. Vincula arquivos ao assistido (bulk SET assistidoId)
   * 5. Auto-link processos por subpastas com número de autos
   */
  fullSyncAssistido: protectedProcedure
    .input(z.object({
      assistidoId: z.number(),
      createMissing: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { normalizeName } = await import("@/lib/utils/text-extraction");

      const result = {
        steps: [] as string[],
        folderLinked: false,
        folderCreated: false,
        folderId: null as string | null,
        syncResult: null as { filesAdded: number; filesUpdated: number; filesRemoved: number } | null,
        filesLinkedToAssistido: 0,
        processosLinked: 0,
        errors: [] as string[],
      };

      // ──── 1. Garantir driveFolderId ────
      const [assistido] = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          driveFolderId: assistidos.driveFolderId,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        throw Errors.notFound("Assistido não encontrado");
      }

      let folderId = assistido.driveFolderId;

      if (!folderId) {
        // Tentar match por nome nas pastas-raiz do Drive
        const folderKey = mapAtribuicaoToFolderKey(assistido.atribuicaoPrimaria || "SUBSTITUICAO");

        if (folderKey) {
          const { ATRIBUICAO_FOLDER_IDS } = await import("@/lib/utils/text-extraction");
          const rootFolderId = ATRIBUICAO_FOLDER_IDS[folderKey as keyof typeof ATRIBUICAO_FOLDER_IDS];

          if (rootFolderId) {
            // Listar subpastas da atribuição e tentar match
            try {
              const items = await listAllItemsInFolder(rootFolderId);
              const folders = items.filter(item => item.mimeType === "application/vnd.google-apps.folder");

              const nomeNorm = normalizeName(assistido.nome).toLowerCase().replace(/\s+/g, " ").trim();

              let bestMatch: { id: string; name: string; confidence: number } | null = null;

              for (const folder of folders) {
                const folderNorm = normalizeName(folder.name).toLowerCase().replace(/\s+/g, " ").trim();

                if (folderNorm === nomeNorm) {
                  bestMatch = { id: folder.id, name: folder.name, confidence: 1.0 };
                  break;
                }

                const sim = calculateSimilarity(folderNorm, nomeNorm);
                if (sim >= 0.85 && (!bestMatch || sim > bestMatch.confidence)) {
                  bestMatch = { id: folder.id, name: folder.name, confidence: sim };
                }
              }

              if (bestMatch) {
                folderId = bestMatch.id;
                await db
                  .update(assistidos)
                  .set({ driveFolderId: folderId, updatedAt: new Date() })
                  .where(eq(assistidos.id, input.assistidoId));
                result.folderLinked = true;
                result.steps.push(`Pasta encontrada: "${bestMatch.name}" (${Math.round(bestMatch.confidence * 100)}%)`);
              }
            } catch (err) {
              result.errors.push(`Erro ao buscar pastas: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }

        // Se ainda não tem folder e createMissing=true, criar
        if (!folderId && input.createMissing) {
          const folderKey2 = mapAtribuicaoToFolderKey(assistido.atribuicaoPrimaria || "SUBSTITUICAO");
          if (folderKey2) {
            try {
              const folder = await createOrFindAssistidoFolder(
                folderKey2 as "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI",
                assistido.nome
              );
              if (folder) {
                folderId = folder.id;
                await db
                  .update(assistidos)
                  .set({ driveFolderId: folderId, updatedAt: new Date() })
                  .where(eq(assistidos.id, input.assistidoId));
                result.folderCreated = true;
                result.steps.push(`Pasta criada: "${folder.name}"`);
              }
            } catch (err) {
              result.errors.push(`Erro ao criar pasta: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }

        if (!folderId) {
          result.steps.push("Nenhuma pasta encontrada no Drive");
          return result;
        }
      } else {
        result.steps.push("Pasta já vinculada");
      }

      result.folderId = folderId;

      // ──── 2. Registrar em drive_sync_folders (upsert) ────
      try {
        await db
          .insert(driveSyncFolders)
          .values({
            name: assistido.nome,
            driveFolderId: folderId,
            driveFolderUrl: `https://drive.google.com/drive/folders/${folderId}`,
            description: `Pasta do assistido ${assistido.nome}`,
            syncDirection: "drive_to_app",
            isActive: true,
            createdById: ctx.user.id,
          })
          .onConflictDoUpdate({
            target: driveSyncFolders.driveFolderId,
            set: {
              name: assistido.nome,
              isActive: true,
              updatedAt: new Date(),
            },
          });
        result.steps.push("Pasta registrada para sync");
      } catch (err) {
        result.errors.push(`Erro ao registrar sync folder: ${err instanceof Error ? err.message : String(err)}`);
        return result;
      }

      // ──── 3. Sincronizar conteúdo do Drive ────
      try {
        const syncRes = await smartSync(folderId, ctx.user.id);
        result.syncResult = {
          filesAdded: syncRes.filesAdded,
          filesUpdated: syncRes.filesUpdated,
          filesRemoved: syncRes.filesRemoved,
        };
        result.steps.push(`Sync: +${syncRes.filesAdded} novos, ${syncRes.filesUpdated} atualizados`);
      } catch (err) {
        result.errors.push(`Erro no sync: ${err instanceof Error ? err.message : String(err)}`);
        // Continue — arquivos já existentes podem ser vinculados
      }

      // ──── 4. Vincular arquivos ao assistido (bulk) ────
      try {
        const updateResult = await db
          .update(driveFiles)
          .set({ assistidoId: input.assistidoId, updatedAt: new Date() })
          .where(
            and(
              eq(driveFiles.driveFolderId, folderId),
              isNull(driveFiles.assistidoId)
            )
          )
          .returning({ id: driveFiles.id });

        result.filesLinkedToAssistido = updateResult.length;
        if (updateResult.length > 0) {
          result.steps.push(`${updateResult.length} arquivos vinculados ao assistido`);
        }
      } catch (err) {
        result.errors.push(`Erro ao vincular arquivos: ${err instanceof Error ? err.message : String(err)}`);
      }

      // ──── 5. Auto-link processos por subpastas ────
      try {
        // Buscar processos do assistido
        const assistidoProcessos = await db
          .select({ id: processos.id, numeroAutos: processos.numeroAutos, driveFolderId: processos.driveFolderId })
          .from(processos)
          .where(eq(processos.assistidoId, input.assistidoId));

        if (assistidoProcessos.length > 0) {
          // Buscar subpastas do assistido que são pastas
          const subfolders = await db
            .select({ id: driveFiles.id, name: driveFiles.name, driveFileId: driveFiles.driveFileId })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.driveFolderId, folderId),
                eq(driveFiles.isFolder, true)
              )
            );

          const PROCESSO_REGEX = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;

          for (const subfolder of subfolders) {
            const match = subfolder.name?.match(PROCESSO_REGEX);
            if (!match) continue;

            const numAutos = match[1];
            const processo = assistidoProcessos.find(p => p.numeroAutos === numAutos);
            if (!processo) continue;

            // Vincular processo à subpasta se ainda não tem
            if (!processo.driveFolderId && subfolder.driveFileId) {
              await db
                .update(processos)
                .set({
                  driveFolderId: subfolder.driveFileId,
                  linkDrive: `https://drive.google.com/drive/folders/${subfolder.driveFileId}`,
                  updatedAt: new Date()
                })
                .where(eq(processos.id, processo.id));
            }

            // Vincular arquivos dentro da subpasta ao processo
            const linked = await db
              .update(driveFiles)
              .set({ processoId: processo.id, assistidoId: input.assistidoId, updatedAt: new Date() })
              .where(
                and(
                  eq(driveFiles.parentFileId, subfolder.id),
                  isNull(driveFiles.processoId)
                )
              )
              .returning({ id: driveFiles.id });

            if (linked.length > 0) {
              result.processosLinked++;
              result.steps.push(`Processo ${numAutos}: ${linked.length} arquivos vinculados`);
            }
          }
        }
      } catch (err) {
        result.errors.push(`Erro ao vincular processos: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Log
      await db.insert(driveSyncLogs).values({
        driveFileId: null,
        action: "full_sync_assistido",
        status: result.errors.length === 0 ? "success" : "failed",
        details: JSON.stringify({
          assistidoId: input.assistidoId,
          steps: result.steps,
          errors: result.errors,
          filesLinked: result.filesLinkedToAssistido,
          processosLinked: result.processosLinked,
        }),
        userId: ctx.user.id,
      });

      return result;
    }),

  /**
   * Batch sync: sincroniza todos os assistidos com driveFolderId
   * que ainda não têm arquivos em drive_files.
   * Usado pelo scheduled task periódico.
   */
  batchSyncPending: adminProcedure
    .input(z.object({
      limit: z.number().max(50).default(10),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar assistidos com driveFolderId que não têm nenhum arquivo no drive_files
      const assistidosWithFolder = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(
          and(
            sql`${assistidos.driveFolderId} IS NOT NULL`,
            isNull(assistidos.deletedAt)
          )
        );

      // Filtrar os que NÃO têm arquivos em drive_files
      const pending: typeof assistidosWithFolder = [];

      if (assistidosWithFolder.length > 0) {
        const withFiles = await db
          .select({
            assistidoId: driveFiles.assistidoId,
            count: sql<number>`count(*)::int`,
          })
          .from(driveFiles)
          .where(
            and(
              inArray(driveFiles.assistidoId, assistidosWithFolder.map(a => a.id)),
              eq(driveFiles.isFolder, false)
            )
          )
          .groupBy(driveFiles.assistidoId);

        const hasFilesSet = new Set(withFiles.map(w => w.assistidoId));

        for (const a of assistidosWithFolder) {
          if (!hasFilesSet.has(a.id)) {
            pending.push(a);
          }
        }
      }

      const batch = pending.slice(0, input.limit);

      if (input.dryRun) {
        return {
          totalWithFolder: assistidosWithFolder.length,
          totalPending: pending.length,
          batch: batch.map(a => ({ id: a.id, nome: a.nome })),
          dryRun: true,
          results: [],
        };
      }

      // Executar fullSync para cada assistido do batch
      const results: Array<{ assistidoId: number; nome: string; success: boolean; filesLinked: number; error?: string }> = [];

      for (const assistido of batch) {
        try {
          // Registrar sync folder (upsert)
          await db
            .insert(driveSyncFolders)
            .values({
              name: assistido.nome,
              driveFolderId: assistido.driveFolderId!,
              driveFolderUrl: `https://drive.google.com/drive/folders/${assistido.driveFolderId}`,
              description: `Batch sync - ${assistido.nome}`,
              syncDirection: "drive_to_app",
              isActive: true,
              createdById: ctx.user.id,
            })
            .onConflictDoUpdate({
              target: driveSyncFolders.driveFolderId,
              set: { isActive: true, updatedAt: new Date() },
            });

          // Sync conteúdo
          const syncRes = await smartSync(assistido.driveFolderId!, ctx.user.id);

          // Vincular arquivos ao assistido
          const linked = await db
            .update(driveFiles)
            .set({ assistidoId: assistido.id, updatedAt: new Date() })
            .where(
              and(
                eq(driveFiles.driveFolderId, assistido.driveFolderId!),
                isNull(driveFiles.assistidoId)
              )
            )
            .returning({ id: driveFiles.id });

          results.push({
            assistidoId: assistido.id,
            nome: assistido.nome,
            success: syncRes.success,
            filesLinked: linked.length,
          });
        } catch (err) {
          results.push({
            assistidoId: assistido.id,
            nome: assistido.nome,
            success: false,
            filesLinked: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Log batch
      await db.insert(driveSyncLogs).values({
        driveFileId: null,
        action: "batch_sync_pending",
        status: "success",
        details: JSON.stringify({
          totalProcessed: results.length,
          successful: results.filter(r => r.success).length,
          totalFilesLinked: results.reduce((sum, r) => sum + r.filesLinked, 0),
        }),
        userId: ctx.user.id,
      });

      return {
        totalWithFolder: assistidosWithFolder.length,
        totalPending: pending.length,
        batch: batch.map(a => ({ id: a.id, nome: a.nome })),
        dryRun: false,
        results,
      };
    }),

  /**
   * Obtém a pasta do Drive para uma demanda específica (somente leitura).
   *
   * Hierarquia: Atribuição → Assistido → Processo (se >1 processo no assistido)
   * Retorna folderId, folderUrl e lista de arquivos na pasta.
   */
  getDemandaFolder: protectedProcedure
    .input(z.object({ demandaId: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        // 1. Buscar demanda com assistido + processo
        const [demanda] = await db
          .select({
            id: demandas.id,
            assistidoId: demandas.assistidoId,
            processoId: demandas.processoId,
          })
          .from(demandas)
          .where(eq(demandas.id, parseInt(input.demandaId)))
          .limit(1);

        if (!demanda) {
          throw new Error("Demanda não encontrada");
        }

        const [assistido] = await db
          .select({
            id: assistidos.id,
            nome: assistidos.nome,
            atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
            driveFolderId: assistidos.driveFolderId,
          })
          .from(assistidos)
          .where(eq(assistidos.id, demanda.assistidoId))
          .limit(1);

        if (!assistido) {
          throw new Error("Assistido não encontrado");
        }

        // 2. Verificar se Drive está configurado
        if (!isGoogleDriveConfigured()) {
          return {
            configured: false as const,
            folderId: null as string | null,
            folderUrl: null as string | null,
            files: [] as Array<{ id: string; name: string; mimeType: string; size: number | null; modifiedTime: string | undefined; webViewLink: string | undefined }>,
            assistidoNome: assistido.nome,
            assistidoHasFolder: !!assistido.driveFolderId,
          };
        }

        // 3. Determinar a pasta alvo
        let targetFolderId: string | null = assistido.driveFolderId || null;

        if (demanda.processoId) {
          const [processo] = await db
            .select({ id: processos.id, numeroAutos: processos.numeroAutos, driveFolderId: processos.driveFolderId })
            .from(processos)
            .where(eq(processos.id, demanda.processoId))
            .limit(1);

          if (processo?.driveFolderId) {
            // O processo já tem pasta vinculada — usar ela
            targetFolderId = processo.driveFolderId;
          }
          // Caso contrário, arquivos ficam na pasta do assistido (single-processo)
        }

        if (!targetFolderId) {
          return {
            configured: true as const,
            folderId: null as string | null,
            folderUrl: null as string | null,
            files: [] as Array<{ id: string; name: string; mimeType: string; size: number | null; modifiedTime: string | undefined; webViewLink: string | undefined }>,
            assistidoNome: assistido.nome,
            assistidoHasFolder: false,
          };
        }

        // 4. Listar arquivos na pasta alvo
        const { files } = await listFilesInFolder(targetFolderId, undefined, 50);

        const fileList = files
          .filter(f => f.mimeType !== "application/vnd.google-apps.folder")
          .map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size ? parseInt(f.size) : null,
            modifiedTime: f.modifiedTime,
            webViewLink: f.webViewLink,
          }));

        return {
          configured: true as const,
          folderId: targetFolderId,
          folderUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
          files: fileList,
          assistidoNome: assistido.nome,
          assistidoHasFolder: !!assistido.driveFolderId,
        };
      }, "Erro ao obter pasta da demanda no Drive");
    }),

  /**
   * Cria (ou encontra) a pasta do Drive para uma demanda.
   * Hierarquia: Atribuição → Assistido → Processo (se >1 processo)
   */
  createDemandaFolder: protectedProcedure
    .input(z.object({ demandaId: z.string() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [demanda] = await db
          .select({
            id: demandas.id,
            assistidoId: demandas.assistidoId,
            processoId: demandas.processoId,
          })
          .from(demandas)
          .where(eq(demandas.id, parseInt(input.demandaId)))
          .limit(1);

        if (!demanda) throw new Error("Demanda não encontrada");

        const [assistido] = await db
          .select({
            id: assistidos.id,
            nome: assistidos.nome,
            atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
            driveFolderId: assistidos.driveFolderId,
          })
          .from(assistidos)
          .where(eq(assistidos.id, demanda.assistidoId))
          .limit(1);

        if (!assistido) throw new Error("Assistido não encontrado");
        if (!isGoogleDriveConfigured()) throw new Error("Google Drive não configurado");

        const atribMap: Record<string, "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI"> = {
          JURI_CAMACARI: "JURI",
          GRUPO_JURI: "GRUPO_JURI",
          VVD_CAMACARI: "VVD",
          EXECUCAO_PENAL: "EP",
          SUBSTITUICAO: "SUBSTITUICAO",
          SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
        };

        // Garantir que o assistido tem uma pasta
        let assistidoFolderId = assistido.driveFolderId;
        if (!assistidoFolderId) {
          const atribKey = atribMap[assistido.atribuicaoPrimaria || ""] || null;
          if (!atribKey) throw new Error("Atribuição do assistido não mapeável para pasta do Drive");

          const aFolder = await createOrFindAssistidoFolder(atribKey, assistido.nome);
          if (!aFolder) throw new Error("Falha ao criar pasta do assistido no Drive");

          assistidoFolderId = aFolder.id;
          await db.update(assistidos).set({ driveFolderId: aFolder.id, updatedAt: new Date() }).where(eq(assistidos.id, assistido.id));
        }

        let targetFolderId = assistidoFolderId;

        // Verificar se precisa de subpasta de processo
        if (demanda.processoId) {
          const [processo] = await db
            .select({ id: processos.id, numeroAutos: processos.numeroAutos, driveFolderId: processos.driveFolderId })
            .from(processos)
            .where(eq(processos.id, demanda.processoId))
            .limit(1);

          if (processo) {
            if (processo.driveFolderId) {
              targetFolderId = processo.driveFolderId;
            } else {
              // Contar processos: se >1, criar subpasta
              const [{ count }] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(processos)
                .where(and(eq(processos.assistidoId, demanda.assistidoId), isNull(processos.deletedAt)));

              if (count > 1) {
                const pFolder = await createOrFindProcessoFolder(assistidoFolderId, processo.numeroAutos);
                if (pFolder) {
                  targetFolderId = pFolder.id;
                  await db.update(processos).set({ driveFolderId: pFolder.id }).where(eq(processos.id, processo.id));
                }
              }
            }
          }
        }

        return {
          folderId: targetFolderId,
          folderUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
        };
      }, "Erro ao criar pasta da demanda no Drive");
    }),

  /**
   * Transcrever em batch todos os arquivos de áudio/vídeo pendentes de uma pasta.
   * Para cada arquivo elegível, enfileira a transcrição de forma assíncrona
   * (igual ao `transcreverDrive` individual) e retorna um resumo.
   */
  transcribeAll: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        parentDriveFileId: z.string().optional(),
        language: z.string().default("pt"),
        diarize: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const audioVideoMimes = ["audio/", "video/", "application/ogg"];

      // Resolver parentFileId quando estamos numa subpasta
      let parentFileId: number | null | undefined = undefined;
      if (input.parentDriveFileId) {
        const [parentFolder] = await db
          .select({ id: driveFiles.id })
          .from(driveFiles)
          .where(eq(driveFiles.driveFileId, input.parentDriveFileId))
          .limit(1);
        parentFileId = parentFolder ? parentFolder.id : null;
      }

      // Buscar todos os arquivos de áudio/vídeo da pasta que NÃO estão completos
      const baseConditions = [
        eq(driveFiles.driveFolderId, input.folderId),
        eq(driveFiles.isFolder, false),
      ];

      if (parentFileId !== undefined) {
        if (parentFileId === null) {
          baseConditions.push(isNull(driveFiles.parentFileId));
        } else {
          baseConditions.push(eq(driveFiles.parentFileId, parentFileId));
        }
      }

      const candidates = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          fileSize: driveFiles.fileSize,
          driveFileId: driveFiles.driveFileId,
          enrichmentStatus: driveFiles.enrichmentStatus,
        })
        .from(driveFiles)
        .where(and(...baseConditions));

      // Filtrar apenas áudio/vídeo e excluir já concluídos ou em processamento
      const eligible = candidates.filter((f) => {
        const isMedia = audioVideoMimes.some((m) => f.mimeType?.startsWith(m));
        const isPending =
          f.enrichmentStatus !== "completed" &&
          f.enrichmentStatus !== "processing";
        const notTooBig = (f.fileSize ?? 0) / (1024 * 1024) <= 500;
        return isMedia && isPending && notTooBig;
      });

      if (eligible.length === 0) {
        return { enqueued: 0, skipped: candidates.length, fileIds: [] };
      }

      // Obter token de acesso uma única vez para todos os arquivos
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível obter token de acesso do Google Drive.",
        });
      }

      const enqueuedIds: number[] = [];
      let skipped = candidates.length - eligible.length;

      for (const file of eligible) {
        try {
          // Marcar como processing
          await db
            .update(driveFiles)
            .set({ enrichmentStatus: "processing", enrichmentError: null, updatedAt: new Date() })
            .where(eq(driveFiles.driveFileId, file.driveFileId));

          const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`;

          await enrichmentClient.transcribeAsync({
            fileUrl: downloadUrl,
            fileName: file.name || "audio.mp3",
            language: input.language,
            diarize: input.diarize,
            expectedSpeakers: null,
            authHeader: `Bearer ${accessToken}`,
            driveFileId: file.driveFileId,
            dbRecordId: file.id,
          });

          enqueuedIds.push(file.id);
        } catch {
          // Reverter status se falhou ao enfileirar
          await db
            .update(driveFiles)
            .set({
              enrichmentStatus: "failed",
              enrichmentError: "Falha ao enfileirar transcrição em batch",
            })
            .where(eq(driveFiles.driveFileId, file.driveFileId));
          skipped++;
        }
      }

      return { enqueued: enqueuedIds.length, skipped, fileIds: enqueuedIds };
    }),

  /**
   * Sugere uma pasta do Drive não vinculada para um assistido com base na similaridade de nome
   */
  getSuggestedFolderForAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      // 1. Busca o assistido
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: { nome: true, atribuicaoPrimaria: true },
      });

      if (!assistido?.atribuicaoPrimaria || !assistido.nome) return null;

      // 2. Obtém o Drive folder ID da pasta raiz da atribuição
      const atribuicao = assistido.atribuicaoPrimaria as keyof typeof ATRIBUICAO_FOLDER_IDS;
      if (!(atribuicao in ATRIBUICAO_FOLDER_IDS)) return null;
      const rootFolderId = getFolderIdForAtribuicao(atribuicao);

      // 3. Busca pastas não vinculadas dentro dessa raiz
      const candidates = await db
        .select({
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          webViewLink: driveFiles.webViewLink,
          fileCount: sql<number>`(
            SELECT COUNT(*) FROM drive_files cf
            WHERE cf.drive_folder_id = ${driveFiles.driveFileId}
          )`.mapWith(Number),
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.isFolder, true),
            isNull(driveFiles.assistidoId),
            eq(driveFiles.driveFolderId, rootFolderId)
          )
        );

      if (candidates.length === 0) return null;

      // 4. Calcula scores e retorna o melhor >= 0.8
      const normalizedTarget = normalizeNameForMatch(assistido.nome);
      let best: (typeof candidates[0] & { score: number }) | null = null;

      for (const c of candidates) {
        const score = calculateSimilarity(
          normalizeNameForMatch(c.name ?? ""),
          normalizedTarget
        );
        if (score >= 0.8 && (!best || score > best.score)) {
          best = { ...c, score };
        }
      }

      return best;
    }),

  /**
   * Lista pastas do Drive não vinculadas, opcionalmente filtradas pela atribuição
   */
  listUnlinkedFoldersByAtribuicao: protectedProcedure
    .input(
      z.object({
        atribuicaoPrimaria: z.string().nullable(),
      })
    )
    .query(async ({ input }) => {
      let rootFolderId: string | null = null;
      if (input.atribuicaoPrimaria) {
        try {
          const atribuicaoSimple = mapAtribuicaoEnumToSimple(input.atribuicaoPrimaria);
          rootFolderId = getFolderIdForAtribuicao(atribuicaoSimple);
        } catch {
          // Se não conseguir mapear, ignora filtro de atribuição
        }
      }

      const whereConditions: SQL[] = [
        eq(driveFiles.isFolder, true),
        isNull(driveFiles.assistidoId),
      ];

      if (rootFolderId) {
        whereConditions.push(eq(driveFiles.driveFolderId, rootFolderId));
      }

      return db
        .select({
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          webViewLink: driveFiles.webViewLink,
          driveFolderId: driveFiles.driveFolderId,
        })
        .from(driveFiles)
        .where(and(...whereConditions))
        .orderBy(driveFiles.name);
    }),

  backfillAssistidoLinks: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .mutation(async ({ input }) => {
      // 1. Busca assistidos sem pasta vinculada
      const unlinked = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(isNull(assistidos.driveFolderId))
        .limit(input.limit + 1); // +1 para saber se hasMore

      const hasMore = unlinked.length > input.limit;
      const batch = unlinked.slice(0, input.limit);

      let linked = 0;
      let skipped = 0;
      let errors = 0;

      for (const assistido of batch) {
        try {
          if (!assistido.atribuicaoPrimaria || !assistido.nome) {
            skipped++;
            continue;
          }

          // Mapeia enum do banco (JURI_CAMACARI, VVD_CAMACARI, etc.) para chave do Drive (JURI, VVD, etc.)
          const atribuicaoSimple = mapAtribuicaoEnumToSimple(assistido.atribuicaoPrimaria);
          const rootFolderId = getFolderIdForAtribuicao(atribuicaoSimple);
          const normalizedTarget = normalizeNameForMatch(assistido.nome);

          // Executa dentro de uma transação para evitar race conditions
          const wasLinked = await db.transaction(async (tx) => {
            // Busca pastas não vinculadas na pasta raiz da atribuição (dentro da tx)
            const candidates = await tx
              .select({ driveFileId: driveFiles.driveFileId, name: driveFiles.name })
              .from(driveFiles)
              .where(
                and(
                  eq(driveFiles.isFolder, true),
                  isNull(driveFiles.assistidoId),
                  eq(driveFiles.driveFolderId, rootFolderId)
                )
              );

            // Procura match exato normalizado
            let matchedFolder = candidates.find(
              (c) => normalizeNameForMatch(c.name ?? "") === normalizedTarget
            );

            // Fallback: fuzzy match com similaridade >= 0.85
            if (!matchedFolder) {
              let bestSim = 0;
              for (const c of candidates) {
                const sim = calculateSimilarity(
                  normalizeNameForMatch(c.name ?? ""),
                  normalizedTarget
                );
                if (sim > bestSim && sim >= 0.85) {
                  bestSim = sim;
                  matchedFolder = c;
                }
              }
            }

            if (!matchedFolder) return false;

            await tx
              .update(assistidos)
              .set({ driveFolderId: matchedFolder.driveFileId, updatedAt: new Date() })
              .where(eq(assistidos.id, assistido.id));

            await tx
              .update(driveFiles)
              .set({ assistidoId: assistido.id, updatedAt: new Date() })
              .where(eq(driveFiles.driveFileId, matchedFolder.driveFileId));

            await tx
              .update(driveFiles)
              .set({ assistidoId: assistido.id, updatedAt: new Date() })
              .where(
                and(
                  eq(driveFiles.driveFolderId, matchedFolder.driveFileId),
                  isNull(driveFiles.assistidoId)
                )
              );

            return true;
          });

          if (wasLinked) {
            linked++;
          } else {
            skipped++;
          }
        } catch {
          errors++;
        }
      }

      return { linked, skipped, errors, hasMore };
    }),

  /**
   * Part A: Links drive_files rows to assistidos that already have drive_folder_id set.
   *
   * Problem: 347 assistidos have drive_folder_id but their corresponding drive_files
   * rows don't have assistido_id set. This mutation fixes that reverse linkage.
   *
   * For each assistido with drive_folder_id:
   * 1. Sets assistido_id on the folder's drive_files row
   * 2. Sets assistido_id on ALL children (files inside that folder)
   * 3. Recursively links sub-folder contents too
   */
  linkDriveFilesToAssistidos: protectedProcedure
    .input(z.object({ dryRun: z.boolean().default(false) }).default({}))
    .mutation(async ({ input }) => {
      // 1. Busca todos os assistidos que já têm pasta vinculada
      const withFolder = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(sql`${assistidos.driveFolderId} IS NOT NULL`);

      let linkedFolders = 0;
      let linkedFiles = 0;
      let alreadyLinked = 0;
      let missingFolders = 0;
      let errors = 0;

      for (const assistido of withFolder) {
        try {
          if (!assistido.driveFolderId) continue;

          if (input.dryRun) {
            // Em dry run, apenas conta quantos seriam afetados
            const [folderRow] = await db
              .select({ driveFileId: driveFiles.driveFileId, assistidoId: driveFiles.assistidoId })
              .from(driveFiles)
              .where(eq(driveFiles.driveFileId, assistido.driveFolderId))
              .limit(1);

            if (!folderRow) {
              missingFolders++;
              continue;
            }

            if (folderRow.assistidoId === assistido.id) {
              alreadyLinked++;
            } else {
              linkedFolders++;
            }

            // Conta filhos não linkados (diretos e recursivos)
            const [childCount] = await db
              .select({ count: sql<number>`count(*)` })
              .from(driveFiles)
              .where(
                and(
                  eq(driveFiles.driveFolderId, assistido.driveFolderId),
                  or(
                    isNull(driveFiles.assistidoId),
                    sql`${driveFiles.assistidoId} != ${assistido.id}`
                  )
                )
              );

            linkedFiles += Number(childCount?.count ?? 0);
            continue;
          }

          // 2. Atualiza a pasta raiz do assistido
          const folderResult = await db
            .update(driveFiles)
            .set({ assistidoId: assistido.id, updatedAt: new Date() })
            .where(
              and(
                eq(driveFiles.driveFileId, assistido.driveFolderId),
                or(
                  isNull(driveFiles.assistidoId),
                  sql`${driveFiles.assistidoId} != ${assistido.id}`
                )
              )
            );

          const folderUpdated = (folderResult as unknown as { rowCount?: number }).rowCount ?? 0;
          if (folderUpdated > 0) {
            linkedFolders++;
          } else {
            // Verifica se a pasta existe
            const [exists] = await db
              .select({ driveFileId: driveFiles.driveFileId })
              .from(driveFiles)
              .where(eq(driveFiles.driveFileId, assistido.driveFolderId))
              .limit(1);

            if (!exists) {
              missingFolders++;
            } else {
              alreadyLinked++;
            }
          }

          // 3. Atualiza todos os filhos diretos da pasta
          const childResult = await db
            .update(driveFiles)
            .set({ assistidoId: assistido.id, updatedAt: new Date() })
            .where(
              and(
                eq(driveFiles.driveFolderId, assistido.driveFolderId),
                or(
                  isNull(driveFiles.assistidoId),
                  sql`${driveFiles.assistidoId} != ${assistido.id}`
                )
              )
            );

          linkedFiles += (childResult as unknown as { rowCount?: number }).rowCount ?? 0;

          // 4. Recursivamente linka sub-pastas e seus conteúdos
          // Busca sub-pastas dentro da pasta do assistido
          const subFolders = await db
            .select({ driveFileId: driveFiles.driveFileId })
            .from(driveFiles)
            .where(
              and(
                eq(driveFiles.driveFolderId, assistido.driveFolderId),
                eq(driveFiles.isFolder, true)
              )
            );

          for (const subFolder of subFolders) {
            const subResult = await db
              .update(driveFiles)
              .set({ assistidoId: assistido.id, updatedAt: new Date() })
              .where(
                and(
                  eq(driveFiles.driveFolderId, subFolder.driveFileId),
                  or(
                    isNull(driveFiles.assistidoId),
                    sql`${driveFiles.assistidoId} != ${assistido.id}`
                  )
                )
              );

            linkedFiles += (subResult as unknown as { rowCount?: number }).rowCount ?? 0;
          }
        } catch {
          errors++;
        }
      }

      return {
        totalAssistidos: withFolder.length,
        linkedFolders,
        linkedFiles,
        alreadyLinked,
        missingFolders,
        errors,
        dryRun: input.dryRun,
      };
    }),

  // ============================================
  // ONEDRIVE / STORAGE PROVIDER
  // ============================================

  /**
   * Obtém status da conexão Microsoft / OneDrive
   */
  getMicrosoftStatus: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const token = await db.query.userMicrosoftTokens.findFirst({
        where: eq(userMicrosoftTokens.userId, ctx.user.id),
        columns: { email: true, displayName: true },
      });
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { microsoftLinked: true, storageProvider: true, googleLinked: true },
      });
      return {
        connected: !!token,
        email: token?.email ?? null,
        displayName: token?.displayName ?? null,
        storageProvider: (user as any)?.storageProvider ?? "google",
        googleLinked: user?.googleLinked ?? false,
      };
    }, "Erro ao obter status Microsoft");
  }),

  /**
   * Atualiza o provider de armazenamento ativo (google | onedrive)
   */
  updateStorageProvider: protectedProcedure
    .input(z.object({ provider: z.enum(["google", "onedrive"]) }))
    .mutation(async ({ input, ctx }) => {
      return safeAsync(async () => {
        await db.update(users).set({ storageProvider: input.provider }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }, "Erro ao atualizar provider de armazenamento");
    }),

  /**
   * Desconecta a conta Microsoft / OneDrive
   */
  disconnectMicrosoft: protectedProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      await db.delete(userMicrosoftTokens).where(eq(userMicrosoftTokens.userId, ctx.user.id));
      await db.update(users).set({
        microsoftLinked: false,
        storageProvider: "google",
        onedriveRootFolderId: null,
      }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }, "Erro ao desconectar Microsoft");
  }),

  /**
   * Indexa a árvore do Drive no drive_file_index — Estratégia A (path-based).
   *
   * Walk 3 níveis: syncFolder → assistido folders → processo folders → arquivos.
   * Match nome → assistidos.nome (ilike), número → processos.numero_autos.
   * Upsert em drive_file_index com link_strategy = 'path'.
   *
   * Job longo (~2500 arquivos típico): roda em background.
   */
  indexDriveTree: protectedProcedure.mutation(async ({ ctx }) => {
    return safeAsync(async () => {
      const { listAllItemsInFolder, getSyncFolders } = await import("@/lib/services/google-drive");
      const syncFolders = await getSyncFolders();

      if (!syncFolders.length) {
        return { indexed: 0, linked: 0, errors: 0, message: "Nenhuma pasta de sincronização configurada" };
      }

      // Load all assistidos + processos for matching
      const allAssistidos = await db
        .select({ id: assistidos.id, nome: assistidos.nome })
        .from(assistidos)
        .where(isNull(assistidos.deletedAt));
      const allProcessos = await db
        .select({ id: processos.id, numeroAutos: processos.numeroAutos })
        .from(processos);

      // Name → id map (normalized: uppercase, trimmed)
      const assistidoMap = new Map<string, number>();
      for (const a of allAssistidos) {
        if (a.nome) assistidoMap.set(a.nome.toUpperCase().trim(), a.id);
      }
      // Processo number → id map
      const processoMap = new Map<string, number>();
      for (const p of allProcessos) {
        if (p.numeroAutos) processoMap.set(p.numeroAutos.trim(), p.id);
      }

      let indexed = 0;
      let linked = 0;
      let errors = 0;

      for (const sf of syncFolders) {
        const atribuicaoLabel = sf.atribuicao || sf.label || "desconhecida";
        console.log(`[DriveIndex] Walking sync folder: ${atribuicaoLabel} (${sf.driveFolderId})`);

        try {
          // Level 1: assistido folders
          const level1Items = await listAllItemsInFolder(sf.driveFolderId);
          const assistidoFolders = level1Items.filter(
            (f: any) => f.mimeType === "application/vnd.google-apps.folder",
          );

          for (const assistidoFolder of assistidoFolders) {
            const assistidoName = assistidoFolder.name?.toUpperCase().trim() ?? "";
            const matchedAssistidoId = assistidoMap.get(assistidoName) ?? null;

            // Level 2: processo folders inside assistido
            let level2Items: any[] = [];
            try {
              level2Items = await listAllItemsInFolder(assistidoFolder.id);
            } catch (e) {
              errors++;
              continue;
            }

            const processoFolders = level2Items.filter(
              (f: any) => f.mimeType === "application/vnd.google-apps.folder",
            );
            const looseFiles = level2Items.filter(
              (f: any) => f.mimeType !== "application/vnd.google-apps.folder",
            );

            // Index loose files at assistido level
            for (const file of looseFiles) {
              const path = `${atribuicaoLabel}/${assistidoFolder.name}/${file.name}`;
              try {
                await db.execute(sql`
                  INSERT INTO drive_file_index (drive_file_id, drive_path, file_name, mime_type, size_bytes, modified_time, assistido_id, processo_id, link_strategy, link_confidence, workspace_id, defensor_id, last_seen_at)
                  VALUES (${file.id}, ${path}, ${file.name}, ${file.mimeType}, ${file.size ? Number(file.size) : null}, ${file.modifiedTime ?? null}, ${matchedAssistidoId}, ${null}, ${matchedAssistidoId ? "path" : "pending"}, ${matchedAssistidoId ? 1.0 : null}, ${ctx.user.workspaceId ?? 1}, ${ctx.user.id}, ${new Date().toISOString()})
                  ON CONFLICT (drive_file_id) DO UPDATE SET
                    drive_path = EXCLUDED.drive_path,
                    file_name = EXCLUDED.file_name,
                    mime_type = EXCLUDED.mime_type,
                    size_bytes = EXCLUDED.size_bytes,
                    modified_time = EXCLUDED.modified_time,
                    assistido_id = EXCLUDED.assistido_id,
                    link_strategy = EXCLUDED.link_strategy,
                    link_confidence = EXCLUDED.link_confidence,
                    last_seen_at = EXCLUDED.last_seen_at
                `);
                indexed++;
                if (matchedAssistidoId) linked++;
              } catch (e: any) {
                if (errors < 3) console.error(`[DriveIndex] INSERT error (loose):`, e?.message ?? e);
                errors++;
              }
            }

            // Level 3: files inside processo folders
            for (const processoFolder of processoFolders) {
              const processoNum = processoFolder.name?.trim() ?? "";
              const matchedProcessoId = processoMap.get(processoNum) ?? null;

              let level3Items: any[] = [];
              try {
                level3Items = await listAllItemsInFolder(processoFolder.id);
              } catch (e) {
                errors++;
                continue;
              }

              const files = level3Items.filter(
                (f: any) => f.mimeType !== "application/vnd.google-apps.folder",
              );

              for (const file of files) {
                const path = `${atribuicaoLabel}/${assistidoFolder.name}/${processoFolder.name}/${file.name}`;
                const hasMatch = !!(matchedAssistidoId || matchedProcessoId);
                try {
                  await db.execute(sql`
                    INSERT INTO drive_file_index (drive_file_id, drive_path, file_name, mime_type, size_bytes, modified_time, assistido_id, processo_id, link_strategy, link_confidence, workspace_id, defensor_id, last_seen_at)
                    VALUES (${file.id}, ${path}, ${file.name}, ${file.mimeType}, ${file.size ? Number(file.size) : null}, ${file.modifiedTime ?? null}, ${matchedAssistidoId}, ${matchedProcessoId}, ${hasMatch ? "path" : "pending"}, ${hasMatch ? 1.0 : null}, ${ctx.user.workspaceId ?? 1}, ${ctx.user.id}, ${new Date().toISOString()})
                    ON CONFLICT (drive_file_id) DO UPDATE SET
                      drive_path = EXCLUDED.drive_path,
                      file_name = EXCLUDED.file_name,
                      mime_type = EXCLUDED.mime_type,
                      size_bytes = EXCLUDED.size_bytes,
                      modified_time = EXCLUDED.modified_time,
                      assistido_id = COALESCE(EXCLUDED.assistido_id, drive_file_index.assistido_id),
                      processo_id = COALESCE(EXCLUDED.processo_id, drive_file_index.processo_id),
                      link_strategy = CASE WHEN EXCLUDED.assistido_id IS NOT NULL OR EXCLUDED.processo_id IS NOT NULL THEN 'path' ELSE drive_file_index.link_strategy END,
                      link_confidence = COALESCE(EXCLUDED.link_confidence, drive_file_index.link_confidence),
                      last_seen_at = EXCLUDED.last_seen_at
                  `);
                  indexed++;
                  if (hasMatch) linked++;
                } catch (e: any) {
                  if (errors < 3) console.error(`[DriveIndex] INSERT error:`, e?.message ?? e);
                  errors++;
                }
              }
            }
          }
        } catch (e) {
          console.error(`[DriveIndex] Error walking ${atribuicaoLabel}:`, e);
          errors++;
        }
      }

      console.log(`[DriveIndex] Done: ${indexed} indexed, ${linked} linked, ${errors} errors`);
      return { indexed, linked, errors };
    }, "Erro ao indexar árvore do Drive");
  }),

  /**
   * Estratégia B — vincula arquivos pendentes via regex + nome.
   *
   * Cascata de 3 estratégias (executadas em um único batch SQL cada):
   * 1. CNJ regex: extrai número de processo do path/nome → match processos → infere assistido
   * 2. Nome de pasta: segmento do path → ILIKE assistidos.nome (case-insensitive)
   * 3. Resultado: atualiza drive_file_index com strategy='regex', confidence 0.60-0.95
   */
  linkPendingFiles: protectedProcedure.mutation(async () => {
    return safeAsync(async () => {
      // === ETAPA 1: CNJ regex → match processos ===
      const cnjResult = await db.execute(sql.raw(`
        WITH cnj_extracts AS (
          SELECT
            dfi.id AS file_id,
            (regexp_matches(dfi.drive_path || '/' || dfi.file_name, '(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})'))[1] AS cnj
          FROM drive_file_index dfi
          WHERE dfi.link_strategy = 'pending'
            AND (dfi.drive_path || '/' || dfi.file_name) ~ '\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}'
        )
        UPDATE drive_file_index dfi
        SET
          processo_id = p.id,
          assistido_id = COALESCE(ap.assistido_id, dfi.assistido_id),
          link_strategy = 'regex',
          link_confidence = 0.95
        FROM cnj_extracts ce
        JOIN processos p ON p.numero_autos = ce.cnj
        LEFT JOIN LATERAL (
          SELECT assistido_id FROM assistidos_processos
          WHERE processo_id = p.id AND is_principal = true
          LIMIT 1
        ) ap ON true
        WHERE dfi.id = ce.file_id
          AND dfi.link_strategy = 'pending'
      `));

      // Count CNJ-linked
      const cnjLinked = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy = 'regex' AND link_confidence = 0.95`),
      );
      const cnjCount = Number((cnjLinked as any)[0]?.n ?? 0);

      // === ETAPA 2: Nome de pasta → match assistidos ===
      // Para cada pending, extrai o 2º segmento do path (após "desconhecida/")
      // e tenta match case-insensitive contra assistidos.nome
      const nameResult = await db.execute(sql.raw(`
        WITH path_names AS (
          SELECT
            dfi.id AS file_id,
            split_part(dfi.drive_path, '/', 2) AS folder_name
          FROM drive_file_index dfi
          WHERE dfi.link_strategy = 'pending'
            AND split_part(dfi.drive_path, '/', 2) != ''
            AND split_part(dfi.drive_path, '/', 2) NOT IN (
              'Dias Davila', 'Processos - Candeias', 'Processos - Camaçari',
              'Processos - Salvador', 'Processos - Lauro de Freitas',
              'Distribuicao', 'Jurisprudencia', 'desconhecida'
            )
            AND length(split_part(dfi.drive_path, '/', 2)) > 3
        )
        UPDATE drive_file_index dfi
        SET
          assistido_id = a.id,
          link_strategy = 'regex',
          link_confidence = 0.80
        FROM path_names pn
        JOIN assistidos a ON UPPER(a.nome) = UPPER(pn.folder_name)
        WHERE dfi.id = pn.file_id
          AND dfi.link_strategy = 'pending'
      `));

      // Count name-linked
      const nameLinked = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy = 'regex' AND link_confidence = 0.80`),
      );
      const nameCount = Number((nameLinked as any)[0]?.n ?? 0);

      // === ETAPA 3: Nome em subpasta (nível 3) — para "desconhecida/Comarca/Nome/..." ===
      await db.execute(sql.raw(`
        WITH deep_names AS (
          SELECT
            dfi.id AS file_id,
            split_part(dfi.drive_path, '/', 3) AS folder_name
          FROM drive_file_index dfi
          WHERE dfi.link_strategy = 'pending'
            AND array_length(string_to_array(dfi.drive_path, '/'), 1) >= 4
            AND length(split_part(dfi.drive_path, '/', 3)) > 3
        )
        UPDATE drive_file_index dfi
        SET
          assistido_id = a.id,
          link_strategy = 'regex',
          link_confidence = 0.70
        FROM deep_names dn
        JOIN assistidos a ON UPPER(a.nome) = UPPER(dn.folder_name)
        WHERE dfi.id = dn.file_id
          AND dfi.link_strategy = 'pending'
      `));

      const deepLinked = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy = 'regex' AND link_confidence = 0.70`),
      );
      const deepCount = Number((deepLinked as any)[0]?.n ?? 0);

      // Final stats
      const totalLinked = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy != 'pending'`),
      );
      const remaining = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy = 'pending'`),
      );

      const result = {
        cnjLinked: cnjCount,
        nameLinked: nameCount,
        deepNameLinked: deepCount,
        totalLinked: Number((totalLinked as any)[0]?.n ?? 0),
        remaining: Number((remaining as any)[0]?.n ?? 0),
      };

      console.log(`[DriveLink] Strategy B done:`, result);
      return result;
    }, "Erro ao vincular arquivos pendentes");
  }),

  /**
   * Estratégia C — fuzzy/unaccent matching + nome no filename.
   * Roda DEPOIS de linkPendingFiles (B). Usa:
   * 1. unaccent + ILIKE no path nível 2 e 3 (pega acentos diferentes)
   * 2. Nome completo do assistido dentro do filename (ILIKE '%nome%')
   * 3. pg_trgm similarity para matches parciais (threshold 0.4)
   */
  linkPendingAdvanced: protectedProcedure.mutation(async () => {
    return safeAsync(async () => {
      let totalLinked = 0;

      // === 1. Unaccent path matching (nível 2) ===
      const r1 = await db.execute(sql.raw(`
        WITH path_names AS (
          SELECT dfi.id AS file_id,
            split_part(dfi.drive_path, '/', 2) AS folder_name
          FROM drive_file_index dfi
          WHERE dfi.link_strategy = 'pending'
            AND length(split_part(dfi.drive_path, '/', 2)) > 3
        )
        UPDATE drive_file_index dfi SET
          assistido_id = a.id,
          link_strategy = 'regex',
          link_confidence = 0.75
        FROM path_names pn
        JOIN assistidos a ON unaccent(UPPER(a.nome)) = unaccent(UPPER(pn.folder_name))
        WHERE dfi.id = pn.file_id AND dfi.link_strategy = 'pending'
      `));

      // === 2. Unaccent path matching (nível 3) ===
      await db.execute(sql.raw(`
        WITH deep_names AS (
          SELECT dfi.id AS file_id,
            split_part(dfi.drive_path, '/', 3) AS folder_name
          FROM drive_file_index dfi
          WHERE dfi.link_strategy = 'pending'
            AND array_length(string_to_array(dfi.drive_path, '/'), 1) >= 4
            AND length(split_part(dfi.drive_path, '/', 3)) > 3
        )
        UPDATE drive_file_index dfi SET
          assistido_id = a.id,
          link_strategy = 'regex',
          link_confidence = 0.65
        FROM deep_names dn
        JOIN assistidos a ON unaccent(UPPER(a.nome)) = unaccent(UPPER(dn.folder_name))
        WHERE dfi.id = dn.file_id AND dfi.link_strategy = 'pending'
      `));

      // === 3. Full name in filename (ILIKE) ===
      // Matches "DOC. - CAROLINE PEREIRA DA SILVA JESUS.pdf" → assistido "Caroline Pereira da Silva Jesus"
      await db.execute(sql.raw(`
        UPDATE drive_file_index dfi SET
          assistido_id = matched.aid,
          link_strategy = 'regex',
          link_confidence = 0.60
        FROM (
          SELECT DISTINCT ON (dfi2.id) dfi2.id AS fid, a.id AS aid
          FROM drive_file_index dfi2
          CROSS JOIN assistidos a
          WHERE dfi2.link_strategy = 'pending'
            AND a.deleted_at IS NULL
            AND length(a.nome) > 8
            AND unaccent(UPPER(dfi2.file_name)) LIKE '%' || unaccent(UPPER(a.nome)) || '%'
          ORDER BY dfi2.id, length(a.nome) DESC
        ) matched
        WHERE dfi.id = matched.fid AND dfi.link_strategy = 'pending'
      `));

      // === 4. pg_trgm similarity on path segment ===
      // Only match if similarity > 0.5 (strong partial match)
      await db.execute(sql.raw(`
        UPDATE drive_file_index dfi SET
          assistido_id = matched.aid,
          link_strategy = 'regex',
          link_confidence = 0.50
        FROM (
          SELECT DISTINCT ON (dfi2.id) dfi2.id AS fid, a.id AS aid,
            similarity(unaccent(UPPER(split_part(dfi2.drive_path, '/', 2))), unaccent(UPPER(a.nome))) AS sim
          FROM drive_file_index dfi2
          CROSS JOIN assistidos a
          WHERE dfi2.link_strategy = 'pending'
            AND a.deleted_at IS NULL
            AND length(split_part(dfi2.drive_path, '/', 2)) > 5
            AND length(a.nome) > 5
            AND similarity(unaccent(UPPER(split_part(dfi2.drive_path, '/', 2))), unaccent(UPPER(a.nome))) > 0.5
          ORDER BY dfi2.id, sim DESC
        ) matched
        WHERE dfi.id = matched.fid AND dfi.link_strategy = 'pending'
      `));

      // Final counts
      const stats = await db.execute(sql.raw(`
        SELECT link_strategy, link_confidence::text AS conf, count(*)::int AS n
        FROM drive_file_index
        GROUP BY link_strategy, link_confidence
        ORDER BY link_strategy, link_confidence DESC
      `));
      const remaining = await db.execute(
        sql.raw(`SELECT count(*)::int AS n FROM drive_file_index WHERE link_strategy = 'pending'`),
      );

      console.log(`[DriveLink] Strategy C done. Remaining: ${(remaining as any)[0]?.n}`);
      return {
        breakdown: (stats as any[]).map((r: any) => ({
          strategy: r.link_strategy,
          confidence: r.conf,
          count: r.n,
        })),
        remaining: Number((remaining as any)[0]?.n ?? 0),
      };
    }, "Erro ao vincular arquivos (avançado)");
  }),

  /**
   * Lista arquivos indexados por assistido
   */
  filesByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT id, drive_file_id, drive_path, file_name, mime_type, size_bytes,
          modified_time, processo_id, link_strategy, link_confidence
        FROM drive_file_index
        WHERE assistido_id = ${input.assistidoId}
          AND deleted_at IS NULL
        ORDER BY drive_path
      `);
      return (result as any[]).map((r: any) => ({
        id: Number(r.id),
        driveFileId: String(r.drive_file_id),
        drivePath: String(r.drive_path),
        fileName: String(r.file_name),
        mimeType: r.mime_type ? String(r.mime_type) : null,
        sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
        modifiedTime: r.modified_time ? String(r.modified_time) : null,
        processoId: r.processo_id ? Number(r.processo_id) : null,
        linkStrategy: String(r.link_strategy),
        linkConfidence: r.link_confidence ? Number(r.link_confidence) : null,
      }));
    }),

  /**
   * Lista arquivos indexados por processo
   */
  filesByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT id, drive_file_id, drive_path, file_name, mime_type, size_bytes,
          modified_time, assistido_id, link_strategy, link_confidence
        FROM drive_file_index
        WHERE processo_id = ${input.processoId}
          AND deleted_at IS NULL
        ORDER BY drive_path
      `);
      return (result as any[]).map((r: any) => ({
        id: Number(r.id),
        driveFileId: String(r.drive_file_id),
        drivePath: String(r.drive_path),
        fileName: String(r.file_name),
        mimeType: r.mime_type ? String(r.mime_type) : null,
        sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
        modifiedTime: r.modified_time ? String(r.modified_time) : null,
        assistidoId: r.assistido_id ? Number(r.assistido_id) : null,
        linkStrategy: String(r.link_strategy),
        linkConfidence: r.link_confidence ? Number(r.link_confidence) : null,
      }));
    }),
});
