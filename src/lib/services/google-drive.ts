/**
 * Serviço de Integração com Google Drive
 * 
 * Este serviço gerencia a sincronização bidirecional com o Google Drive,
 * incluindo criação de pastas, upload, download e detecção de mudanças.
 * 
 * Requer configuração do Google Cloud Platform com a API do Drive ativada.
 */

import { db } from "@/lib/db";
import { processos, driveFiles, driveSyncFolders, driveSyncLogs, driveWebhooks, assistidos, casos } from "@/lib/db/schema";
import { eq, and, desc, ilike, or, sql, gt, lt } from "drizzle-orm";

// ==========================================
// TIPOS
// ==========================================

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
  md5Checksum?: string;
  description?: string;
}

export interface DriveChange {
  kind: string;
  type: string;
  changeType: string;
  time: string;
  removed: boolean;
  fileId: string;
  file?: DriveFileInfo;
}

export interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesUpdated: number;
  filesRemoved: number;
  errors: string[];
  /** IDs dos novos arquivos inseridos no banco (para enrichment) */
  newFileIds: number[];
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
}

// ==========================================
// CONFIGURAÇÃO E AUTENTICAÇÃO
// ==========================================
//
// Prioridade de autenticação:
// 1. Service Account (GOOGLE_SERVICE_ACCOUNT_KEY) — NUNCA expira, preferido
// 2. OAuth refresh token (GOOGLE_REFRESH_TOKEN) — expira a cada 7 dias em modo teste
// 3. Fallback: token do banco (salvo pelo callback /api/google/callback)
//

// Runtime override para OAuth (quando callback salva novo refresh token)
let runtimeRefreshToken: string | null = null;

export function setRuntimeRefreshToken(token: string) {
  runtimeRefreshToken = token;
  cachedAccessToken = null;
}

/**
 * Verifica se Service Account está configurada
 */
function hasServiceAccount(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

/**
 * Obtém access token via Service Account (JWT)
 * Usa google-auth-library para assinar o JWT
 */
async function getServiceAccountToken(): Promise<string | null> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  try {
    const { GoogleAuth } = await import("google-auth-library");

    // Decodifica a key (pode ser base64 ou JSON direto)
    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      // Tenta decodificar de base64
      credentials = JSON.parse(Buffer.from(keyJson, "base64").toString("utf-8"));
    }

    const auth = new GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/calendar",
      ],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse?.token;

    if (token) {
      cachedAccessToken = {
        token,
        expiresAt: Date.now() + 3500 * 1000, // ~58 min (SA tokens duram 1h)
      };
      return token;
    }
    return null;
  } catch (error) {
    console.error("[Google Drive] Erro na autenticação Service Account:", error);
    return null;
  }
}

const getConfig = (): GoogleDriveConfig | null => {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) return null;

  // Service Account não precisa de client ID/secret/refresh token
  if (hasServiceAccount()) {
    return {
      clientId: "",
      clientSecret: "",
      refreshToken: "",
      rootFolderId,
    };
  }

  // Fallback: OAuth
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = runtimeRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, refreshToken, rootFolderId };
};

// Cache de access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Tenta obter um refresh token do banco (salvo pelo callback /api/google/callback)
 */
async function getDbRefreshToken(): Promise<string | null> {
  try {
    const result = await db.execute(
      sql`SELECT refresh_token FROM google_tokens ORDER BY updated_at DESC LIMIT 1`
    );
    const rows = result as unknown as Array<{ refresh_token: string }>;
    return rows?.[0]?.refresh_token || null;
  } catch {
    return null;
  }
}

/**
 * Obtém um token de acesso válido
 * Prioridade: 1) OAuth (permite uploads - tem storage)  2) OAuth do banco  3) Service Account (somente leitura)
 *
 * Service Accounts NÃO têm storage quota no Google Drive, então não conseguem
 * fazer upload de arquivos. Por isso, OAuth é preferido quando disponível.
 */
async function getAccessToken(): Promise<string | null> {
  // Verifica cache (com margem de 5 minutos)
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 300000) {
    return cachedAccessToken.token;
  }

  // 1. Tenta OAuth refresh token (preferido — permite uploads)
  // Busca credenciais OAuth diretamente das env vars (getConfig retorna vazio quando SA está configurada)
  const oauthClientId = process.env.GOOGLE_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const oauthRefreshToken = runtimeRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const token = await tryRefreshToken(oauthClientId, oauthClientSecret, oauthRefreshToken);
    if (token) return token;
  }

  // 2. Tenta token OAuth do banco
  const dbToken = await getDbRefreshToken();
  if (dbToken && oauthClientId && oauthClientSecret) {
    const tokenFromDb = await tryRefreshToken(oauthClientId, oauthClientSecret, dbToken);
    if (tokenFromDb) {
      runtimeRefreshToken = dbToken;
      return tokenFromDb;
    }
  }

  // 3. Fallback: Service Account (funciona para leitura, mas não para uploads)
  if (hasServiceAccount()) {
    const saToken = await getServiceAccountToken();
    if (saToken) return saToken;
    console.error("[Google Drive] Service Account configurada mas falhou!");
  }

  console.error("[Google Drive] TODOS os métodos de auth falharam. Configure OAuth ou GOOGLE_SERVICE_ACCOUNT_KEY");
  return null;
}

async function tryRefreshToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Google Drive] OAuth refresh falhou:", errorText);
      cachedAccessToken = null;
      return null;
    }

    const data = await response.json();
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  } catch (error) {
    console.error("[Google Drive] Erro ao obter access token:", error);
    cachedAccessToken = null;
    return null;
  }
}

// ==========================================
// CHANGES API — Incremental Sync & Webhooks
// ==========================================

export type SyncHealthStatus = "healthy" | "degraded" | "critical";

export interface SyncHealthResult {
  status: SyncHealthStatus;
  issues: string[];
  expiredChannels: number;
  staleFolders: number;
  recentErrors: number;
  lastSyncAgo: number | null; // milliseconds since last sync, null if never
}

/**
 * Gets the initial page token for the Changes API.
 * This token represents the current state — future calls to changes.list
 * will only return changes that happened AFTER this token was obtained.
 */
export async function getChangesStartPageToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.error("[Drive] Failed to get startPageToken:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.startPageToken || null;
}

/**
 * Registers a webhook (push notification channel) with the Google Drive Changes API.
 * Google will POST to webhookUrl whenever changes are detected.
 * Channels expire after a maximum of 7 days — we set 6 days to allow renewal.
 */
export async function watchChanges(
  pageToken: string,
  webhookUrl: string,
  webhookSecret?: string
): Promise<{ channelId: string; resourceId: string; expiration: Date } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const channelId = crypto.randomUUID();
  // 6 days in ms (renew before 7-day max)
  const expirationMs = Date.now() + 6 * 24 * 60 * 60 * 1000;

  try {
    const body: Record<string, unknown> = {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      expiration: expirationMs,
    };
    if (webhookSecret) {
      body.token = webhookSecret;
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${encodeURIComponent(pageToken)}&supportsAllDrives=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      console.error("[Drive] Failed to register watch channel:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return {
      channelId: data.id,
      resourceId: data.resourceId,
      expiration: new Date(Number(data.expiration)),
    };
  } catch (error) {
    console.error("[Drive] Error registering watch channel:", error);
    return null;
  }
}

/**
 * Stops (unregisters) a webhook channel.
 * 404 means the channel already expired — treated as success.
 */
export async function stopChannel(channelId: string, resourceId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/channels/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: channelId, resourceId }),
    });

    // 404 = channel already expired, treat as success
    if (res.status === 404) return true;
    if (!res.ok) {
      console.error("[Drive] Failed to stop channel:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Drive] Error stopping channel:", error);
    return false;
  }
}

/**
 * Core incremental sync using the Changes API.
 * Fetches only changes since the last syncToken, avoiding full re-listing.
 *
 * IMPORTANT: The Changes API returns ALL changes across the entire Drive,
 * not just files in our folder. We must filter by checking file.parents
 * or whether the file is already tracked in our database.
 *
 * Handles 410 Gone (invalidated token) by returning a special error.
 */
export async function syncIncremental(
  folderId: string,
  syncToken: string,
  userId?: number
): Promise<{ result: SyncResult; newSyncToken: string | null }> {
  const result: SyncResult = {
    success: false,
    filesAdded: 0,
    filesUpdated: 0,
    filesRemoved: 0,
    errors: [],
    newFileIds: [],
  };

  const accessToken = await getAccessToken();
  if (!accessToken) {
    result.errors.push("No access token available");
    return { result, newSyncToken: null };
  }

  try {
    await logSyncAction(null, "incremental_sync_started", "pending", `Incremental sync for folder ${folderId}`, undefined, userId);

    // Load existing files for this folder into a Map for O(1) lookup
    const existingFiles = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    const existingFilesMap = new Map(
      existingFiles.map((f) => [f.driveFileId, f])
    );

    // Build a set of ALL known folder IDs in this sync tree (root + subfolders)
    // so we can detect files in any subfolder, not just direct children
    const knownFolderDriveIds = new Set<string>();
    knownFolderDriveIds.add(folderId); // root folder
    for (const f of existingFiles) {
      if (f.isFolder && f.driveFileId) {
        knownFolderDriveIds.add(f.driveFileId);
      }
    }

    let currentPageToken: string | null = syncToken;
    let newStartPageToken: string | null = null;
    const fieldsParam = "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,md5Checksum,description,trashed))";

    // Paginate through all changes
    while (currentPageToken) {
      const url = new URL("https://www.googleapis.com/drive/v3/changes");
      url.searchParams.set("pageToken", currentPageToken);
      url.searchParams.set("fields", fieldsParam);
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      url.searchParams.set("pageSize", "1000");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 410) {
        // Token invalidated — caller should do full sync
        result.errors.push("SYNC_TOKEN_INVALIDATED");
        await logSyncAction(null, "incremental_sync_completed", "failed", "Sync token invalidated (410 Gone)", undefined, userId);
        return { result, newSyncToken: null };
      }

      if (!res.ok) {
        const errText = await res.text();
        result.errors.push(`Changes API error: ${res.status} ${errText}`);
        await logSyncAction(null, "incremental_sync_completed", "failed", `Changes API error: ${res.status}`, errText, userId);
        return { result, newSyncToken: null };
      }

      const data = await res.json();
      const changes: Array<{
        fileId: string;
        removed: boolean;
        file?: DriveFileInfo & { trashed?: boolean };
      }> = data.changes || [];

      for (const change of changes) {
        const existing = existingFilesMap.get(change.fileId);
        const file = change.file;
        // Check if ANY of the file's parents is a known folder in our sync tree
        const isInFolderTree = file?.parents?.some((p: string) => knownFolderDriveIds.has(p)) ?? false;

        // Skip changes not related to our folder tree (unless already tracked)
        if (!existing && !isInFolderTree) continue;

        if (change.removed || file?.trashed) {
          // File was removed or trashed
          if (existing) {
            await db.delete(driveFiles).where(eq(driveFiles.id, existing.id));
            existingFilesMap.delete(change.fileId);
            // Also remove from known folders set if it was a folder
            if (existing.isFolder && existing.driveFileId) {
              knownFolderDriveIds.delete(existing.driveFileId);
            }
            result.filesRemoved++;
          }
        } else if (file && (isInFolderTree || existing)) {
          if (existing) {
            // Update existing file
            await db
              .update(driveFiles)
              .set({
                name: file.name,
                mimeType: file.mimeType,
                fileSize: file.size ? parseInt(file.size) : null,
                webViewLink: file.webViewLink,
                webContentLink: file.webContentLink,
                thumbnailLink: file.thumbnailLink,
                iconLink: file.iconLink,
                description: file.description,
                lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : null,
                driveChecksum: file.md5Checksum,
                syncStatus: "synced",
                lastSyncAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(driveFiles.id, existing.id));
            result.filesUpdated++;
          } else {
            // New file — insert
            const isFolder = file.mimeType === "application/vnd.google-apps.folder";
            // Resolve parentFileId from Drive parents
            let parentFileIdValue: number | null = null;
            const parentDriveId = file.parents?.[0];
            if (parentDriveId && parentDriveId !== folderId) {
              const parentEntry = existingFilesMap.get(parentDriveId);
              if (parentEntry) {
                parentFileIdValue = parentEntry.id;
              }
            }
            const [inserted] = await db.insert(driveFiles).values({
              driveFileId: file.id,
              driveFolderId: folderId,
              name: file.name,
              mimeType: file.mimeType,
              fileSize: file.size ? parseInt(file.size) : null,
              webViewLink: file.webViewLink,
              webContentLink: file.webContentLink,
              thumbnailLink: file.thumbnailLink,
              iconLink: file.iconLink,
              description: file.description,
              lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : null,
              driveChecksum: file.md5Checksum,
              isFolder,
              parentFileId: parentFileIdValue,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              createdById: userId,
            }).returning({ id: driveFiles.id });
            result.filesAdded++;
            if (inserted) {
              result.newFileIds.push(inserted.id);
              // Add to map so subsequent changes in the same batch can find it
              existingFilesMap.set(file.id, { driveFileId: file.id, isFolder } as typeof existingFiles[number]);
              // If it's a new folder, add to known set so its children are also tracked
              if (isFolder) {
                knownFolderDriveIds.add(file.id);
              }
            }
          }
        }
      }

      // Advance pagination
      if (data.nextPageToken) {
        currentPageToken = data.nextPageToken;
      } else {
        newStartPageToken = data.newStartPageToken || null;
        currentPageToken = null;
      }
    }

    // Update folder sync metadata
    if (newStartPageToken) {
      await db
        .update(driveSyncFolders)
        .set({
          lastSyncAt: new Date(),
          syncToken: newStartPageToken,
          updatedAt: new Date(),
        })
        .where(eq(driveSyncFolders.driveFolderId, folderId));
    }

    result.success = true;
    await logSyncAction(
      null,
      "incremental_sync_completed",
      "success",
      `Added: ${result.filesAdded}, Updated: ${result.filesUpdated}, Removed: ${result.filesRemoved}`,
      undefined,
      userId
    );

    return { result, newSyncToken: newStartPageToken };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    await logSyncAction(null, "incremental_sync_completed", "failed", "Error in incremental sync", errorMsg, userId);
    return { result, newSyncToken: null };
  }
}

/**
 * Top-level smart sync entry point.
 * - If the folder has a syncToken: tries incremental sync. On 410 → clears token, falls back to full sync + saves new token.
 * - If no syncToken: does full sync via syncFolderWithDatabase(), then saves a new token via getChangesStartPageToken().
 *
 * Returns the same SyncResult interface as syncFolderWithDatabase for compatibility.
 */
export async function smartSync(
  folderId: string,
  userId?: number
): Promise<SyncResult> {
  // Check if folder has an existing syncToken
  const [folder] = await db
    .select({ syncToken: driveSyncFolders.syncToken })
    .from(driveSyncFolders)
    .where(eq(driveSyncFolders.driveFolderId, folderId))
    .limit(1);

  if (folder?.syncToken) {
    // Safety check: if folder has a token but ZERO files in DB, the token was
    // saved prematurely (e.g., by webhook registration before initial full sync).
    // Force a full sync to bootstrap the folder properly.
    const [fileCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    if ((fileCount?.count || 0) === 0) {
      console.warn("[Drive] Folder", folderId, "has syncToken but 0 files — forcing full sync bootstrap");
      // Clear the premature token
      await db
        .update(driveSyncFolders)
        .set({ syncToken: null, updatedAt: new Date() })
        .where(eq(driveSyncFolders.driveFolderId, folderId));
      // Fall through to the full sync path below
    } else {
      // Normal incremental sync
      const { result, newSyncToken } = await syncIncremental(folderId, folder.syncToken, userId);

      if (result.errors.includes("SYNC_TOKEN_INVALIDATED")) {
        // Token expired/invalidated — clear token and fall back to full sync
        console.warn("[Drive] Sync token invalidated for folder", folderId, "— falling back to full sync");
        await db
          .update(driveSyncFolders)
          .set({ syncToken: null, updatedAt: new Date() })
          .where(eq(driveSyncFolders.driveFolderId, folderId));

        // Full sync
        const fullResult = await syncFolderWithDatabase(folderId, userId);

        // Save new token for next incremental sync
        const newToken = await getChangesStartPageToken();
        if (newToken) {
          await db
            .update(driveSyncFolders)
            .set({ syncToken: newToken, updatedAt: new Date() })
            .where(eq(driveSyncFolders.driveFolderId, folderId));
        }

        return fullResult;
      }

      return result;
    }
  }

  // No syncToken — do full sync first
  const fullResult = await syncFolderWithDatabase(folderId, userId);

  if (fullResult.success) {
    // Save token for future incremental syncs
    const newToken = await getChangesStartPageToken();
    if (newToken) {
      await db
        .update(driveSyncFolders)
        .set({ syncToken: newToken, updatedAt: new Date() })
        .where(eq(driveSyncFolders.driveFolderId, folderId));
    }
  }

  return fullResult;
}

/**
 * Auto-registers a webhook channel for a folder.
 * Gets or creates a syncToken, calls watchChanges(), and saves to driveWebhooks table.
 */
export async function registerWebhookForFolder(
  folderId: string,
  webhookBaseUrl: string
): Promise<{ channelId: string; expiration: Date } | null> {
  try {
    // Ensure folder has a syncToken
    const [folder] = await db
      .select({ syncToken: driveSyncFolders.syncToken })
      .from(driveSyncFolders)
      .where(eq(driveSyncFolders.driveFolderId, folderId))
      .limit(1);

    let syncToken = folder?.syncToken;
    if (!syncToken) {
      syncToken = await getChangesStartPageToken();
      if (!syncToken) {
        console.error("[Drive] Failed to get syncToken for webhook registration");
        return null;
      }
      // NOTE: Do NOT save syncToken here — it must only be saved AFTER a full sync
      // completes successfully (in smartSync). Saving it prematurely causes smartSync
      // to skip the initial full listing, resulting in an empty folder.
    }

    // Register the webhook
    const webhookUrl = `${webhookBaseUrl}/api/webhooks/drive`;
    const watchResult = await watchChanges(syncToken, webhookUrl);
    if (!watchResult) return null;

    // Save to database with upsert
    await db
      .insert(driveWebhooks)
      .values({
        channelId: watchResult.channelId,
        resourceId: watchResult.resourceId,
        folderId,
        expiration: watchResult.expiration,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: driveWebhooks.channelId,
        set: {
          resourceId: watchResult.resourceId,
          folderId,
          expiration: watchResult.expiration,
          isActive: true,
        },
      });

    return {
      channelId: watchResult.channelId,
      expiration: watchResult.expiration,
    };
  } catch (error) {
    console.error("[Drive] Error registering webhook for folder:", error);
    return null;
  }
}

/**
 * Finds webhook channels expiring within 24 hours and renews them.
 * For each expiring channel: registers a new one, stops the old one, deactivates old in DB.
 */
export async function renewExpiringChannels(
  webhookBaseUrl: string
): Promise<{ renewed: number; failed: number; errors: string[] }> {
  const stats = { renewed: 0, failed: 0, errors: [] as string[] };

  try {
    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000); // now + 24h
    const expiringChannels = await db
      .select()
      .from(driveWebhooks)
      .where(
        and(
          eq(driveWebhooks.isActive, true),
          lt(driveWebhooks.expiration, cutoff)
        )
      );

    for (const channel of expiringChannels) {
      try {
        // Register new channel for the folder
        const newChannel = await registerWebhookForFolder(channel.folderId, webhookBaseUrl);
        if (!newChannel) {
          stats.failed++;
          stats.errors.push(`Failed to renew channel for folder ${channel.folderId}`);
          continue;
        }

        // Stop old channel
        if (channel.resourceId) {
          await stopChannel(channel.channelId, channel.resourceId);
        }

        // Deactivate old channel in DB
        await db
          .update(driveWebhooks)
          .set({ isActive: false })
          .where(eq(driveWebhooks.channelId, channel.channelId));

        stats.renewed++;
      } catch (error) {
        stats.failed++;
        const msg = error instanceof Error ? error.message : "Unknown error";
        stats.errors.push(`Error renewing channel ${channel.channelId}: ${msg}`);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Error querying expiring channels: ${msg}`);
  }

  return stats;
}

/**
 * Monitors the health of the sync system.
 * Checks for: expired active channels, stale folders (no sync in 30+ min),
 * recent errors (>3 in last hour), and the most recent sync time.
 */
export async function checkSyncHealth(): Promise<SyncHealthResult> {
  const issues: string[] = [];
  let expiredChannels = 0;
  let staleFolders = 0;
  let recentErrors = 0;
  let lastSyncAgo: number | null = null;

  try {
    // 1. Expired channels still marked active
    const now = new Date();
    const expiredActive = await db
      .select({ count: sql<number>`count(*)` })
      .from(driveWebhooks)
      .where(
        and(
          eq(driveWebhooks.isActive, true),
          lt(driveWebhooks.expiration, now)
        )
      );
    expiredChannels = Number(expiredActive[0]?.count || 0);
    if (expiredChannels > 0) {
      issues.push(`${expiredChannels} expired webhook channel(s) still marked active`);
    }

    // 2. Stale folders — no sync in 30+ minutes
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await db
      .select({ count: sql<number>`count(*)` })
      .from(driveSyncFolders)
      .where(
        and(
          eq(driveSyncFolders.isActive, true),
          or(
            lt(driveSyncFolders.lastSyncAt, staleThreshold),
            sql`${driveSyncFolders.lastSyncAt} IS NULL`
          )
        )
      );
    staleFolders = Number(stale[0]?.count || 0);
    if (staleFolders > 0) {
      issues.push(`${staleFolders} folder(s) not synced in 30+ minutes`);
    }

    // 3. Recent errors — more than 3 in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const errorLogs = await db
      .select({ count: sql<number>`count(*)` })
      .from(driveSyncLogs)
      .where(
        and(
          eq(driveSyncLogs.status, "failed"),
          gt(driveSyncLogs.createdAt, oneHourAgo)
        )
      );
    recentErrors = Number(errorLogs[0]?.count || 0);
    if (recentErrors > 3) {
      issues.push(`${recentErrors} sync errors in the last hour`);
    }

    // 4. Most recent sync time
    const [lastSync] = await db
      .select({ lastSyncAt: driveSyncFolders.lastSyncAt })
      .from(driveSyncFolders)
      .where(eq(driveSyncFolders.isActive, true))
      .orderBy(desc(driveSyncFolders.lastSyncAt))
      .limit(1);

    if (lastSync?.lastSyncAt) {
      lastSyncAgo = Date.now() - lastSync.lastSyncAt.getTime();
    }
  } catch (error) {
    issues.push(`Health check error: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // Determine status
  let status: SyncHealthStatus = "healthy";
  if (expiredChannels > 0 || recentErrors > 3) {
    status = "degraded";
  }
  if (expiredChannels > 3 || recentErrors > 10 || staleFolders > 5) {
    status = "critical";
  }

  return {
    status,
    issues,
    expiredChannels,
    staleFolders,
    recentErrors,
    lastSyncAgo,
  };
}

/**
 * Cria uma pasta no Google Drive
 */
export async function createFolder(
  name: string,
  parentFolderId?: string
): Promise<DriveFolder | null> {
  const config = getConfig();
  if (!config) {
    console.warn("Google Drive não configurado. Pulando criação de pasta.");
    return null;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId || config.rootFolderId],
    };

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      console.error("Erro ao criar pasta no Drive:", await response.text());
      return null;
    }

    const folder = await response.json();
    return {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
    };
  } catch (error) {
    console.error("Erro ao criar pasta no Drive:", error);
    return null;
  }
}

/**
 * Cria uma pasta para um processo no formato: "[Nome do Assistido] - [Número do Processo]"
 * e atualiza o registro do processo com o link
 */
export async function criarPastaProcesso(
  processoId: number,
  nomeAssistido: string,
  numeroAutos: string,
  area?: string
): Promise<DriveFolder | null> {
  const config = getConfig();
  if (!config) {
    console.warn("Google Drive não configurado.");
    return null;
  }

  // Nome da pasta no formato padrão
  const nomePasta = `${nomeAssistido} - ${numeroAutos}`;

  // Primeiro, verificar se existe uma pasta para a área (Júri, EP, VD, etc.)
  let pastaAreaId = config.rootFolderId;
  
  if (area) {
    // Criar ou encontrar pasta da área
    const pastaArea = await criarOuEncontrarPasta(area, config.rootFolderId);
    if (pastaArea) {
      pastaAreaId = pastaArea.id;
    }
  }

  // Criar pasta do processo
  const pastaProcesso = await createFolder(nomePasta, pastaAreaId);
  
  if (pastaProcesso) {
    // Atualizar o processo com o link do Drive
    await db
      .update(processos)
      .set({
        linkDrive: pastaProcesso.webViewLink,
        driveFolderId: pastaProcesso.id,
        updatedAt: new Date(),
      })
      .where(eq(processos.id, processoId));

    // Criar subpastas padrão
    await criarSubpastasProcesso(pastaProcesso.id);
  }

  return pastaProcesso;
}

/**
 * Cria subpastas padrão dentro da pasta do processo
 */
async function criarSubpastasProcesso(pastaProcessoId: string): Promise<void> {
  const subpastas = [
    "01 - Documentos Pessoais",
    "02 - Peças Protocoladas",
    "03 - Decisões e Sentenças",
    "04 - Audiências",
    "05 - Outros",
  ];

  for (const subpasta of subpastas) {
    await createFolder(subpasta, pastaProcessoId);
  }
}

/**
 * Cria uma pasta se não existir, ou retorna a existente
 */
async function criarOuEncontrarPasta(
  nome: string,
  parentFolderId: string
): Promise<DriveFolder | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Buscar pasta existente
    const query = `name='${nome}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        return {
          id: searchData.files[0].id,
          name: searchData.files[0].name,
          webViewLink: searchData.files[0].webViewLink,
        };
      }
    }

    // Se não existe, criar
    return await createFolder(nome, parentFolderId);
  } catch (error) {
    console.error("Erro ao buscar/criar pasta:", error);
    return null;
  }
}

/**
 * Faz upload de um arquivo para uma pasta
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; webViewLink: string } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Criar metadados
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    // Upload multipart
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      file.toString('base64') +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      console.error("Erro ao fazer upload:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return null;
  }
}

/**
 * Verifica se a integração com Google Drive está configurada
 */
export function isGoogleDriveConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Informações da conta Google autenticada
 */
export interface GoogleAccountInfo {
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Obtém informações da conta Google autenticada (quem gerou o refresh token)
 * Usa a API Drive About que funciona com qualquer token que tenha acesso ao Drive
 * Útil para saber qual conta precisa ter acesso às pastas
 */
export async function getAuthenticatedAccountInfo(): Promise<GoogleAccountInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.log("[Google Drive] Sem access token para obter info da conta");
    return null;
  }

  try {
    // Usar a API Drive About - funciona com qualquer token que tenha acesso ao Drive
    // Não precisa do escopo userinfo.email
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Google Drive] Erro ao obter about:", errorText);
      return null;
    }

    const data = await response.json();
    console.log("[Google Drive] About response:", JSON.stringify(data));

    if (data.user) {
      return {
        email: data.user.emailAddress,
        name: data.user.displayName,
        picture: data.user.photoLink,
      };
    }

    return null;
  } catch (error) {
    console.error("[Google Drive] Erro ao obter informações da conta:", error);
    return null;
  }
}

/**
 * Obtém o link da pasta raiz configurada
 */
export async function getRootFolderLink(): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${config.rootFolderId}?fields=webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.webViewLink;
    }
  } catch (error) {
    console.error("Erro ao obter link da pasta raiz:", error);
  }

  return null;
}

// ==========================================
// FUNÇÕES DE LISTAGEM
// ==========================================

/**
 * Retry helper — retries on transient errors (429, 500, 503) with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 2, label = "operation" }: { maxRetries?: number; label?: string } = {}
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryable = lastError.message.includes("429") ||
        lastError.message.includes("500") ||
        lastError.message.includes("503") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("fetch failed");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`[Drive] ${label} attempt ${attempt + 1} failed (${lastError.message}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError!;
}

/**
 * Lista todos os arquivos de uma pasta do Drive
 * Throws on error instead of returning null — errors propagate to caller.
 */
export async function listFilesInFolder(
  folderId: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<{ files: DriveFileInfo[]; nextPageToken?: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error(`[Drive] Auth failed — no access token for folder ${folderId}`);

  return withRetry(async () => {
    const query = `'${folderId}' in parents and trashed = false`;
    const fields = "nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,md5Checksum,description)";

    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=folder,name`;

    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Drive API ${response.status}: ${body.slice(0, 200)} (folder=${folderId})`);
    }

    const data = await response.json();
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
    };
  }, { label: `listFilesInFolder(${folderId.slice(0, 8)}...)` });
}

/**
 * Lista TODOS os itens (arquivos e pastas) de uma pasta, com paginação automática.
 * Retorna array plano (flat) — ideal para iterar sem se preocupar com paginação.
 *
 * IMPORTANTE: Google Drive retorna no máximo 100 itens por página.
 * Esta função itera automaticamente por todas as páginas.
 * Throws on error — callers must handle or let propagate.
 */
export async function listAllItemsInFolder(
  folderId: string
): Promise<DriveFileInfo[]> {
  const allItems: DriveFileInfo[] = [];
  let pageToken: string | undefined;

  do {
    const result = await listFilesInFolder(folderId, pageToken, 100);
    allItems.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return allItems;
}

/**
 * Lista todos os arquivos recursivamente (incluindo subpastas)
 * maxDepth aumentado para 10 para cobrir hierarquias profundas.
 * Uses concurrency limit of 3 to avoid rate-limiting on large folder trees.
 */
export async function listAllFilesRecursively(
  folderId: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<DriveFileInfo[]> {
  if (currentDepth >= maxDepth) return [];

  const allFiles: DriveFileInfo[] = [];
  const items = await listAllItemsInFolder(folderId);

  // Separate folders from files
  const folders: DriveFileInfo[] = [];
  for (const file of items) {
    allFiles.push(file);
    if (file.mimeType === "application/vnd.google-apps.folder") {
      folders.push(file);
    }
  }

  // Process subfolders with concurrency limit of 3
  if (folders.length > 0) {
    const MAX_CONCURRENT = 3;
    for (let i = 0; i < folders.length; i += MAX_CONCURRENT) {
      const batch = folders.slice(i, i + MAX_CONCURRENT);
      if (folders.length > 5) {
        console.log(`[Drive] Scanning subfolders ${i + 1}-${Math.min(i + MAX_CONCURRENT, folders.length)}/${folders.length} in ${folderId.slice(0, 8)}...`);
      }
      const results = await Promise.allSettled(
        batch.map(folder =>
          listAllFilesRecursively(folder.id, maxDepth, currentDepth + 1)
        )
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          allFiles.push(...result.value);
        } else {
          console.error(`[Drive] Failed to list subfolder: ${result.reason}`);
          // Continue with other folders instead of failing entirely
        }
      }
    }
  }

  return allFiles;
}

/**
 * Baixa o conteúdo binário de um arquivo do Drive
 * @param fileId - ID do arquivo no Google Drive
 * @returns ArrayBuffer com o conteúdo do arquivo ou null em caso de erro
 */
export async function downloadFileContent(fileId: string): Promise<ArrayBuffer | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error("Token de acesso não disponível para download");
    return null;
  }

  try {
    // Primeiro, verifica se é um documento Google (precisa de export)
    const fileInfo = await getFileInfo(fileId);

    if (!fileInfo) {
      console.error("Arquivo não encontrado:", fileId);
      return null;
    }

    let downloadUrl: string;

    // Se for documento Google, usa endpoint de export
    if (fileInfo.mimeType.startsWith("application/vnd.google-apps.")) {
      // Mapeia tipos Google para formatos de export
      const exportMimeType =
        fileInfo.mimeType === "application/vnd.google-apps.document"
          ? "application/pdf"
          : fileInfo.mimeType === "application/vnd.google-apps.spreadsheet"
            ? "application/pdf"
            : fileInfo.mimeType === "application/vnd.google-apps.presentation"
              ? "application/pdf"
              : "application/pdf";

      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
    } else {
      // Para arquivos normais, usa download direto
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Erro ao baixar arquivo:", response.status, await response.text());
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Erro ao baixar conteúdo do arquivo:", error);
    return null;
  }
}

/**
 * Obtém informações de um arquivo específico
 */
export async function getFileInfo(fileId: string): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const fields = "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,md5Checksum,description";
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao obter informações do arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao obter informações do arquivo:", error);
    return null;
  }
}

/**
 * Obtém informações de uma pasta
 */
export async function getFolderInfo(folderId: string): Promise<DriveFileInfo | null> {
  return getFileInfo(folderId);
}

// ==========================================
// FUNÇÕES DE SINCRONIZAÇÃO
// ==========================================

/**
 * Sincroniza uma pasta do Drive com o banco de dados local
 */
export async function syncFolderWithDatabase(
  folderId: string,
  userId?: number
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    filesAdded: 0,
    filesUpdated: 0,
    filesRemoved: 0,
    errors: [],
    newFileIds: [],
  };

  try {
    // Log de início
    await logSyncAction(null, "sync_started", "pending", `Sincronizando pasta ${folderId}`, undefined, userId);

    // Listar todos os arquivos do Drive
    const driveFilesList = await listAllFilesRecursively(folderId);

    if (!driveFilesList || driveFilesList.length === 0) {
      // Safety check: if Drive returns empty but we already have files in DB,
      // this likely means an auth failure or API error — do NOT delete everything
      const existingCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(eq(driveFiles.driveFolderId, folderId));

      const hasExistingFiles = (existingCount[0]?.count || 0) > 0;

      if (hasExistingFiles && driveFilesList?.length === 0) {
        console.warn(`[Drive] listAllFilesRecursively returned 0 files for folder ${folderId} but DB has ${existingCount[0]?.count} files — possible auth issue, skipping destructive sync`);
        result.errors.push("Drive listing returned empty but DB has files — possible auth issue. Skipping to prevent data loss.");
        await logSyncAction(null, "sync_completed", "failed", "Empty listing with existing files — skipped", result.errors.join(", "), userId);
        return result;
      }

      if (!driveFilesList) {
        result.errors.push("Falha ao listar arquivos do Drive");
        await logSyncAction(null, "sync_completed", "failed", "Falha ao listar arquivos", result.errors.join(", "), userId);
        return result;
      }
    }

    // Obter arquivos existentes no banco
    const existingFiles = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    const existingFilesMap = new Map(
      existingFiles.map((f) => [f.driveFileId, f])
    );

    const processedIds = new Set<string>();

    // Processar arquivos do Drive
    for (const driveFile of driveFilesList) {
      processedIds.add(driveFile.id);
      const existing = existingFilesMap.get(driveFile.id);

      if (!existing) {
        // Novo arquivo - inserir (com onConflict como safety net para race conditions)
        try {
          const [inserted] = await db.insert(driveFiles).values({
            driveFileId: driveFile.id,
            driveFolderId: folderId,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            fileSize: driveFile.size ? parseInt(driveFile.size) : null,
            webViewLink: driveFile.webViewLink,
            webContentLink: driveFile.webContentLink,
            thumbnailLink: driveFile.thumbnailLink,
            iconLink: driveFile.iconLink,
            description: driveFile.description,
            lastModifiedTime: driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : null,
            driveChecksum: driveFile.md5Checksum,
            isFolder: driveFile.mimeType === "application/vnd.google-apps.folder",
            syncStatus: "synced",
            lastSyncAt: new Date(),
            createdById: userId,
          }).onConflictDoUpdate({
            target: driveFiles.driveFileId,
            set: {
              name: driveFile.name,
              mimeType: driveFile.mimeType,
              fileSize: driveFile.size ? parseInt(driveFile.size) : null,
              webViewLink: driveFile.webViewLink,
              webContentLink: driveFile.webContentLink,
              thumbnailLink: driveFile.thumbnailLink,
              lastModifiedTime: driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : null,
              driveChecksum: driveFile.md5Checksum,
              syncStatus: "synced" as const,
              lastSyncAt: new Date(),
            },
          }).returning({ id: driveFiles.id });
          result.filesAdded++;
          if (inserted) {
            result.newFileIds.push(inserted.id);
          }
        } catch (insertError) {
          console.error(`[Drive] Failed to insert/upsert file ${driveFile.id} (${driveFile.name}):`, insertError);
          result.errors.push(`Insert failed for ${driveFile.name}: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
        }
      } else {
        // Arquivo existente - verificar se precisa atualizar
        const driveModified = driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : null;
        const localModified = existing.lastModifiedTime;
        
        const needsUpdate = 
          existing.name !== driveFile.name ||
          existing.driveChecksum !== driveFile.md5Checksum ||
          (driveModified && localModified && driveModified > localModified);

        if (needsUpdate) {
          await db
            .update(driveFiles)
            .set({
              name: driveFile.name,
              mimeType: driveFile.mimeType,
              fileSize: driveFile.size ? parseInt(driveFile.size) : null,
              webViewLink: driveFile.webViewLink,
              webContentLink: driveFile.webContentLink,
              thumbnailLink: driveFile.thumbnailLink,
              iconLink: driveFile.iconLink,
              description: driveFile.description,
              lastModifiedTime: driveModified,
              driveChecksum: driveFile.md5Checksum,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.id, existing.id));
          result.filesUpdated++;
        }
      }
    }

    // Marcar arquivos removidos do Drive
    const existingEntries = Array.from(existingFilesMap.entries());
    for (const [fileId, existing] of existingEntries) {
      if (!processedIds.has(fileId)) {
        await db
          .delete(driveFiles)
          .where(eq(driveFiles.id, existing.id));
        result.filesRemoved++;
      }
    }

    // ── Set parentFileId for hierarchy navigation ──
    // Build driveFileId → dbId map from ALL files in DB
    const allDbFiles = await db
      .select({ id: driveFiles.id, driveFileId: driveFiles.driveFileId, parentFileId: driveFiles.parentFileId })
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    const driveIdToDbId = new Map<string, number>();
    for (const f of allDbFiles) {
      driveIdToDbId.set(f.driveFileId, f.id);
    }
    // Also add the root folder itself (it's not in the driveFiles table typically)
    // The root folder's driveFileId IS the folderId
    // Files whose parent[0] === folderId should have parentFileId = null (root level)

    let parentUpdates = 0;
    for (const driveFile of driveFilesList) {
      const parentDriveId = driveFile.parents?.[0];
      if (!parentDriveId) continue;

      const dbId = driveIdToDbId.get(driveFile.id);
      if (!dbId) continue;

      // If parent is the root sync folder, set parentFileId to null (root level)
      if (parentDriveId === folderId) {
        // Already null by default, but ensure it's set
        const existing = allDbFiles.find(f => f.driveFileId === driveFile.id);
        if (existing && existing.parentFileId !== null) {
          await db
            .update(driveFiles)
            .set({ parentFileId: null })
            .where(eq(driveFiles.id, dbId));
          parentUpdates++;
        }
      } else {
        // Parent is a subfolder — find its DB ID
        const parentDbId = driveIdToDbId.get(parentDriveId);
        if (parentDbId) {
          const existing = allDbFiles.find(f => f.driveFileId === driveFile.id);
          if (existing && existing.parentFileId !== parentDbId) {
            await db
              .update(driveFiles)
              .set({ parentFileId: parentDbId })
              .where(eq(driveFiles.id, dbId));
            parentUpdates++;
          }
        }
      }
    }

    if (parentUpdates > 0) {
      console.log(`[Drive] Updated parentFileId for ${parentUpdates} files in folder ${folderId}`);
    }

    // Atualizar timestamp da última sincronização
    await db
      .update(driveSyncFolders)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(driveSyncFolders.driveFolderId, folderId));

    result.success = true;
    await logSyncAction(null, "sync_completed", "success", 
      `Adicionados: ${result.filesAdded}, Atualizados: ${result.filesUpdated}, Removidos: ${result.filesRemoved}`,
      undefined, userId);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    result.errors.push(errorMsg);
    await logSyncAction(null, "sync_completed", "failed", "Erro na sincronização", errorMsg, userId);
  }

  return result;
}

/**
 * Registra uma ação de sincronização no log
 */
async function logSyncAction(
  driveFileId: string | null,
  action: string,
  status: string,
  details?: string,
  errorMessage?: string,
  userId?: number
): Promise<void> {
  try {
    await db.insert(driveSyncLogs).values({
      driveFileId,
      action,
      status,
      details,
      errorMessage,
      userId,
    });
  } catch (error) {
    console.error("Erro ao registrar log de sincronização:", error);
  }
}

// ==========================================
// VINCULAÇÃO AUTOMÁTICA DE ARQUIVOS
// ==========================================

/**
 * Detecta processo pelo nome da pasta pai
 * Formato esperado: "Nome do Assistido - 0000000-00.0000.0.00.0000"
 */
export async function detectProcessoByFolderName(folderName: string): Promise<{
  processoId: number | null;
  assistidoId: number | null;
  confidence: "high" | "medium" | "low";
} | null> {
  try {
    // Padrão de número de processo: NNNNNNN-NN.NNNN.N.NN.NNNN
    const numeroProcessoRegex = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
    const match = folderName.match(numeroProcessoRegex);

    if (match) {
      const numeroProcesso = match[1];

      // Buscar processo pelo número
      const [processo] = await db
        .select({ id: processos.id, assistidoId: processos.assistidoId })
        .from(processos)
        .where(eq(processos.numero, numeroProcesso))
        .limit(1);

      if (processo) {
        return {
          processoId: processo.id,
          assistidoId: processo.assistidoId,
          confidence: "high",
        };
      }
    }

    // Tentar detectar pelo nome do assistido (parte antes do " - ")
    const parts = folderName.split(" - ");
    if (parts.length >= 2) {
      const nomeAssistido = parts[0].trim();

      // Buscar assistido pelo nome (parcial)
      const [assistido] = await db
        .select({ id: assistidos.id })
        .from(assistidos)
        .where(ilike(assistidos.nome, `%${nomeAssistido}%`))
        .limit(1);

      if (assistido) {
        // Verificar se existe processo vinculado
        const [processo] = await db
          .select({ id: processos.id })
          .from(processos)
          .where(eq(processos.assistidoId, assistido.id))
          .limit(1);

        return {
          processoId: processo?.id || null,
          assistidoId: assistido.id,
          confidence: processo ? "medium" : "low",
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Erro ao detectar processo pelo nome da pasta:", error);
    return null;
  }
}

/**
 * Busca informações da pasta pai de um arquivo
 */
export async function getParentFolderInfo(fileId: string): Promise<{
  parentId: string;
  parentName: string;
} | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Buscar arquivo com informações do parent
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) return null;
    const fileData = await response.json();

    if (!fileData.parents || fileData.parents.length === 0) return null;

    const parentId = fileData.parents[0];

    // Buscar nome da pasta pai
    const parentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!parentResponse.ok) return null;
    const parentData = await parentResponse.json();

    return {
      parentId: parentData.id,
      parentName: parentData.name,
    };
  } catch (error) {
    console.error("Erro ao buscar pasta pai:", error);
    return null;
  }
}

/**
 * Vincula automaticamente um arquivo a processo/assistido
 * baseado no nome da pasta pai
 */
export async function autoLinkFileToProcesso(
  driveFileId: string,
  dbFileId: number
): Promise<{
  linked: boolean;
  processoId: number | null;
  assistidoId: number | null;
}> {
  try {
    // Obter informações da pasta pai
    const parentInfo = await getParentFolderInfo(driveFileId);
    if (!parentInfo) {
      return { linked: false, processoId: null, assistidoId: null };
    }

    // Detectar processo pelo nome da pasta
    const detection = await detectProcessoByFolderName(parentInfo.parentName);
    if (!detection) {
      return { linked: false, processoId: null, assistidoId: null };
    }

    // Atualizar arquivo no banco com vinculação
    await db
      .update(driveFiles)
      .set({
        processoId: detection.processoId,
        assistidoId: detection.assistidoId,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, dbFileId));

    return {
      linked: true,
      processoId: detection.processoId,
      assistidoId: detection.assistidoId,
    };
  } catch (error) {
    console.error("Erro ao vincular arquivo automaticamente:", error);
    return { linked: false, processoId: null, assistidoId: null };
  }
}

/**
 * Vincula múltiplos arquivos a processos automaticamente
 * Útil para sincronização em massa
 */
export async function autoLinkMultipleFiles(
  folderId: string
): Promise<{
  total: number;
  linked: number;
  errors: number;
}> {
  const result = { total: 0, linked: 0, errors: 0 };

  try {
    // Buscar arquivos não vinculados da pasta
    const unlinkedFiles = await db
      .select()
      .from(driveFiles)
      .where(
        and(
          eq(driveFiles.driveFolderId, folderId),
          eq(driveFiles.isFolder, false),
          sql`${driveFiles.processoId} IS NULL`
        )
      );

    result.total = unlinkedFiles.length;

    for (const file of unlinkedFiles) {
      try {
        const linkResult = await autoLinkFileToProcesso(file.driveFileId, file.id);
        if (linkResult.linked) {
          result.linked++;
        }
      } catch {
        result.errors++;
      }
    }

    return result;
  } catch (error) {
    console.error("Erro ao vincular múltiplos arquivos:", error);
    return result;
  }
}

/**
 * Sincroniza pasta com vinculação automática de arquivos
 */
export async function syncFolderWithAutoLink(
  folderId: string,
  userId?: number
): Promise<SyncResult & { linked: number }> {
  // Primeiro, sincroniza normalmente
  const syncResult = await syncFolderWithDatabase(folderId, userId);

  // Depois, tenta vincular arquivos automaticamente
  const linkResult = await autoLinkMultipleFiles(folderId);

  return {
    ...syncResult,
    linked: linkResult.linked,
  };
}

/**
 * Busca processos pelo ID da pasta do Drive
 */
export async function getProcessoByDriveFolderId(driveFolderId: string): Promise<{
  id: number;
  numero: string;
  assistidoId: number | null;
} | null> {
  try {
    const [processo] = await db
      .select({
        id: processos.id,
        numero: processos.numero,
        assistidoId: processos.assistidoId,
      })
      .from(processos)
      .where(eq(processos.driveFolderId, driveFolderId))
      .limit(1);

    return processo || null;
  } catch (error) {
    console.error("Erro ao buscar processo por pasta do Drive:", error);
    return null;
  }
}

/**
 * Vincula arquivo diretamente a um processo
 */
export async function linkFileToProcesso(
  dbFileId: number,
  processoId: number
): Promise<boolean> {
  try {
    // Buscar assistidoId do processo
    const [processo] = await db
      .select({ assistidoId: processos.assistidoId })
      .from(processos)
      .where(eq(processos.id, processoId))
      .limit(1);

    await db
      .update(driveFiles)
      .set({
        processoId,
        assistidoId: processo?.assistidoId || null,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, dbFileId));

    return true;
  } catch (error) {
    console.error("Erro ao vincular arquivo ao processo:", error);
    return false;
  }
}

/**
 * Vincula arquivo diretamente a um assistido
 */
export async function linkFileToAssistido(
  dbFileId: number,
  assistidoId: number
): Promise<boolean> {
  try {
    await db
      .update(driveFiles)
      .set({
        assistidoId,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, dbFileId));

    return true;
  } catch (error) {
    console.error("Erro ao vincular arquivo ao assistido:", error);
    return false;
  }
}

/**
 * Remove vinculação de arquivo
 */
export async function unlinkFile(dbFileId: number): Promise<boolean> {
  try {
    await db
      .update(driveFiles)
      .set({
        processoId: null,
        assistidoId: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, dbFileId));

    return true;
  } catch (error) {
    console.error("Erro ao remover vinculação:", error);
    return false;
  }
}

// ==========================================
// FUNÇÕES DE UPLOAD PARA O DRIVE
// ==========================================

/**
 * Faz upload de um arquivo para o Drive a partir de uma URL
 */
export async function uploadFileFromUrl(
  fileUrl: string,
  fileName: string,
  mimeType: string,
  folderId: string,
  description?: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Baixar o arquivo da URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error("Erro ao baixar arquivo da URL");
      return null;
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    return await uploadFileBuffer(
      Buffer.from(fileBuffer),
      fileName,
      mimeType,
      folderId,
      description
    );
  } catch (error) {
    console.error("Erro ao fazer upload de arquivo:", error);
    return null;
  }
}

/**
 * Verifica se um arquivo com o mesmo nome já existe em uma pasta
 * Retorna o arquivo existente ou null se não existir
 */
export async function findExistingFile(
  fileName: string,
  folderId: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const query = `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,md5Checksum)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao buscar arquivo existente:", await response.text());
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar arquivo existente:", error);
    return null;
  }
}

/**
 * Faz upload de um arquivo buffer para o Drive
 * Opcionalmente evita duplicações verificando se arquivo já existe
 */
export async function uploadFileBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  description?: string,
  options?: {
    preventDuplicates?: boolean; // Se true, não faz upload se já existe
    updateIfExists?: boolean;    // Se true, atualiza arquivo existente
  }
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Verificar duplicação se solicitado
    if (options?.preventDuplicates || options?.updateIfExists) {
      const existingFile = await findExistingFile(fileName, folderId);
      
      if (existingFile) {
        if (options?.preventDuplicates && !options?.updateIfExists) {
          console.log(`[Drive] Arquivo já existe, pulando upload: ${fileName}`);
          return existingFile; // Retorna o arquivo existente
        }
        
        if (options?.updateIfExists) {
          console.log(`[Drive] Atualizando arquivo existente: ${fileName}`);
          return await updateFileInDrive(existingFile.id, buffer, mimeType);
        }
      }
    }

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: description || undefined,
    };

    // Upload multipart
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      buffer.toString('base64') +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,md5Checksum",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      console.error("Erro no upload:", await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return null;
  }
}

/**
 * Copia um arquivo no Drive para outra pasta
 */
export async function copyFileInDrive(
  sourceFileId: string,
  targetFolderId: string,
  newName: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${sourceFileId}/copy?fields=id,name,mimeType,webViewLink,webContentLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          parents: [targetFolderId],
        }),
      }
    );

    if (!response.ok) {
      console.error("[Drive] Failed to copy file:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[Drive] Error copying file:", error);
    return null;
  }
}

/**
 * Atualiza um arquivo existente no Drive
 */
export async function updateFileInDrive(
  fileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,md5Checksum`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
        },
        body: new Uint8Array(buffer),
      }
    );

    if (!response.ok) {
      console.error("Erro ao atualizar arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao atualizar arquivo:", error);
    return null;
  }
}

/**
 * Renomeia um arquivo no Drive
 */
export async function renameFileInDrive(
  fileId: string,
  newName: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      }
    );

    if (!response.ok) {
      console.error("Erro ao renomear arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao renomear arquivo:", error);
    return null;
  }
}

/**
 * Move um arquivo para outra pasta no Drive
 */
export async function moveFileInDrive(
  fileId: string,
  newParentId: string,
  oldParentId?: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&fields=id,name,mimeType,modifiedTime,webViewLink,parents`;
    
    if (oldParentId) {
      url += `&removeParents=${oldParentId}`;
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Erro ao mover arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao mover arquivo:", error);
    return null;
  }
}

/**
 * Exclui um arquivo do Drive (move para lixeira)
 */
export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    return false;
  }
}

/**
 * Move arquivo para a lixeira (soft delete)
 */
export async function trashFileInDrive(fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trashed: true }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erro ao mover para lixeira:", error);
    return false;
  }
}

// ==========================================
// FUNÇÕES DE DOWNLOAD
// ==========================================

/**
 * Exporta um arquivo do Google Docs/Sheets/Slides para um formato específico
 */
export async function exportGoogleDoc(
  fileId: string,
  exportMimeType: string
): Promise<Buffer | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao exportar documento:", await response.text());
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Erro ao exportar documento:", error);
    return null;
  }
}

// ==========================================
// FUNÇÕES DE CONFIGURAÇÃO DE PASTAS
// ==========================================

/**
 * Resultado do registro de pasta
 */
export interface RegisterFolderResult {
  success: boolean;
  error?: string;
  folderName?: string;
}

/**
 * Registra uma pasta para sincronização
 * Retorna resultado com mensagem de erro detalhada em caso de falha
 */
export async function registerSyncFolder(
  folderId: string,
  name: string,
  description?: string,
  syncDirection: string = "bidirectional",
  userId?: number
): Promise<RegisterFolderResult> {
  try {
    // Verificar se o Drive está configurado
    if (!isGoogleDriveConfigured()) {
      return {
        success: false,
        error: "Google Drive não está configurado. Verifique as variáveis de ambiente.",
      };
    }

    // Verificar se a pasta existe no Drive
    const folderInfo = await getFolderInfo(folderId);
    if (!folderInfo) {
      return {
        success: false,
        error: `Não foi possível acessar a pasta "${folderId}". Verifique se o ID está correto e se a pasta está na sua conta Google ou compartilhada com ela (Editor).`,
      };
    }

    // Verificar se é realmente uma pasta
    if (folderInfo.mimeType !== "application/vnd.google-apps.folder") {
      return {
        success: false,
        error: `O ID informado corresponde a um arquivo, não a uma pasta. MimeType: ${folderInfo.mimeType}`,
      };
    }

    // Inserir ou atualizar registro
    await db
      .insert(driveSyncFolders)
      .values({
        name: name || folderInfo.name,
        driveFolderId: folderId,
        driveFolderUrl: folderInfo.webViewLink,
        description,
        syncDirection,
        isActive: true,
        createdById: userId,
      })
      .onConflictDoUpdate({
        target: driveSyncFolders.driveFolderId,
        set: {
          name: name || folderInfo.name,
          driveFolderUrl: folderInfo.webViewLink,
          description,
          syncDirection,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    // Sincronizar imediatamente (não bloqueia o resultado)
    syncFolderWithDatabase(folderId, userId).catch((err) => {
      console.error(`[Drive] Erro na sincronização inicial da pasta ${folderId}:`, err);
    });

    return {
      success: true,
      folderName: folderInfo.name,
    };
  } catch (error) {
    console.error("Erro ao registrar pasta para sincronização:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao registrar pasta",
    };
  }
}

/**
 * Lista todas as pastas configuradas para sincronização
 */
export async function getSyncFolders(): Promise<typeof driveSyncFolders.$inferSelect[]> {
  try {
    return await db
      .select()
      .from(driveSyncFolders)
      .where(eq(driveSyncFolders.isActive, true))
      .orderBy(desc(driveSyncFolders.createdAt));
  } catch (error) {
    console.error("Erro ao listar pastas de sincronização:", error);
    return [];
  }
}

/**
 * Obtém arquivos sincronizados de uma pasta
 */
export async function getSyncedFiles(
  folderId: string,
  options?: {
    isFolder?: boolean;
    parentFileId?: number | null;
  }
): Promise<typeof driveFiles.$inferSelect[]> {
  try {
    let conditions = [eq(driveFiles.driveFolderId, folderId)];

    if (options?.isFolder !== undefined) {
      conditions.push(eq(driveFiles.isFolder, options.isFolder));
    }

    if (options?.parentFileId !== undefined) {
      if (options.parentFileId === null) {
        // Arquivos na raiz (sem parent)
        conditions.push(eq(driveFiles.parentFileId, 0)); // Isso não funcionará bem, precisamos de IS NULL
      } else {
        conditions.push(eq(driveFiles.parentFileId, options.parentFileId));
      }
    }

    return await db
      .select()
      .from(driveFiles)
      .where(and(...conditions))
      .orderBy(desc(driveFiles.isFolder), driveFiles.name);
  } catch (error) {
    console.error("Erro ao obter arquivos sincronizados:", error);
    return [];
  }
}

/**
 * Obtém logs de sincronização
 */
export async function getSyncLogs(
  limit: number = 50
): Promise<typeof driveSyncLogs.$inferSelect[]> {
  try {
    return await db
      .select()
      .from(driveSyncLogs)
      .orderBy(desc(driveSyncLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Erro ao obter logs de sincronização:", error);
    return [];
  }
}

// ==========================================
// SINCRONIZAÇÃO COM PAUTA E INTIMAÇÕES
// ==========================================

/**
 * Sincroniza documento de pauta/intimação com o Drive
 * Evita duplicações verificando se o arquivo já existe
 */
export async function syncPautaDocument(
  processoId: number,
  driveFolderId: string,
  documento: {
    nome: string;
    tipo: "pauta" | "intimacao" | "despacho" | "sentenca" | "outros";
    conteudo?: Buffer;
    url?: string;
    dataDocumento?: Date;
  }
): Promise<{ success: boolean; fileId?: string; message: string }> {
  try {
    // Verificar se pasta existe
    const folderInfo = await getFolderInfo(driveFolderId);
    if (!folderInfo) {
      return { success: false, message: "Pasta do processo não encontrada no Drive" };
    }

    // Mapear tipo para subpasta
    const subpastaMap: Record<string, string> = {
      pauta: "04 - Audiências",
      intimacao: "03 - Decisões e Sentenças",
      despacho: "03 - Decisões e Sentenças",
      sentenca: "03 - Decisões e Sentenças",
      outros: "05 - Outros",
    };

    const subpastaNome = subpastaMap[documento.tipo] || "05 - Outros";
    
    // Buscar ou criar subpasta
    const subpasta = await criarOuEncontrarPasta(subpastaNome, driveFolderId);
    if (!subpasta) {
      return { success: false, message: "Erro ao criar/encontrar subpasta" };
    }

    // Formatar nome do arquivo com data
    let nomeArquivo = documento.nome;
    if (documento.dataDocumento) {
      const dataStr = documento.dataDocumento.toISOString().split("T")[0];
      if (!nomeArquivo.includes(dataStr)) {
        nomeArquivo = `${dataStr}_${nomeArquivo}`;
      }
    }

    // Verificar duplicação
    const arquivoExistente = await findExistingFile(nomeArquivo, subpasta.id);
    if (arquivoExistente) {
      console.log(`[Drive] Documento já existe, pulando: ${nomeArquivo}`);
      return { 
        success: true, 
        fileId: arquivoExistente.id, 
        message: "Documento já sincronizado anteriormente" 
      };
    }

    // Upload do documento
    let resultado: DriveFileInfo | null = null;
    
    if (documento.conteudo) {
      resultado = await uploadFileBuffer(
        documento.conteudo,
        nomeArquivo,
        "application/pdf", // Default para PDF
        subpasta.id,
        `Documento ${documento.tipo} - Processo ${processoId}`,
        { preventDuplicates: true }
      );
    } else if (documento.url) {
      resultado = await uploadFileFromUrl(
        documento.url,
        nomeArquivo,
        "application/pdf",
        subpasta.id,
        `Documento ${documento.tipo} - Processo ${processoId}`
      );
    }

    if (resultado) {
      return {
        success: true,
        fileId: resultado.id,
        message: "Documento sincronizado com sucesso",
      };
    }

    return { success: false, message: "Falha ao fazer upload do documento" };
  } catch (error) {
    console.error("Erro ao sincronizar documento da pauta:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Sincroniza múltiplos documentos de uma pauta/intimação
 * Processa em lote com prevenção de duplicações
 */
export async function syncMultiplePautaDocuments(
  processoId: number,
  driveFolderId: string,
  documentos: Array<{
    nome: string;
    tipo: "pauta" | "intimacao" | "despacho" | "sentenca" | "outros";
    conteudo?: Buffer;
    url?: string;
    dataDocumento?: Date;
  }>
): Promise<{
  total: number;
  sincronizados: number;
  duplicados: number;
  erros: number;
  detalhes: Array<{ nome: string; status: string; message: string }>;
}> {
  const resultado = {
    total: documentos.length,
    sincronizados: 0,
    duplicados: 0,
    erros: 0,
    detalhes: [] as Array<{ nome: string; status: string; message: string }>,
  };

  for (const documento of documentos) {
    const sync = await syncPautaDocument(processoId, driveFolderId, documento);
    
    if (sync.success) {
      if (sync.message.includes("já sincronizado")) {
        resultado.duplicados++;
        resultado.detalhes.push({
          nome: documento.nome,
          status: "duplicado",
          message: sync.message,
        });
      } else {
        resultado.sincronizados++;
        resultado.detalhes.push({
          nome: documento.nome,
          status: "sucesso",
          message: sync.message,
        });
      }
    } else {
      resultado.erros++;
      resultado.detalhes.push({
        nome: documento.nome,
        status: "erro",
        message: sync.message,
      });
    }
  }

  return resultado;
}

/**
 * Cria registro de audiência no Drive (arquivo de texto com informações)
 */
export async function registrarAudienciaNoDrive(
  driveFolderId: string,
  audiencia: {
    data: Date;
    hora: string;
    tipo: string;
    local?: string;
    observacoes?: string;
    numeroProcesso: string;
    nomeAssistido: string;
  }
): Promise<{ success: boolean; fileId?: string; message: string }> {
  try {
    // Buscar ou criar pasta de audiências
    const pastaAudiencias = await criarOuEncontrarPasta("04 - Audiências", driveFolderId);
    if (!pastaAudiencias) {
      return { success: false, message: "Erro ao criar pasta de audiências" };
    }

    // Formatar nome do arquivo
    const dataStr = audiencia.data.toISOString().split("T")[0];
    const nomeArquivo = `${dataStr}_Audiencia_${audiencia.tipo.replace(/\s+/g, "_")}.txt`;

    // Verificar se já existe
    const existente = await findExistingFile(nomeArquivo, pastaAudiencias.id);
    if (existente) {
      return {
        success: true,
        fileId: existente.id,
        message: "Registro de audiência já existe",
      };
    }

    // Criar conteúdo do arquivo
    const conteudo = `REGISTRO DE AUDIÊNCIA
${"=".repeat(50)}

Processo: ${audiencia.numeroProcesso}
Assistido: ${audiencia.nomeAssistido}

Data: ${dataStr}
Horário: ${audiencia.hora}
Tipo: ${audiencia.tipo}
${audiencia.local ? `Local: ${audiencia.local}` : ""}

${audiencia.observacoes ? `\nObservações:\n${audiencia.observacoes}` : ""}

${"=".repeat(50)}
Registrado automaticamente pelo DefensorHub
`;

    const buffer = Buffer.from(conteudo, "utf-8");
    const resultado = await uploadFileBuffer(
      buffer,
      nomeArquivo,
      "text/plain",
      pastaAudiencias.id,
      `Audiência ${audiencia.tipo} - ${dataStr}`,
      { preventDuplicates: true }
    );

    if (resultado) {
      return {
        success: true,
        fileId: resultado.id,
        message: "Registro de audiência criado no Drive",
      };
    }

    return { success: false, message: "Falha ao criar registro" };
  } catch (error) {
    console.error("Erro ao registrar audiência no Drive:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ==========================================
// FUNÇÕES DE GOOGLE DOCS
// ==========================================

/**
 * Cria um novo documento no Google Docs
 * Retorna o ID do documento e a URL para acesso
 */
export async function createGoogleDoc(
  titulo: string,
  conteudo: string,
  folderId?: string
): Promise<{ docId: string; docUrl: string } | null> {
  const config = getConfig();
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.warn("Google Drive não configurado ou token inválido");
    return null;
  }

  try {
    // 1. Criar documento vazio
    const createResponse = await fetch(
      "https://docs.googleapis.com/v1/documents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: titulo }),
      }
    );

    if (!createResponse.ok) {
      console.error("Erro ao criar documento:", await createResponse.text());
      return null;
    }

    const docData = await createResponse.json();
    const docId = docData.documentId;

    // 2. Inserir conteúdo no documento
    if (conteudo.trim()) {
      const updateResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: conteudo,
                },
              },
            ],
          }),
        }
      );

      if (!updateResponse.ok) {
        console.error("Erro ao inserir conteúdo:", await updateResponse.text());
        // Documento foi criado mas sem conteúdo, continuamos mesmo assim
      }
    }

    // 3. Se uma pasta foi especificada, mover o documento para ela
    if (folderId) {
      // Primeiro, obter os parents atuais do documento
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}?fields=parents`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const previousParents = fileData.parents?.join(",") || "";

        // Mover para a nova pasta
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${folderId}&removeParents=${previousParents}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    }

    // URL do documento
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    return { docId, docUrl };
  } catch (error) {
    console.error("Erro ao criar Google Doc:", error);
    return null;
  }
}

/**
 * Atualiza o conteúdo de um documento existente
 */
export async function updateGoogleDoc(
  docId: string,
  conteudo: string
): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    // Primeiro, deletar todo o conteúdo existente
    // Para isso, precisamos obter o tamanho atual do documento
    const docResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!docResponse.ok) {
      console.error("Erro ao obter documento:", await docResponse.text());
      return false;
    }

    const docData = await docResponse.json();
    const endIndex = docData.body?.content?.slice(-1)?.[0]?.endIndex || 1;

    // Requests para limpar e inserir novo conteúdo
    const requests: Array<Record<string, unknown>> = [];

    // Deletar conteúdo existente (se houver)
    if (endIndex > 2) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex - 1,
          },
        },
      });
    }

    // Inserir novo conteúdo
    if (conteudo.trim()) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: conteudo,
        },
      });
    }

    if (requests.length > 0) {
      const updateResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        }
      );

      if (!updateResponse.ok) {
        console.error("Erro ao atualizar documento:", await updateResponse.text());
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao atualizar Google Doc:", error);
    return false;
  }
}

/**
 * Verifica integridade da sincronização entre banco local e Drive
 * Retorna arquivos que existem no banco mas não no Drive e vice-versa
 */
export async function verificarIntegridadeSincronizacao(
  folderId: string
): Promise<{
  apenasNoBanco: Array<{ id: number; nome: string; driveFileId: string }>;
  apenasNoDrive: Array<{ id: string; nome: string }>;
  sincronizados: number;
}> {
  const resultado = {
    apenasNoBanco: [] as Array<{ id: number; nome: string; driveFileId: string }>,
    apenasNoDrive: [] as Array<{ id: string; nome: string }>,
    sincronizados: 0,
  };

  try {
    // Listar arquivos do banco local
    const arquivosBanco = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    // Listar arquivos do Drive
    const arquivosDrive = await listAllFilesRecursively(folderId, 3);
    
    const driveIdsSet = new Set(arquivosDrive.map((f) => f.id));
    const bancoIdsSet = new Set(arquivosBanco.map((f) => f.driveFileId));

    // Arquivos no banco mas não no Drive
    for (const arquivo of arquivosBanco) {
      if (!driveIdsSet.has(arquivo.driveFileId)) {
        resultado.apenasNoBanco.push({
          id: arquivo.id,
          nome: arquivo.name,
          driveFileId: arquivo.driveFileId,
        });
      } else {
        resultado.sincronizados++;
      }
    }

    // Arquivos no Drive mas não no banco
    for (const arquivo of arquivosDrive) {
      if (!bancoIdsSet.has(arquivo.id)) {
        resultado.apenasNoDrive.push({
          id: arquivo.id,
          nome: arquivo.name,
        });
      }
    }

    return resultado;
  } catch (error) {
    console.error("Erro ao verificar integridade:", error);
    return resultado;
  }
}

// ==========================================
// FUNÇÕES DE DISTRIBUIÇÃO HIERÁRQUICA
// ==========================================

import {
  ATRIBUICAO_FOLDER_IDS,
  SPECIAL_FOLDER_IDS,
  toTitleCase,
} from "@/lib/utils/text-extraction";

import type { TipoProcesso } from "./gemini";

// Tipos dependentes (vão dentro de uma AP)
const TIPOS_DEPENDENTES: TipoProcesso[] = ["IP", "APF", "CAUTELAR"];

// Tipos independentes (ficam no nível raiz do assistido)
const TIPOS_INDEPENDENTES: TipoProcesso[] = ["AP", "EP", "MPU", "ANPP", "OUTRO"];

/**
 * Normaliza nome para comparação: remove acentos, lowercase, normaliza espaços
 */
function normNameForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca uma pasta por nome dentro de um parent folder
 * Estratégia: busca exata → busca 'contains' com melhor match
 */
export async function searchFolderByName(
  name: string,
  parentFolderId: string
): Promise<DriveFolder | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // 1. Busca exata por nome (case insensitive no Drive)
    const exactQuery = `name='${name.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const exactResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(exactQuery)}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (exactResponse.ok) {
      const exactData = await exactResponse.json();
      if (exactData.files && exactData.files.length > 0) {
        return {
          id: exactData.files[0].id,
          name: exactData.files[0].name,
          webViewLink: exactData.files[0].webViewLink,
        };
      }
    }

    // 2. Fallback: busca 'contains' com o sobrenome mais distinto
    //    Ex: "Walter Dias de Andrade" → busca por "Andrade" (último sobrenome)
    const words = name.split(/\s+/).filter(w => w.length > 2 && !["da", "de", "do", "das", "dos"].includes(w.toLowerCase()));
    const searchTerm = words.length > 1 ? words[words.length - 1] : words[0] || name;

    const containsQuery = `name contains '${searchTerm.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const containsResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(containsQuery)}&fields=files(id,name,webViewLink)&pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!containsResponse.ok) {
      return null;
    }

    const containsData = await containsResponse.json();
    if (!containsData.files || containsData.files.length === 0) {
      return null;
    }

    // 3. Encontrar melhor match entre os resultados (normalizado, sem acentos)
    const nameNorm = normNameForMatch(name);
    let bestMatch: DriveFolder | null = null;
    let bestSimilarity = 0;

    for (const file of containsData.files) {
      const folderNorm = normNameForMatch(file.name);

      // Match exato (sem acentos)
      if (folderNorm === nameNorm) {
        return { id: file.id, name: file.name, webViewLink: file.webViewLink };
      }

      // Match parcial (um contém o outro)
      if (folderNorm.startsWith(nameNorm) || nameNorm.startsWith(folderNorm)) {
        const similarity = Math.min(nameNorm.length, folderNorm.length) / Math.max(nameNorm.length, folderNorm.length);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = { id: file.id, name: file.name, webViewLink: file.webViewLink };
        }
        continue;
      }

      // Levenshtein similarity (>85% para evitar falsos positivos)
      const maxLen = Math.max(nameNorm.length, folderNorm.length);
      if (maxLen > 0) {
        let d = 0;
        const s1 = nameNorm, s2 = folderNorm;
        const matrix: number[][] = [];
        for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
        for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= s1.length; i++) {
          for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
          }
        }
        d = matrix[s1.length][s2.length];
        const similarity = 1 - d / maxLen;
        if (similarity > 0.85 && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = { id: file.id, name: file.name, webViewLink: file.webViewLink };
        }
      }
    }

    return bestMatch;
  } catch (error) {
    console.error("Erro ao buscar pasta:", error);
    return null;
  }
}

/**
 * Busca pastas que contenham parte do nome (para homonímia)
 */
export async function searchFoldersByPartialName(
  partialName: string,
  parentFolderId: string,
  limit = 10
): Promise<DriveFolder[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const query = `name contains '${partialName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink,
    }));
  } catch (error) {
    console.error("Erro ao buscar pastas:", error);
    return [];
  }
}

/**
 * Lista todas as subpastas de uma pasta
 */
export async function listSubfolders(folderId: string): Promise<DriveFolder[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&orderBy=name&pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink,
    }));
  } catch (error) {
    console.error("Erro ao listar subpastas:", error);
    return [];
  }
}

/**
 * Mapeia atribuicaoEnum do banco para chave do ATRIBUICAO_FOLDER_IDS
 */
export function mapAtribuicaoToFolderKey(
  atribuicao: string
): "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI" | null {
  const mapping: Record<string, "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI"> = {
    JURI_CAMACARI: "JURI",
    GRUPO_JURI: "GRUPO_JURI",
    VVD_CAMACARI: "VVD",
    EXECUCAO_PENAL: "EP",
    SUBSTITUICAO: "SUBSTITUICAO",
    SUBSTITUICAO_CIVEL: "SUBSTITUICAO",
  };
  return mapping[atribuicao] || null;
}

/**
 * Cria pasta do assistido na estrutura hierárquica
 * Hierarquia: Atribuição → Assistido (Title Case) → Processo → Documentos
 *
 * @param atribuicao - JURI, VVD, EP ou SUBSTITUICAO (ou valor do enum do banco)
 * @param nomeAssistido - Nome do assistido (será convertido para Title Case)
 * @returns Pasta criada ou existente
 */
export async function createOrFindAssistidoFolder(
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI",
  nomeAssistido: string
): Promise<DriveFolder | null> {
  const parentFolderId = ATRIBUICAO_FOLDER_IDS[atribuicao];
  const nomePasta = toTitleCase(nomeAssistido);

  // Primeiro, buscar pasta existente
  const existente = await searchFolderByName(nomePasta, parentFolderId);
  if (existente) {
    return existente;
  }

  // Se não existe, criar
  return await createFolder(nomePasta, parentFolderId);
}

/**
 * Move pasta de assistido para outra atribuição no Drive
 * Usado quando atribuicaoPrimaria muda
 *
 * @param folderId - Google Drive folder ID da pasta do assistido
 * @param oldAtribuicao - Atribuição antiga (JURI, VVD, EP, SUBSTITUICAO)
 * @param newAtribuicao - Nova atribuição
 * @returns Resultado da operação
 */
export async function moveAssistidoFolder(
  folderId: string,
  oldAtribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI",
  newAtribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI"
): Promise<{ success: boolean; error?: string }> {
  if (oldAtribuicao === newAtribuicao) {
    return { success: true };
  }

  const oldParentId = ATRIBUICAO_FOLDER_IDS[oldAtribuicao];
  const newParentId = ATRIBUICAO_FOLDER_IDS[newAtribuicao];

  if (!oldParentId || !newParentId) {
    return { success: false, error: "Pasta raiz da atribuição não configurada" };
  }

  const result = await moveFileInDrive(folderId, newParentId, oldParentId);
  if (!result) {
    return { success: false, error: "Erro ao mover pasta no Drive" };
  }

  return { success: true };
}

/**
 * Resolve a hierarquia de um arquivo no Drive para auto-link
 * Sobe na árvore de parentFileId até encontrar match com assistido ou processo
 *
 * @param dbFileId - ID do arquivo no banco (driveFiles.id)
 * @returns { assistidoId, processoId, categoria, confidence }
 */
export async function resolveFileHierarchy(
  dbFileId: number
): Promise<{
  assistidoId: number | null;
  processoId: number | null;
  categoria: string | null;
  confidence: "high" | "medium" | "low" | "none";
}> {
  const noResult = { assistidoId: null, processoId: null, categoria: null, confidence: "none" as const };

  try {
    // Buscar arquivo e seus ancestrais
    const [file] = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.id, dbFileId))
      .limit(1);

    if (!file) return noResult;

    // Se já tem links, retornar
    if (file.assistidoId || file.processoId) {
      return {
        assistidoId: file.assistidoId,
        processoId: file.processoId,
        categoria: file.categoria,
        confidence: "high",
      };
    }

    // Detectar categoria pela subpasta padrão (01-05)
    let categoria: string | null = null;
    let currentParentId = file.parentFileId;
    const CATEGORIA_MAP: Record<string, string> = {
      "01": "documentos_pessoais",
      "02": "pecas_protocoladas",
      "03": "decisoes_sentencas",
      "04": "audiencias",
      "05": "outros",
    };

    // Subir na hierarquia (max 5 níveis)
    for (let depth = 0; depth < 5 && currentParentId; depth++) {
      const [parent] = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.id, currentParentId))
        .limit(1);

      if (!parent) break;

      // Detectar categoria pelo nome da pasta (01 - xxx, 02 - xxx)
      if (parent.isFolder && parent.name) {
        const prefix = parent.name.substring(0, 2);
        if (CATEGORIA_MAP[prefix] && !categoria) {
          categoria = CATEGORIA_MAP[prefix];
        }
      }

      // Tentar match com processo (por driveFolderId)
      if (parent.isFolder && parent.driveFileId) {
        const [matchedProcesso] = await db
          .select({ id: processos.id, assistidoId: processos.assistidoId })
          .from(processos)
          .where(eq(processos.driveFolderId, parent.driveFileId))
          .limit(1);

        if (matchedProcesso) {
          return {
            assistidoId: matchedProcesso.assistidoId,
            processoId: matchedProcesso.id,
            categoria,
            confidence: "high",
          };
        }
      }

      // Tentar match com assistido (por driveFolderId)
      if (parent.isFolder && parent.driveFileId) {
        const [matchedAssistido] = await db
          .select({ id: assistidos.id })
          .from(assistidos)
          .where(eq(assistidos.driveFolderId, parent.driveFileId))
          .limit(1);

        if (matchedAssistido) {
          return {
            assistidoId: matchedAssistido.id,
            processoId: null,
            categoria,
            confidence: "high",
          };
        }
      }

      currentParentId = parent.parentFileId;
    }

    // Fallback: tentar detecção por nome (método antigo)
    const fallback = await autoLinkFileToProcesso(file.driveFileId, dbFileId);
    if (fallback.linked) {
      return {
        assistidoId: fallback.assistidoId,
        processoId: fallback.processoId,
        categoria,
        confidence: "medium",
      };
    }

    return { ...noResult, categoria };
  } catch (error) {
    console.error("Erro ao resolver hierarquia:", error);
    return noResult;
  }
}

/**
 * Auto-link batch: resolve hierarquia para múltiplos arquivos
 */
export async function autoLinkByHierarchy(
  fileIds: number[]
): Promise<{ linked: number; errors: number }> {
  let linked = 0;
  let errors = 0;

  for (const fileId of fileIds) {
    try {
      const result = await resolveFileHierarchy(fileId);
      if (result.assistidoId || result.processoId) {
        await db
          .update(driveFiles)
          .set({
            assistidoId: result.assistidoId,
            processoId: result.processoId,
            categoria: result.categoria,
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, fileId));
        linked++;
      }
    } catch {
      errors++;
    }
  }

  return { linked, errors };
}

/**
 * Cria pasta do processo dentro da pasta do assistido
 *
 * @param assistidoFolderId - ID da pasta do assistido
 * @param numeroProcesso - Número do processo (será usado como nome da pasta)
 * @returns Pasta criada ou existente
 */
export async function createOrFindProcessoFolder(
  assistidoFolderId: string,
  numeroProcesso: string
): Promise<DriveFolder | null> {
  // Primeiro, buscar pasta existente
  const existente = await searchFolderByName(numeroProcesso, assistidoFolderId);
  if (existente) {
    return existente;
  }

  // Se não existe, criar
  return await createFolder(numeroProcesso, assistidoFolderId);
}

/**
 * Lista arquivos pendentes na pasta de Distribuição
 */
export async function listDistributionPendingFiles(): Promise<DriveFileInfo[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const folderId = SPECIAL_FOLDER_IDS.DISTRIBUICAO;
    const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,thumbnailLink,parents)&orderBy=createdTime desc&pageSize=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Erro ao listar arquivos de distribuição:", error);
    return [];
  }
}

/**
 * Move arquivo para a pasta correta na estrutura hierárquica
 * e atualiza a pasta de origem (remove da Distribuição)
 */
export async function distributeFileToPasta(
  fileId: string,
  targetFolderId: string,
  sourceFolderId?: string
): Promise<DriveFileInfo | null> {
  return await moveFileInDrive(
    fileId,
    targetFolderId,
    sourceFolderId || SPECIAL_FOLDER_IDS.DISTRIBUICAO
  );
}

/**
 * Fluxo completo de distribuição:
 * 1. Cria pasta do assistido se não existir
 * 2. Cria pasta do processo se não existir
 * 3. Move arquivo para pasta do processo
 *
 * @returns { assistidoFolder, processoFolder, movedFile }
 */
export async function distributeFileComplete(
  fileId: string,
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI",
  nomeAssistido: string,
  numeroProcesso: string
): Promise<{
  success: boolean;
  assistidoFolder: DriveFolder | null;
  processoFolder: DriveFolder | null;
  movedFile: DriveFileInfo | null;
  error?: string;
}> {
  try {
    // 1. Criar ou encontrar pasta do assistido
    const assistidoFolder = await createOrFindAssistidoFolder(
      atribuicao,
      nomeAssistido
    );
    if (!assistidoFolder) {
      return {
        success: false,
        assistidoFolder: null,
        processoFolder: null,
        movedFile: null,
        error: "Não foi possível criar pasta do assistido",
      };
    }

    // 2. Criar ou encontrar pasta do processo
    const processoFolder = await createOrFindProcessoFolder(
      assistidoFolder.id,
      numeroProcesso
    );
    if (!processoFolder) {
      return {
        success: false,
        assistidoFolder,
        processoFolder: null,
        movedFile: null,
        error: "Não foi possível criar pasta do processo",
      };
    }

    // 3. Mover arquivo
    const movedFile = await distributeFileToPasta(fileId, processoFolder.id);
    if (!movedFile) {
      return {
        success: false,
        assistidoFolder,
        processoFolder,
        movedFile: null,
        error: "Não foi possível mover o arquivo",
      };
    }

    return {
      success: true,
      assistidoFolder,
      processoFolder,
      movedFile,
    };
  } catch (error) {
    console.error("Erro na distribuição completa:", error);
    return {
      success: false,
      assistidoFolder: null,
      processoFolder: null,
      movedFile: null,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Obtém contagem de arquivos em uma pasta
 */
export async function getFileCountInFolder(folderId: string): Promise<number> {
  const accessToken = await getAccessToken();
  if (!accessToken) return 0;

  try {
    const query = `'${folderId}' in parents and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return (data.files || []).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Lista pastas de assistidos com contagem de processos
 */
export async function listAssistidoFoldersWithCount(
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI"
): Promise<Array<DriveFolder & { processoCount: number }>> {
  const parentFolderId = ATRIBUICAO_FOLDER_IDS[atribuicao];
  const folders = await listSubfolders(parentFolderId);

  // Para cada pasta, obter contagem de subpastas (processos)
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const subfolders = await listSubfolders(folder.id);
      return {
        ...folder,
        processoCount: subfolders.length,
      };
    })
  );

  return foldersWithCount;
}

// ==========================================
// DISTRIBUIÇÃO INTELIGENTE - HIERARQUIA AP
// ==========================================

/**
 * Formata nome da pasta do processo com prefixo do tipo
 *
 * @example
 * formatProcessoFolderName("AP", "0000123-45.2024.8.05.0047") // "AP 0000123-45.2024.8.05.0047"
 * formatProcessoFolderName("EP", "0000456-78.2024.8.05.0047") // "EP 0000456-78.2024.8.05.0047"
 */
export function formatProcessoFolderName(
  tipoProcesso: TipoProcesso,
  numeroProcesso: string
): string {
  // Para tipos independentes, usar prefixo
  if (TIPOS_INDEPENDENTES.includes(tipoProcesso)) {
    return `${tipoProcesso} ${numeroProcesso}`;
  }
  // Para tipos dependentes dentro de AP, não usar prefixo no número
  return numeroProcesso;
}

/**
 * Busca pasta de AP existente pelo número no assistido
 */
export async function findApFolderByNumber(
  assistidoFolderId: string,
  apNumber: string
): Promise<DriveFolder | null> {
  const folders = await listSubfolders(assistidoFolderId);

  // Buscar pasta que começa com "AP " e contém o número
  for (const folder of folders) {
    if (folder.name.startsWith("AP ") && folder.name.includes(apNumber)) {
      return folder;
    }
    // Também buscar por número exato (caso antigo)
    if (folder.name === apNumber || folder.name.includes(apNumber)) {
      return folder;
    }
  }

  return null;
}

/**
 * Lista processos avulsos (IP/APF/Cautelares sem AP vinculada) de um assistido
 */
export async function listProcessosAvulsos(
  assistidoFolderId: string
): Promise<Array<DriveFolder & { tipoProcesso: TipoProcesso }>> {
  const folders = await listSubfolders(assistidoFolderId);
  const avulsos: Array<DriveFolder & { tipoProcesso: TipoProcesso }> = [];

  for (const folder of folders) {
    const name = folder.name.toUpperCase();

    // Identificar tipo pelo prefixo ou padrão
    let tipoProcesso: TipoProcesso | null = null;

    if (name.startsWith("IP ") || name.includes("INQUÉRITO") || name.includes("INQUERITO")) {
      tipoProcesso = "IP";
    } else if (name.startsWith("APF ") || name.includes("FLAGRANTE")) {
      tipoProcesso = "APF";
    } else if (name.includes("CAUTELAR") || name.includes("PREVENTIVA") || name.includes("TEMPORÁRIA")) {
      tipoProcesso = "CAUTELAR";
    }

    // Se é um tipo dependente no nível raiz, é avulso
    if (tipoProcesso && TIPOS_DEPENDENTES.includes(tipoProcesso)) {
      avulsos.push({
        ...folder,
        tipoProcesso,
      });
    }
  }

  return avulsos;
}

/**
 * Move uma pasta de processo avulso para dentro de uma AP
 */
export async function moveProcessoToAp(
  processoFolderId: string,
  apFolderId: string,
  tipoProcesso: TipoProcesso
): Promise<DriveFolder | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Primeiro, obter info da pasta para saber parent atual
    const infoResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${processoFolderId}?fields=id,name,parents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!infoResponse.ok) return null;
    const info = await infoResponse.json();

    // Criar subpasta do tipo dentro da AP se não existir
    let tipoFolder = await searchFolderByName(tipoProcesso, apFolderId);
    if (!tipoFolder) {
      tipoFolder = await createFolder(tipoProcesso, apFolderId);
    }
    if (!tipoFolder) return null;

    // Mover a pasta do processo para dentro da pasta do tipo
    const currentParent = info.parents?.[0];
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${processoFolderId}?addParents=${tipoFolder.id}&removeParents=${currentParent}&fields=id,name,webViewLink`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Erro ao mover processo para AP:", error);
    return null;
  }
}

/**
 * Cria pasta do processo com estrutura hierárquica inteligente
 *
 * - AP, EP, MPU, ANPP: pasta no nível raiz do assistido com prefixo
 * - IP, APF, Cautelar: subpasta dentro da AP relacionada (ou avulso se não houver AP)
 */
export async function createOrFindProcessoFolderHierarchical(
  assistidoFolderId: string,
  numeroProcesso: string,
  tipoProcesso: TipoProcesso,
  apRelacionada?: string | null
): Promise<{
  folder: DriveFolder | null;
  isAvulso: boolean;
  apFolder?: DriveFolder | null;
}> {
  // 1. Se é tipo independente, criar no nível raiz
  if (TIPOS_INDEPENDENTES.includes(tipoProcesso)) {
    const folderName = formatProcessoFolderName(tipoProcesso, numeroProcesso);

    // Buscar existente
    let folder = await searchFolderByName(folderName, assistidoFolderId);

    // Também buscar sem prefixo (compatibilidade com pastas antigas)
    if (!folder) {
      folder = await searchFolderByName(numeroProcesso, assistidoFolderId);
    }

    // Criar se não existe
    if (!folder) {
      folder = await createFolder(folderName, assistidoFolderId);
    }

    return { folder, isAvulso: false };
  }

  // 2. É tipo dependente (IP, APF, Cautelar) - tentar encontrar AP relacionada
  let apFolder: DriveFolder | null = null;

  if (apRelacionada) {
    apFolder = await findApFolderByNumber(assistidoFolderId, apRelacionada);
  }

  // 3. Se encontrou AP, criar subpasta dentro dela
  if (apFolder) {
    // Criar pasta do tipo (IP, APF, CAUTELAR) dentro da AP
    let tipoFolder = await searchFolderByName(tipoProcesso, apFolder.id);
    if (!tipoFolder) {
      tipoFolder = await createFolder(tipoProcesso, apFolder.id);
    }

    if (tipoFolder) {
      // Criar pasta do processo dentro da pasta do tipo
      let processoFolder = await searchFolderByName(numeroProcesso, tipoFolder.id);
      if (!processoFolder) {
        processoFolder = await createFolder(numeroProcesso, tipoFolder.id);
      }

      return { folder: processoFolder, isAvulso: false, apFolder };
    }
  }

  // 4. Não encontrou AP - criar como avulso no nível raiz com prefixo
  const folderName = `${tipoProcesso} ${numeroProcesso}`;
  let folder = await searchFolderByName(folderName, assistidoFolderId);
  if (!folder) {
    folder = await createFolder(folderName, assistidoFolderId);
  }

  return { folder, isAvulso: true };
}

/**
 * Distribuição inteligente com hierarquia AP → dependentes
 *
 * Fluxo:
 * 1. Cria/encontra pasta do assistido
 * 2. Determina estrutura baseado no tipo de processo
 * 3. Move arquivo para pasta correta
 * 4. Se criou AP nova, busca processos avulsos para sugerir vinculação
 */
export async function distributeFileIntelligent(
  fileId: string,
  atribuicao: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI",
  nomeAssistido: string,
  numeroProcesso: string,
  tipoProcesso: TipoProcesso,
  apRelacionada?: string | null
): Promise<{
  success: boolean;
  assistidoFolder: DriveFolder | null;
  processoFolder: DriveFolder | null;
  movedFile: DriveFileInfo | null;
  isAvulso: boolean;
  apFolder?: DriveFolder | null;
  processosAvulsos?: Array<DriveFolder & { tipoProcesso: TipoProcesso }>;
  error?: string;
}> {
  try {
    // 1. Criar ou encontrar pasta do assistido
    const assistidoFolder = await createOrFindAssistidoFolder(
      atribuicao,
      nomeAssistido
    );
    if (!assistidoFolder) {
      return {
        success: false,
        assistidoFolder: null,
        processoFolder: null,
        movedFile: null,
        isAvulso: false,
        error: "Não foi possível criar pasta do assistido",
      };
    }

    // 2. Criar pasta do processo com hierarquia inteligente
    const { folder: processoFolder, isAvulso, apFolder } =
      await createOrFindProcessoFolderHierarchical(
        assistidoFolder.id,
        numeroProcesso,
        tipoProcesso,
        apRelacionada
      );

    if (!processoFolder) {
      return {
        success: false,
        assistidoFolder,
        processoFolder: null,
        movedFile: null,
        isAvulso: false,
        error: "Não foi possível criar pasta do processo",
      };
    }

    // 3. Mover arquivo
    const movedFile = await distributeFileToPasta(fileId, processoFolder.id);
    if (!movedFile) {
      return {
        success: false,
        assistidoFolder,
        processoFolder,
        movedFile: null,
        isAvulso,
        apFolder,
        error: "Não foi possível mover o arquivo",
      };
    }

    // 4. Se criou uma AP nova, buscar processos avulsos para sugerir vinculação
    let processosAvulsos: Array<DriveFolder & { tipoProcesso: TipoProcesso }> = [];
    if (tipoProcesso === "AP") {
      processosAvulsos = await listProcessosAvulsos(assistidoFolder.id);
    }

    return {
      success: true,
      assistidoFolder,
      processoFolder,
      movedFile,
      isAvulso,
      apFolder,
      processosAvulsos,
    };
  } catch (error) {
    console.error("Erro na distribuição inteligente:", error);
    return {
      success: false,
      assistidoFolder: null,
      processoFolder: null,
      movedFile: null,
      isAvulso: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
