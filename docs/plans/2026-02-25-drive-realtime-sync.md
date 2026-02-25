# Drive Real-Time Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace full-listing Drive sync with incremental Changes API, auto-manage webhook lifecycle, and add health monitoring.

**Architecture:** Webhook notification triggers Inngest job that calls `changes.list` with stored `syncToken` cursor, processing only the delta. A daily CRON renews webhook channels before expiry. A health check CRON monitors sync health and alerts admins.

**Tech Stack:** Google Drive API v3 (direct fetch), Inngest (jobs/crons), Drizzle ORM, tRPC, React

---

### Task 1: Add Changes API functions to google-drive.ts

**Files:**
- Modify: `src/lib/services/google-drive.ts` (add after `getAccessToken()` at line ~140)

**Step 1: Add `getChangesStartPageToken()` function**

Add after the `getAccessToken()` function (after line 139):

```typescript
/**
 * Gets the initial page token for the Changes API.
 * This represents "right now" — future changes.list calls with this token
 * will return only changes that happened after this point.
 */
export async function getChangesStartPageToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const res = await fetch(
    'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.error('[Drive] Failed to get startPageToken:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.startPageToken || null;
}
```

**Step 2: Add `watchChanges()` function**

```typescript
/**
 * Registers a webhook channel with Google Drive Changes API.
 * Google will POST to our webhook endpoint when changes occur.
 * Maximum TTL: 7 days for changes resource.
 */
export async function watchChanges(
  pageToken: string,
  webhookUrl: string,
  webhookSecret?: string
): Promise<{ channelId: string; resourceId: string; expiration: Date } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const channelId = crypto.randomUUID();
  // 6 days — renew 24h before the 7-day max
  const expirationMs = Date.now() + 6 * 24 * 60 * 60 * 1000;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${encodeURIComponent(pageToken)}&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: webhookSecret || '',
        expiration: String(expirationMs),
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Drive] Failed to register watch channel:', res.status, errText);
    return null;
  }

  const data = await res.json();
  return {
    channelId: data.id,
    resourceId: data.resourceId,
    expiration: new Date(parseInt(data.expiration)),
  };
}
```

**Step 3: Add `stopChannel()` function**

```typescript
/**
 * Stops a webhook channel. Must be called when renewing (old channel)
 * or when unregistering a folder.
 */
export async function stopChannel(
  channelId: string,
  resourceId: string
): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const res = await fetch('https://www.googleapis.com/drive/v3/channels/stop', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });

  if (!res.ok) {
    // 404 means channel already expired — not an error
    if (res.status === 404) return true;
    console.error('[Drive] Failed to stop channel:', res.status, await res.text());
    return false;
  }

  return true;
}
```

**Step 4: Add `syncIncremental()` function**

This is the core replacement for `syncFolderWithDatabase()` when a syncToken is available.

```typescript
/**
 * Incremental sync using the Changes API.
 * Only fetches files that changed since the last syncToken.
 * Falls back to full sync if token is invalidated (410 Gone).
 *
 * @returns SyncResult with newFileIds for enrichment pipeline
 */
export async function syncIncremental(
  folderId: string,
  syncToken: string,
  userId?: number
): Promise<{ result: SyncResult; newSyncToken: string | null }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      result: { success: false, filesAdded: 0, filesUpdated: 0, filesRemoved: 0, errors: ['No access token'], newFileIds: [] },
      newSyncToken: null,
    };
  }

  // Log sync start
  try {
    await db.insert(driveSyncLogs).values({
      action: 'incremental_sync_started',
      status: 'info',
      details: JSON.stringify({ folderId, tokenPrefix: syncToken.substring(0, 10) }),
      userId: userId || null,
    });
  } catch {}

  let pageToken = syncToken;
  let newSyncToken: string | null = null;
  let filesAdded = 0;
  let filesUpdated = 0;
  let filesRemoved = 0;
  const errors: string[] = [];
  const newFileIds: number[] = [];

  // Load existing files for this folder to match against
  const existingFiles = await db
    .select({ id: driveFiles.id, driveFileId: driveFiles.driveFileId })
    .from(driveFiles)
    .where(eq(driveFiles.driveFolderId, folderId));
  const existingMap = new Map(existingFiles.map(f => [f.driveFileId, f.id]));

  try {
    let hasMore = true;

    while (hasMore) {
      const fields = [
        'nextPageToken', 'newStartPageToken',
        'changes/fileId', 'changes/removed', 'changes/time',
        'changes/file/id', 'changes/file/name', 'changes/file/mimeType',
        'changes/file/modifiedTime', 'changes/file/parents',
        'changes/file/trashed', 'changes/file/size', 'changes/file/md5Checksum',
        'changes/file/webViewLink', 'changes/file/iconLink',
        'changes/file/thumbnailLink',
      ].join(',');

      const url = `https://www.googleapis.com/drive/v3/changes?pageToken=${encodeURIComponent(pageToken)}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&includeRemoved=true&fields=${encodeURIComponent(fields)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 410) {
        // Token invalidated — need full rebuild
        console.warn('[Drive] Sync token invalidated (410 Gone) for folder', folderId);
        return {
          result: { success: false, filesAdded: 0, filesUpdated: 0, filesRemoved: 0, errors: ['SYNC_TOKEN_INVALIDATED'], newFileIds: [] },
          newSyncToken: null,
        };
      }

      if (!res.ok) {
        const errText = await res.text();
        errors.push(`Changes API error: ${res.status} ${errText}`);
        break;
      }

      const data = await res.json();

      for (const change of data.changes || []) {
        const fileId = change.fileId;
        if (!fileId) continue;

        // File removed or trashed
        if (change.removed || change.file?.trashed) {
          const existingId = existingMap.get(fileId);
          if (existingId) {
            await db.delete(driveFiles).where(eq(driveFiles.driveFileId, fileId));
            existingMap.delete(fileId);
            filesRemoved++;
          }
          continue;
        }

        const file = change.file;
        if (!file) continue;

        // Check if file belongs to our watched folder hierarchy
        // (Changes API returns ALL changes, not just our folder)
        const belongsToFolder = file.parents?.includes(folderId);

        // Also check if it's a file we already track (might have moved within our tree)
        const existingId = existingMap.get(fileId);

        if (!belongsToFolder && !existingId) {
          // File doesn't belong to our folder and we don't track it — skip
          continue;
        }

        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

        if (existingId) {
          // Update existing file
          await db.update(driveFiles)
            .set({
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? String(file.size) : null,
              driveChecksum: file.md5Checksum || null,
              driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
              webViewLink: file.webViewLink || null,
              iconLink: file.iconLink || null,
              thumbnailLink: file.thumbnailLink || null,
              syncStatus: 'synced',
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.id, existingId));
          filesUpdated++;
        } else if (belongsToFolder) {
          // New file in our folder
          const [inserted] = await db.insert(driveFiles)
            .values({
              driveFileId: fileId,
              driveFolderId: folderId,
              name: file.name,
              mimeType: file.mimeType,
              isFolder,
              size: file.size ? String(file.size) : null,
              driveChecksum: file.md5Checksum || null,
              driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
              webViewLink: file.webViewLink || null,
              iconLink: file.iconLink || null,
              thumbnailLink: file.thumbnailLink || null,
              syncStatus: 'synced',
            })
            .returning({ id: driveFiles.id });

          if (inserted) {
            newFileIds.push(inserted.id);
            existingMap.set(fileId, inserted.id);
          }
          filesAdded++;
        }
      }

      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else if (data.newStartPageToken) {
        newSyncToken = data.newStartPageToken;
        hasMore = false;
      } else {
        hasMore = false;
      }
    }
  } catch (err: any) {
    errors.push(err.message || String(err));
  }

  // Update lastSyncAt
  await db.update(driveSyncFolders)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(driveSyncFolders.driveFolderId, folderId));

  // Save the new sync token
  if (newSyncToken) {
    await db.update(driveSyncFolders)
      .set({ syncToken: newSyncToken, updatedAt: new Date() })
      .where(eq(driveSyncFolders.driveFolderId, folderId));
  }

  // Log completion
  try {
    await db.insert(driveSyncLogs).values({
      action: 'incremental_sync_completed',
      status: errors.length > 0 ? 'warning' : 'success',
      details: JSON.stringify({ folderId, filesAdded, filesUpdated, filesRemoved, newFileIds: newFileIds.length }),
      userId: userId || null,
    });
  } catch {}

  return {
    result: {
      success: errors.length === 0,
      filesAdded,
      filesUpdated,
      filesRemoved,
      errors,
      newFileIds,
    },
    newSyncToken,
  };
}
```

**Step 5: Add `smartSync()` function**

This is the top-level entry point that decides between incremental and full sync:

```typescript
/**
 * Smart sync: uses incremental (Changes API) when syncToken is available,
 * falls back to full listing when not.
 * Handles 410 Gone by clearing token and doing a full rebuild.
 */
export async function smartSync(
  folderId: string,
  userId?: number
): Promise<SyncResult> {
  // Check for existing syncToken
  const [folder] = await db
    .select({ syncToken: driveSyncFolders.syncToken })
    .from(driveSyncFolders)
    .where(eq(driveSyncFolders.driveFolderId, folderId))
    .limit(1);

  if (folder?.syncToken) {
    // Try incremental sync
    const { result, newSyncToken } = await syncIncremental(folderId, folder.syncToken, userId);

    if (result.errors.includes('SYNC_TOKEN_INVALIDATED')) {
      // Token invalidated — clear it and do full rebuild
      console.warn('[Drive] Token invalidated, falling back to full sync for', folderId);
      await db.update(driveSyncFolders)
        .set({ syncToken: null, updatedAt: new Date() })
        .where(eq(driveSyncFolders.driveFolderId, folderId));

      // Full sync + save new token
      const fullResult = await syncFolderWithDatabase(folderId, userId);
      const newToken = await getChangesStartPageToken();
      if (newToken) {
        await db.update(driveSyncFolders)
          .set({ syncToken: newToken, updatedAt: new Date() })
          .where(eq(driveSyncFolders.driveFolderId, folderId));
      }
      return fullResult;
    }

    return result;
  }

  // No syncToken — do full sync and save initial token
  const fullResult = await syncFolderWithDatabase(folderId, userId);
  const newToken = await getChangesStartPageToken();
  if (newToken) {
    await db.update(driveSyncFolders)
      .set({ syncToken: newToken, updatedAt: new Date() })
      .where(eq(driveSyncFolders.driveFolderId, folderId));
  }
  return fullResult;
}
```

**Step 6: Add webhook registration helper**

```typescript
/**
 * Registers a webhook channel for a folder and saves to driveWebhooks table.
 * Called automatically when a folder is registered for sync.
 */
export async function registerWebhookForFolder(
  folderId: string,
  webhookBaseUrl: string
): Promise<{ channelId: string; expiration: Date } | null> {
  // Get or create syncToken for this folder
  const [folder] = await db
    .select({ syncToken: driveSyncFolders.syncToken })
    .from(driveSyncFolders)
    .where(eq(driveSyncFolders.driveFolderId, folderId))
    .limit(1);

  let syncToken = folder?.syncToken;
  if (!syncToken) {
    syncToken = await getChangesStartPageToken();
    if (!syncToken) return null;

    await db.update(driveSyncFolders)
      .set({ syncToken, updatedAt: new Date() })
      .where(eq(driveSyncFolders.driveFolderId, folderId));
  }

  const webhookUrl = `${webhookBaseUrl}/api/webhooks/drive`;
  const webhookSecret = process.env.DRIVE_WEBHOOK_SECRET || '';

  const result = await watchChanges(syncToken, webhookUrl, webhookSecret);
  if (!result) return null;

  // Save to driveWebhooks table
  await db.insert(driveWebhooks).values({
    channelId: result.channelId,
    resourceId: result.resourceId,
    folderId,
    expiration: result.expiration,
    isActive: true,
  }).onConflictDoUpdate({
    target: driveWebhooks.channelId,
    set: {
      resourceId: result.resourceId,
      expiration: result.expiration,
      isActive: true,
    },
  });

  return { channelId: result.channelId, expiration: result.expiration };
}
```

**Step 7: Add `renewExpiringChannels()` function**

```typescript
/**
 * Finds webhook channels expiring in the next 24 hours and renews them.
 * Uses the overlap strategy: new channel registered before old one expires.
 */
export async function renewExpiringChannels(
  webhookBaseUrl: string
): Promise<{ renewed: number; failed: number; errors: string[] }> {
  const renewalWindow = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

  const expiringChannels = await db
    .select()
    .from(driveWebhooks)
    .where(
      and(
        eq(driveWebhooks.isActive, true),
        sql`${driveWebhooks.expiration} < ${renewalWindow}`
      )
    );

  let renewed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const channel of expiringChannels) {
    try {
      // Register new channel
      const newChannel = await registerWebhookForFolder(channel.folderId, webhookBaseUrl);
      if (!newChannel) {
        failed++;
        errors.push(`Failed to register new channel for folder ${channel.folderId}`);
        continue;
      }

      // Stop old channel
      if (channel.resourceId) {
        await stopChannel(channel.channelId, channel.resourceId);
      }

      // Deactivate old channel in DB
      await db.update(driveWebhooks)
        .set({ isActive: false })
        .where(eq(driveWebhooks.id, channel.id));

      renewed++;
    } catch (err: any) {
      failed++;
      errors.push(`Error renewing channel ${channel.channelId}: ${err.message}`);
    }
  }

  return { renewed, failed, errors };
}
```

**Step 8: Add `checkSyncHealth()` function**

```typescript
export type SyncHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface SyncHealthResult {
  status: SyncHealthStatus;
  issues: string[];
  expiredChannels: number;
  staleFolders: number;
  recentErrors: number;
  lastSyncAgo: number | null; // minutes
}

/**
 * Checks the health of the Drive sync system.
 */
export async function checkSyncHealth(): Promise<SyncHealthResult> {
  const issues: string[] = [];
  let status: SyncHealthStatus = 'healthy';

  // 1. Check for expired channels still marked active
  const expiredChannels = await db
    .select({ id: driveWebhooks.id })
    .from(driveWebhooks)
    .where(
      and(
        eq(driveWebhooks.isActive, true),
        sql`${driveWebhooks.expiration} < NOW()`
      )
    );

  if (expiredChannels.length > 0) {
    issues.push(`${expiredChannels.length} webhook channel(s) expired without renewal`);
    status = 'critical';
  }

  // 2. Check for stale folders (no sync in 30+ minutes)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const staleFolders = await db
    .select({ id: driveSyncFolders.id, name: driveSyncFolders.name })
    .from(driveSyncFolders)
    .where(
      and(
        eq(driveSyncFolders.isActive, true),
        or(
          sql`${driveSyncFolders.lastSyncAt} < ${thirtyMinAgo}`,
          sql`${driveSyncFolders.lastSyncAt} IS NULL`
        )
      )
    );

  if (staleFolders.length > 0) {
    issues.push(`${staleFolders.length} folder(s) not synced in 30+ min`);
    if (status !== 'critical') status = 'degraded';
  }

  // 3. Check for recent errors (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [errorCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(driveSyncLogs)
    .where(
      and(
        eq(driveSyncLogs.status, 'error'),
        sql`${driveSyncLogs.createdAt} > ${oneHourAgo}`
      )
    );

  const recentErrors = errorCount?.count || 0;
  if (recentErrors > 3) {
    issues.push(`${recentErrors} sync errors in the last hour`);
    if (status !== 'critical') status = 'degraded';
  }

  // 4. Get most recent sync time across all folders
  const [latestSync] = await db
    .select({ lastSyncAt: sql<Date>`MAX(${driveSyncFolders.lastSyncAt})` })
    .from(driveSyncFolders)
    .where(eq(driveSyncFolders.isActive, true));

  const lastSyncAgo = latestSync?.lastSyncAt
    ? Math.round((Date.now() - new Date(latestSync.lastSyncAt).getTime()) / 60000)
    : null;

  if (lastSyncAgo !== null && lastSyncAgo > 60) {
    issues.push(`No sync activity for ${lastSyncAgo} minutes`);
    status = 'critical';
  }

  return {
    status,
    issues,
    expiredChannels: expiredChannels.length,
    staleFolders: staleFolders.length,
    recentErrors,
    lastSyncAgo,
  };
}
```

**Step 9: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds with no new errors.

**Step 10: Commit**

```bash
git add src/lib/services/google-drive.ts
git commit -m "feat(drive): add Changes API functions for incremental sync

Add getChangesStartPageToken, watchChanges, stopChannel, syncIncremental,
smartSync, registerWebhookForFolder, renewExpiringChannels, checkSyncHealth"
```

---

### Task 2: Add new Inngest events to client.ts

**Files:**
- Modify: `src/lib/inngest/client.ts` (lines 83–120, drive events block)

**Step 1: Add new event types**

Add after the existing drive events (after line ~120):

```typescript
  "drive/incremental-sync": {
    data: {
      folderId: string;
      channelId?: string;
      triggerSource?: string; // "webhook" | "cron" | "manual"
    };
  };
  "drive/renew-channels": {
    data: {
      triggerSource?: string;
    };
  };
  "drive/health-check": {
    data: {
      triggerSource?: string;
    };
  };
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/lib/inngest/client.ts
git commit -m "feat(drive): add Inngest event types for incremental sync, renewal, health check"
```

---

### Task 3: Create new Inngest functions

**Files:**
- Modify: `src/lib/inngest/functions.ts`

**Step 1: Add imports**

At the top of the file, add to the existing google-drive import:

```typescript
import {
  // ... existing imports ...
  smartSync,
  renewExpiringChannels,
  checkSyncHealth,
} from "@/lib/services/google-drive";
```

**Step 2: Create `incrementalSyncFn`**

Add after `driveAutoLinkAndEnrichFn`:

```typescript
/**
 * Incremental sync triggered by webhook or cron.
 * Uses Changes API (smartSync) instead of full listing.
 * Concurrency limited to 1 per folder to avoid duplicate work.
 */
export const incrementalSyncFn = inngest.createFunction(
  {
    id: "drive-incremental-sync",
    name: "Drive Incremental Sync",
    retries: 3,
    concurrency: {
      limit: 1,
      key: "event.data.folderId",
    },
  },
  { event: "drive/incremental-sync" },
  async ({ event, step }) => {
    const { folderId, triggerSource } = event.data;

    const syncResult = await step.run("incremental-sync", async () => {
      return smartSync(folderId);
    });

    // If new files were added, trigger auto-link and enrich
    if (syncResult.newFileIds.length > 0) {
      await step.run("trigger-auto-link", async () => {
        await inngest.send({
          name: "drive/auto-link-and-enrich",
          data: {
            folderId,
            newFileIds: syncResult.newFileIds,
          },
        });
      });
    }

    return {
      folderId,
      triggerSource,
      ...syncResult,
    };
  }
);
```

**Step 3: Create `renewChannelsFn`**

```typescript
/**
 * Daily CRON to renew expiring webhook channels.
 * Runs at 3am, renews channels expiring in the next 24h.
 */
export const renewChannelsFn = inngest.createFunction(
  {
    id: "drive-renew-channels",
    name: "Renew Drive Webhook Channels",
    retries: 2,
  },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const result = await step.run("renew-channels", async () => {
      const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      return renewExpiringChannels(webhookBaseUrl);
    });

    return result;
  }
);
```

**Step 4: Create `healthCheckFn`**

```typescript
/**
 * Health check CRON — runs every 30 minutes.
 * Monitors sync health and creates admin notifications on critical status.
 */
export const healthCheckFn = inngest.createFunction(
  {
    id: "drive-health-check",
    name: "Drive Sync Health Check",
    retries: 1,
  },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const health = await step.run("check-health", async () => {
      return checkSyncHealth();
    });

    // Log the health status
    await step.run("log-health", async () => {
      await db.insert(driveSyncLogs).values({
        action: 'health_check',
        status: health.status,
        details: JSON.stringify(health),
      });
    });

    // If critical, notify admins
    if (health.status === 'critical') {
      await step.run("notify-admins", async () => {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'admin'));

        for (const admin of admins) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: 'system',
            title: 'Drive sync offline',
            message: `Problemas detectados: ${health.issues.join('; ')}`,
          });
        }
      });
    }

    return health;
  }
);
```

**Step 5: Update `syncDriveFn` CRON**

Change the existing `syncDriveFn` (line 229) to use `smartSync` and run every 5 minutes:

Replace the cron value `"*/15 * * * *"` with `"*/5 * * * *"`.

Inside the function body, replace `syncFolderWithDatabase(folder.driveFolderId)` with `smartSync(folder.driveFolderId)`.

**Step 6: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 7: Commit**

```bash
git add src/lib/inngest/functions.ts
git commit -m "feat(drive): add incremental sync, channel renewal, health check Inngest functions

- incrementalSyncFn: Changes API sync with concurrency limit per folder
- renewChannelsFn: daily CRON to renew expiring webhook channels
- healthCheckFn: 30-min CRON with admin notifications on critical
- syncDriveFn: reduced to 5-min CRON, uses smartSync instead of full listing"
```

---

### Task 4: Simplify webhook handler

**Files:**
- Modify: `src/app/api/webhooks/drive/route.ts`

**Step 1: Rewrite the POST handler**

The handler should:
1. Respond 200 immediately
2. Validate channelId + optional token
3. Fire Inngest "drive/incremental-sync" event (instead of calling syncFolderWithDatabase directly)

Replace the `resourceState` switch block (lines ~130-175) that calls `syncFolderWithDatabase` fire-and-forget, with a simple Inngest send:

For `"change"`, `"add"`, `"update"`, `"remove"`, `"trash"`, `"untrash"` states:

```typescript
// Fire incremental sync via Inngest (non-blocking, debounced by concurrency limit)
inngest.send({
  name: "drive/incremental-sync",
  data: {
    folderId: webhook.folderId,
    channelId: channelId,
    triggerSource: "webhook",
  },
}).catch(err => console.error('[Drive Webhook] Failed to send Inngest event:', err));
```

Remove the direct `syncFolderWithDatabase` call and the inline `drive/auto-link-and-enrich` send (the incrementalSyncFn handles that internally).

Keep the Distribution folder special logic (`processDistributionFolder()`) if the folder is the distribution folder.

**Step 2: Add webhook token verification**

Add check for `x-goog-channel-token` header against `process.env.DRIVE_WEBHOOK_SECRET`:

```typescript
const channelToken = headers().get("x-goog-channel-token") || "";
const expectedSecret = process.env.DRIVE_WEBHOOK_SECRET || "";
if (expectedSecret && channelToken !== expectedSecret) {
  console.warn('[Drive Webhook] Invalid token — possible spoofing');
  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/app/api/webhooks/drive/route.ts
git commit -m "refactor(drive): simplify webhook handler to fire Inngest event

- Remove direct syncFolderWithDatabase call
- Fire drive/incremental-sync event instead (debounced by Inngest concurrency)
- Add webhook token verification via DRIVE_WEBHOOK_SECRET
- Keep distribution folder special handling"
```

---

### Task 5: Auto-register webhook in registerFolder

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` (lines 124-157, registerFolder mutation)

**Step 1: Import new functions**

Add to the google-drive import at the top of the file:

```typescript
import {
  // ... existing imports ...
  registerWebhookForFolder,
  checkSyncHealth,
} from "@/lib/services/google-drive";
```

**Step 2: Update registerFolder mutation**

After the `registerSyncFolder()` call succeeds (line ~154), add webhook auto-registration:

```typescript
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
```

**Step 3: Add healthStatus query**

Add a new query in the drive router:

```typescript
healthStatus: adminProcedure.query(async () => {
  return checkSyncHealth();
}),
```

**Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(drive): auto-register webhook on folder registration + health status query

- registerFolder now auto-calls registerWebhookForFolder after sync folder created
- New healthStatus admin query returns sync health (healthy/degraded/critical)"
```

---

### Task 6: Update DriveStatusBar with health indicator

**Files:**
- Modify: `src/components/drive/DriveStatusBar.tsx`

**Step 1: Add health indicator**

In the collapsed header bar (always visible), add a sync health dot next to the folder status. The logic is simple — based on `lastSyncAt`:

```typescript
// Helper to compute health from lastSyncAt
function getSyncHealth(lastSyncAt: string | null | undefined): {
  color: string;
  label: string;
  status: 'healthy' | 'warning' | 'offline';
} {
  if (!lastSyncAt) return { color: '#ef4444', label: 'Nunca sincronizado', status: 'offline' };
  const minutesAgo = Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 60000);
  if (minutesAgo < 10) return { color: '#22c55e', label: `Sync ${minutesAgo}min atrás`, status: 'healthy' };
  if (minutesAgo < 60) return { color: '#f59e0b', label: `Sync ${minutesAgo}min atrás`, status: 'warning' };
  const hoursAgo = Math.round(minutesAgo / 60);
  return { color: '#ef4444', label: `Sync ${hoursAgo}h atrás`, status: 'offline' };
}
```

Add a pulsing dot in the header bar, next to "Pasta Drive" label:

```tsx
{/* Sync health indicator */}
{data.lastSyncAt && (() => {
  const health = getSyncHealth(data.lastSyncAt);
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400" title={health.label}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${health.status === 'healthy' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: health.color }}
      />
      {health.status !== 'healthy' && <span style={{ color: health.color }}>{health.label}</span>}
    </span>
  );
})()}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/drive/DriveStatusBar.tsx
git commit -m "feat(drive): add sync health indicator to DriveStatusBar

Shows green pulse when synced <10min, yellow warning 10-60min, red offline >60min"
```

---

### Task 7: Register Inngest functions + add env var

**Files:**
- Modify: `src/app/api/inngest/route.ts` (register new functions)
- Create: `.env.example` entry for `DRIVE_WEBHOOK_SECRET`

**Step 1: Register new Inngest functions**

In the Inngest serve call, add the new functions to the array:

```typescript
import {
  // ... existing imports ...
  incrementalSyncFn,
  renewChannelsFn,
  healthCheckFn,
} from "@/lib/inngest/functions";

// In the serve() call, add to the functions array:
incrementalSyncFn,
renewChannelsFn,
healthCheckFn,
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/api/inngest/route.ts
git commit -m "feat(drive): register incremental sync, renewal, health check with Inngest"
```

---

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/services/google-drive.ts` | 8 new functions: Changes API, smart sync, webhook lifecycle, health check |
| 2 | `src/lib/inngest/client.ts` | 3 new event types |
| 3 | `src/lib/inngest/functions.ts` | 3 new functions + update CRON interval + use smartSync |
| 4 | `src/app/api/webhooks/drive/route.ts` | Simplify to Inngest event dispatch + token verification |
| 5 | `src/lib/trpc/routers/drive.ts` | Auto-register webhook + healthStatus query |
| 6 | `src/components/drive/DriveStatusBar.tsx` | Sync health indicator dot |
| 7 | `src/app/api/inngest/route.ts` | Register 3 new Inngest functions |

## Verification

After all tasks:
1. `npx next build` passes with no errors
2. Preview dev server: DriveStatusBar shows health indicator
3. Inngest dashboard: new functions visible (incremental-sync, renew-channels, health-check)
4. `registerFolder` tRPC call auto-registers webhook channel in driveWebhooks table
5. Webhook POST triggers incremental sync (1-3 API calls) instead of full listing
