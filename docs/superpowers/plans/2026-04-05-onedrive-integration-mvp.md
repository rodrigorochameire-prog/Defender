# OneDrive Integration MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable defenders to connect their organizational OneDrive, upload/download/manage files via OMBUDS, coexisting with Google Drive.

**Architecture:** Storage abstraction layer (`DriveProvider` interface) with Google wrapper + OneDrive implementation. Microsoft OAuth2 + PKCE auth flow. Per-user token storage. `provider` column in drive tables for dual-provider coexistence.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, `@azure/msal-node` (auth), raw fetch (Graph API), Supabase/PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-04-05-onedrive-integration-mvp.md`

---

## File Map

### Create

| File | Responsibility |
|------|---------------|
| `src/lib/db/schema/microsoft-tokens.ts` | `user_microsoft_tokens` table + relations |
| `src/lib/services/providers/onedrive-auth.ts` | MSAL token management (acquire, refresh, revoke) |
| `src/lib/services/providers/onedrive-provider.ts` | OneDrive CRUD via Graph API (implements DriveProvider) |
| `src/lib/services/providers/google-drive-provider.ts` | Wrapper of existing `google-drive-peruser.ts` (implements DriveProvider) |
| `src/lib/services/drive-provider.ts` | `DriveProvider` interface + `StorageFile` type |
| `src/lib/services/drive-factory.ts` | `getDriveProvider(userId)` + `getProviderForFile(provider, userId)` |
| `src/app/api/microsoft/auth/route.ts` | OAuth2 initiation (redirect to Microsoft login) |
| `src/app/api/microsoft/callback/route.ts` | OAuth2 callback (exchange code for tokens, save) |

### Modify

| File | Changes |
|------|---------|
| `src/lib/db/schema/core.ts` | Add `microsoftLinked`, `storageProvider`, `onedriveRootFolderId` to users |
| `src/lib/db/schema/drive.ts` | Add `provider` column to `driveFiles` and `driveSyncFolders` |
| `src/lib/db/schema/index.ts` | Export `microsoft-tokens` |
| `src/app/(dashboard)/admin/settings/drive/page.tsx` | Add OneDrive connection card |
| `package.json` | Add `@azure/msal-node` |

---

## Task 1: Install MSAL + add env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (or Vercel env)

- [ ] **Step 1: Install @azure/msal-node**

```bash
cd /Users/rodrigorochameire/Defender && npm install @azure/msal-node
```

- [ ] **Step 2: Add env vars to `.env.local`**

```bash
# Add to .env.local (values from Apple Notes "OMBUDS — Azure AD Credentials")
MICROSOFT_CLIENT_ID=de618c3d-80de-481b-b068-7e044ae15110
MICROSOFT_CLIENT_SECRET=<from Apple Notes>
MICROSOFT_TENANT_ID=4042ad54-d3b5-466d-92e0-c771e7b3581c
```

Note: `MICROSOFT_REDIRECT_URI` is derived at runtime from `NEXTAUTH_URL` (same pattern as Google).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @azure/msal-node for Microsoft OAuth"
```

---

## Task 2: Schema — microsoft-tokens table + users columns + drive provider column

**Files:**
- Create: `src/lib/db/schema/microsoft-tokens.ts`
- Modify: `src/lib/db/schema/core.ts:56-57` (add columns after `googleLinked`)
- Modify: `src/lib/db/schema/drive.ts:52` (add `provider` to `driveFiles`)
- Modify: `src/lib/db/schema/drive.ts:26` (add `provider` to `driveSyncFolders`)
- Modify: `src/lib/db/schema/index.ts:44` (add export)

- [ ] **Step 1: Create `microsoft-tokens.ts`**

Mirror the existing `google-tokens.ts` pattern:

```typescript
import {
  pgTable, serial, text, varchar, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

export const userMicrosoftTokens = pgTable("user_microsoft_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  microsoftUserId: varchar("microsoft_user_id", { length: 100 }),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_microsoft_tokens_user_idx").on(table.userId),
]);

export const userMicrosoftTokensRelations = relations(userMicrosoftTokens, ({ one }) => ({
  user: one(users, { fields: [userMicrosoftTokens.userId], references: [users.id] }),
}));

export type UserMicrosoftToken = typeof userMicrosoftTokens.$inferSelect;
```

- [ ] **Step 2: Add columns to `users` in `core.ts`**

After line 56 (`googleLinked`), add:

```typescript
  microsoftLinked: boolean("microsoft_linked").default(false),
  storageProvider: varchar("storage_provider", { length: 20 }).default("google"),
  onedriveRootFolderId: varchar("onedrive_root_folder_id", { length: 100 }),
```

- [ ] **Step 3: Add `provider` column to `driveFiles` in `drive.ts`**

After line 52 (`driveFileId`), add:

```typescript
  provider: varchar("provider", { length: 20 }).default("google"),
```

Also **remove the `.unique()` from `driveFileId`** (line 52) — it will be replaced by a composite unique. Change:
```typescript
driveFileId: varchar("drive_file_id", { length: 100 }).notNull().unique(),
```
To:
```typescript
driveFileId: varchar("drive_file_id", { length: 100 }).notNull(),
```

Then add a composite unique index in the table's index array:
```typescript
uniqueIndex("drive_files_provider_file_id_unique").on(table.driveFileId, table.provider),
```

- [ ] **Step 4: Add `provider` column to `driveSyncFolders` in `drive.ts`**

After line 26 (`driveFolderId`), add:

```typescript
  provider: varchar("provider", { length: 20 }).default("google"),
```

Also **remove `.unique()` from `driveFolderId`** and add composite unique:
```typescript
uniqueIndex("drive_sync_folders_provider_folder_id_unique").on(table.driveFolderId, table.provider),
```

- [ ] **Step 4b: Add `provider` column to `driveSyncLogs` in `drive.ts`**

Find the `driveSyncLogs` table and add:
```typescript
  provider: varchar("provider", { length: 20 }).default("google"),
```

- [ ] **Step 5: Export from `index.ts`**

After line 44 (`export * from "./google-tokens"`), add:

```typescript
export * from "./microsoft-tokens";
```

- [ ] **Step 6: Generate and apply migration**

```bash
npm run db:generate && npm run db:push
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "microsoft|provider|storageProvider" | head -20
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/schema/ drizzle/
git commit -m "feat: schema — microsoft tokens, storage provider, drive provider column"
```

---

## Task 3: DriveProvider interface + StorageFile type

**Files:**
- Create: `src/lib/services/drive-provider.ts`

- [ ] **Step 1: Create the interface file**

```typescript
/**
 * Storage provider abstraction.
 * Both Google Drive and OneDrive implement this interface.
 */

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  parentId: string | null;
  webUrl: string | null;
  downloadUrl: string | null;
  isFolder: boolean;
  provider: "google" | "onedrive";
}

export interface SyncResult {
  items: StorageFile[];
  newToken: string;
}

export interface DriveProvider {
  getProviderName(): "google" | "onedrive";

  // Files
  listFiles(folderId: string, options?: { pageSize?: number }): Promise<StorageFile[]>;
  getFileInfo(fileId: string): Promise<StorageFile>;
  uploadFile(buffer: Buffer, name: string, mimeType: string, folderId: string): Promise<StorageFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<StorageFile>;
  moveFile(fileId: string, targetFolderId: string): Promise<StorageFile>;

  // Folders
  createFolder(name: string, parentId: string): Promise<StorageFile>;
  findFolderByName(name: string, parentId: string): Promise<StorageFile | null>;

  // Sync
  getChanges(syncToken?: string): Promise<SyncResult>;

  // URLs
  getDownloadUrl(fileId: string): Promise<string>;
  getWebViewUrl(fileId: string): Promise<string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/drive-provider.ts
git commit -m "feat: DriveProvider interface + StorageFile type"
```

---

## Task 4: OneDrive auth service (MSAL)

**Files:**
- Create: `src/lib/services/providers/onedrive-auth.ts`

- [ ] **Step 1: Create the auth service**

Handles MSAL ConfidentialClientApplication, token acquisition, and refresh. Key functions:

- `getMsalClient()` — singleton MSAL ConfidentialClientApplication
- `getAuthUrl(userId: number, returnTo: string)` — generates auth URL with PKCE, returns `{ url, state, codeVerifier }`
- `exchangeCode(code: string, codeVerifier: string)` — exchanges auth code for tokens
- `getAccessToken(userId: number)` — gets valid access token (refreshes if expired via MSAL `acquireTokenSilent`)
- `saveMicrosoftTokens(userId: number, tokenResponse, userInfo)` — upserts to `user_microsoft_tokens` + sets `microsoftLinked = true`
- `disconnectMicrosoft(userId: number)` — deletes token row, sets `microsoftLinked = false`

Uses `@azure/msal-node` ConfidentialClientApplication with:
- `auth.clientId` from `MICROSOFT_CLIENT_ID`
- `auth.authority` = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`
- `auth.clientSecret` from `MICROSOFT_CLIENT_SECRET`

Scopes: `["Files.ReadWrite", "Files.ReadWrite.All", "offline_access", "User.Read"]`

Follow the pattern in `google-drive-peruser.ts` — raw DB queries via Drizzle, no ORM abstractions.

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/providers/onedrive-auth.ts
git commit -m "feat: OneDrive auth service — MSAL token management"
```

---

## Task 5: Microsoft OAuth routes (auth + callback)

**Files:**
- Create: `src/app/api/microsoft/auth/route.ts`
- Create: `src/app/api/microsoft/callback/route.ts`

- [ ] **Step 1: Create auth route**

Mirror `src/app/api/google/auth/route.ts` pattern:
- Read `userId` and `returnTo` from query params
- Call `getAuthUrl(userId, returnTo)` from onedrive-auth service
- Store `state` + `codeVerifier` + `userId` + `returnTo` in a signed HTTP-only cookie using `jose` (JWE compact serialization with a key derived from `NEXTAUTH_SECRET` or a dedicated `MS_AUTH_STATE_SECRET`). Set cookie `ms-auth-state`, maxAge=600 (10min), httpOnly, secure, sameSite=lax.
- Redirect to Microsoft login URL

**Note:** The project already uses `jose` (v5.9.6 in package.json) for JWT handling. Use `new CompactEncrypt()` / `compactDecrypt()` for the state cookie — no new dependency needed.

- [ ] **Step 2: Create callback route**

Mirror `src/app/api/google/callback/route.ts` pattern:
- Read `code` and `state` from query params
- Read `ms-auth-state` cookie, decrypt with `jose`, validate that `state` param matches cookie's `state` field (CSRF protection)
- Extract `codeVerifier`, `userId`, `returnTo` from decrypted cookie
- Call `exchangeCode(code, codeVerifier)` from onedrive-auth
- Fetch user info: `GET https://graph.microsoft.com/v1.0/me` with access token
- Call `saveMicrosoftTokens(userId, tokenResponse, userInfo)`
- Clear the cookie
- Redirect to `returnTo` with success toast param

- [ ] **Step 3: Verify flow manually**

Start dev server, navigate to `http://localhost:3000/api/microsoft/auth?userId=1&returnTo=/admin/settings/drive`. Should redirect to Microsoft login. After authorization, should redirect back to settings page.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/microsoft/
git commit -m "feat: Microsoft OAuth routes — auth + callback with PKCE"
```

---

## Task 6: OneDrive Provider (Graph API CRUD)

**Files:**
- Create: `src/lib/services/providers/onedrive-provider.ts`

- [ ] **Step 1: Create the provider**

Implements `DriveProvider` interface. Constructor receives `userId: number`. Each method:

1. Gets access token via `getAccessToken(userId)` from onedrive-auth
2. Makes raw fetch to `https://graph.microsoft.com/v1.0/me/drive/...`
3. Maps Graph `DriveItem` response to our `StorageFile` type

Key implementation details:
- Upload: if `buffer.length < 4 * 1024 * 1024` use simple PUT, else use upload session
- `getDownloadUrl`: fetch item metadata, return `@microsoft.graph.downloadUrl` (expires ~1h)
- `getWebViewUrl`: return `webUrl` from item metadata
- `findFolderByName`: use `$filter=name eq '${name}' and folder ne null`
- `getChanges`: use `/me/drive/root/delta` with `token` query param, return `@odata.deltaLink` as newToken
- Error handling: wrap Graph errors in meaningful messages, handle 401 (token expired → retry after refresh)

Helper function to map Graph DriveItem → StorageFile:

```typescript
function mapDriveItem(item: any): StorageFile {
  return {
    id: item.id,
    name: item.name,
    mimeType: item.file?.mimeType ?? (item.folder ? "application/vnd.ms-folder" : "application/octet-stream"),
    size: item.size ?? 0,
    createdAt: item.createdDateTime,
    modifiedAt: item.lastModifiedDateTime,
    parentId: item.parentReference?.id ?? null,
    webUrl: item.webUrl ?? null,
    downloadUrl: item["@microsoft.graph.downloadUrl"] ?? null,
    isFolder: !!item.folder,
    provider: "onedrive",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/providers/onedrive-provider.ts
git commit -m "feat: OneDriveProvider — Graph API CRUD (implements DriveProvider)"
```

---

## Task 7: Google Drive Provider (wrapper)

**Files:**
- Create: `src/lib/services/providers/google-drive-provider.ts`

- [ ] **Step 1: Create the provider**

Thin wrapper around existing `google-drive-peruser.ts` functions. Implements `DriveProvider`. Constructor receives `userId: number`.

Each method calls the existing per-user functions and maps results to `StorageFile`:
- `listFiles` → calls `listFilesInFolder` from google-drive-peruser (or raw fetch like existing code)
- `uploadFile` → calls existing upload logic
- `downloadFile` → calls existing download logic
- etc.

Where a function doesn't exist in peruser, use raw fetch with `getUserToken(userId)` from google-drive-peruser.ts (same pattern it already uses internally).

Map Google API response to `StorageFile`:

```typescript
function mapGoogleFile(file: any): StorageFile {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType ?? "application/octet-stream",
    size: parseInt(file.size ?? "0"),
    createdAt: file.createdTime,
    modifiedAt: file.modifiedTime,
    parentId: file.parents?.[0] ?? null,
    webUrl: file.webViewLink ?? null,
    downloadUrl: file.webContentLink ?? null,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
    provider: "google",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/providers/google-drive-provider.ts
git commit -m "feat: GoogleDriveProvider — wrapper of existing peruser functions"
```

---

## Task 8: Drive Factory

**Files:**
- Create: `src/lib/services/drive-factory.ts`

- [ ] **Step 1: Create the factory**

Two exported functions:

```typescript
import { db } from "@/lib/db";
import { users, userMicrosoftTokens, userGoogleTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DriveProvider } from "./drive-provider";
import { OneDriveProvider } from "./providers/onedrive-provider";
import { GoogleDriveProvider } from "./providers/google-drive-provider";

/**
 * Get the active drive provider for a user (based on their storage_provider preference)
 */
export async function getDriveProvider(userId: number): Promise<DriveProvider> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storageProvider: true },
  });

  const preferred = user?.storageProvider ?? "google";

  if (preferred === "onedrive") {
    const msToken = await db.query.userMicrosoftTokens.findFirst({
      where: eq(userMicrosoftTokens.userId, userId),
    });
    if (msToken) return new OneDriveProvider(userId);
  }

  // Fallback to Google
  const googleToken = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (googleToken) return new GoogleDriveProvider(userId);

  throw new Error("Nenhum storage provider configurado. Conecte Google Drive ou OneDrive nas Configurações.");
}

/**
 * Get provider for a specific file (may differ from user's active provider)
 */
export async function getProviderForFile(
  fileProvider: "google" | "onedrive",
  userId: number
): Promise<DriveProvider> {
  if (fileProvider === "onedrive") {
    return new OneDriveProvider(userId);
  }
  return new GoogleDriveProvider(userId);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/drive-factory.ts
git commit -m "feat: drive factory — getDriveProvider + getProviderForFile"
```

---

## Task 9: Settings UI — OneDrive connection card

**Files:**
- Modify: `src/app/(dashboard)/admin/settings/drive/page.tsx`

- [ ] **Step 1: Add OneDrive card to Settings Drive page**

Read the existing page first. It already has Google Drive configuration. Add a new section/card for OneDrive:

- Card with OneDrive icon (use Lucide `Cloud` or `HardDrive`)
- If not connected: "Conectar OneDrive" button → navigates to `/api/microsoft/auth?userId={userId}&returnTo=/admin/settings/drive`
- If connected (`microsoftLinked === true`): show email, display name, badge "Ativo" or "Arquivos anteriores", "Desconectar" button
- "Usar OneDrive para novos arquivos" toggle → updates `users.storageProvider` via tRPC mutation
- Style: match existing Google Drive card pattern

Need to add a tRPC mutation for:
- `updateStorageProvider` — sets `users.storageProvider`
- `disconnectMicrosoft` — calls `disconnectMicrosoft()` from onedrive-auth

These can go in the existing `drive.ts` router or a new `settings.ts` router.

- [ ] **Step 2: Verify in browser**

Navigate to settings/drive, verify OneDrive card appears. Click "Conectar OneDrive", complete OAuth flow, verify card shows connected state.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/settings/drive/page.tsx src/lib/trpc/routers/
git commit -m "feat: Settings UI — OneDrive connection card + storage provider toggle"
```

---

## Task 10: Wire factory into Drive router (CRUD operations)

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts`

- [ ] **Step 1: Identify CRUD routes to migrate**

Read the drive router. Find these procedures and add factory support alongside existing Google code:
- File listing (when loading Drive tab for an assistido)
- File upload
- File download / content streaming
- File delete
- Folder creation

For each: check `drive_files.provider` on the record (for existing files) or `users.storageProvider` (for new operations). Use `getProviderForFile` or `getDriveProvider` accordingly.

**Important:** Do NOT remove existing Google-only code. Add factory-based paths conditionally. Existing Google flows must continue working unchanged.

- [ ] **Step 2: Test with Google provider**

Verify existing Google Drive functionality still works after the refactor. Upload a file, download it, delete it.

- [ ] **Step 3: Test with OneDrive provider**

Connect OneDrive in settings, switch storage provider. Upload a file via the Drive tab. Verify it appears in OneDrive. Download it back. Delete it.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat: drive router — factory-based CRUD for dual-provider support"
```

---

## Task 11: OneDrive folder structure for assistidos

**Files:**
- Modify: `src/lib/services/providers/onedrive-provider.ts` or create `src/lib/services/providers/onedrive-folders.ts`

- [ ] **Step 1: Implement folder hierarchy creation**

Mirror the Google Drive pattern in `google-drive-peruser.ts` `createUserDriveStructure`:
- Create root folder "OMBUDS" in user's OneDrive root
- Store root folder ID in `users.onedriveRootFolderId`
- For each assistido: create subfolder `{nome}` inside the atribuição folder
- Follow existing pattern: `ATRIBUICAO_FOLDER` → `ASSISTIDO_FOLDER` → files

Function: `createOneDriveFolderStructure(userId: number)` — called after OneDrive connection.
Function: `createAssistidoOneDriveFolder(userId: number, assistidoNome: string, atribuicao: string)` — called when first file is uploaded for an assistido.

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/providers/
git commit -m "feat: OneDrive folder hierarchy — OMBUDS/atribuição/assistido structure"
```

---

## Task 12: Env vars in Vercel + end-to-end test

**Files:**
- No code changes

- [ ] **Step 1: Add env vars to Vercel**

```bash
vercel env add MICROSOFT_CLIENT_ID
vercel env add MICROSOFT_CLIENT_SECRET
vercel env add MICROSOFT_TENANT_ID
```

- [ ] **Step 2: Deploy and test**

```bash
vercel --prod
```

Test the full flow in production:
1. Go to Settings → Drive
2. Click "Conectar OneDrive"
3. Authorize with `rodrigo.meire@defensoria.ba.def.br`
4. Verify connected state in Settings
5. Navigate to an assistido → Drive tab
6. Upload a file → verify it appears in OneDrive
7. Download the file back
8. Delete the file

- [ ] **Step 3: Commit any fixes**

---

## Summary

| Task | What | Depends On |
|------|------|-----------|
| 1 | Install MSAL + env vars | — |
| 2 | Schema (tokens, provider columns) | — |
| 3 | DriveProvider interface | — |
| 4 | OneDrive auth service (MSAL) | Tasks 1, 2 |
| 5 | OAuth routes (auth + callback) | Task 4 |
| 6 | OneDrive Provider (Graph CRUD) | Tasks 3, 4 |
| 7 | Google Drive Provider (wrapper) | Task 3 |
| 8 | Drive Factory | Tasks 6, 7 |
| 9 | Settings UI (connect/disconnect) | Tasks 5, 8 |
| 10 | Wire factory into Drive router | Tasks 8, 9 |
| 11 | OneDrive folder structure | Tasks 2, 6 |
| 12 | Deploy + E2E test | All |

**Parallel groups:**
- Tasks 1, 2, 3 can run in parallel (no dependencies)
- Tasks 6 and 7 can run in parallel (both implement interface from Task 3)
- Task 12 must be last
