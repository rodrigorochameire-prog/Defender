# Drive Per-User + Sheets Per-User + Onboarding Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable each defender to link their personal Google account, auto-create Drive folders and Sheets, and guide them through a first-access onboarding wizard.

**Architecture:** Modify existing OAuth flow to pass userId via `state` param. Save tokens per-user in new `user_google_tokens` table. Drive service gets a `getUserDriveClient(userId)` that falls back to global for Rodrigo/Juliane. Sheets creates per-user spreadsheets. Onboarding wizard is a 7-step full-screen page at `/admin/onboarding`.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Google Drive API v3, Google Sheets API v4, OAuth2

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/db/schema/google-tokens.ts` | Schema: user_google_tokens table |
| `src/lib/services/google-drive-peruser.ts` | Per-user Drive client factory + folder creation |
| `src/lib/services/google-sheets-peruser.ts` | Per-user Sheets client + spreadsheet creation |
| `src/lib/trpc/routers/google-integration.ts` | tRPC router: link status, create Drive, create Sheets |
| `src/app/(dashboard)/admin/onboarding/page.tsx` | Onboarding wizard (server component — gate) |
| `src/app/(dashboard)/admin/onboarding/onboarding-wizard.tsx` | Wizard client component (7 steps) |
| `src/app/(dashboard)/admin/settings/planilha/page.tsx` | Sheets settings page (3 states) |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/db/schema/core.ts` | Add `onboardingCompleted`, `googleLinked`, `driveFolderId`, `sheetsSpreadsheetId`, `sheetsSpreadsheetUrl`, `sheetsSyncEnabled` |
| `src/lib/db/schema/index.ts` | Export google-tokens |
| `src/app/api/google/auth/route.ts` | Accept `userId` + `returnTo` via state param |
| `src/app/api/google/callback/route.ts` | Save token per-user, redirect to returnTo |
| `src/lib/trpc/routers/index.ts` | Register googleIntegration router |
| `src/app/(public)/convite/[token]/actions.ts` | Redirect to `/admin/onboarding` instead of `/admin/dashboard` |
| `src/components/layouts/admin-sidebar.tsx` | Add "Planilha" item for defensores |

---

## Task 1: Schema — user_google_tokens + user fields

**Files:**
- Create: `src/lib/db/schema/google-tokens.ts`
- Modify: `src/lib/db/schema/core.ts:54`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Create google-tokens schema**

```typescript
// src/lib/db/schema/google-tokens.ts
import {
  pgTable, serial, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

export const userGoogleTokens = pgTable("user_google_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_google_tokens_user_idx").on(table.userId),
]);

export const userGoogleTokensRelations = relations(userGoogleTokens, ({ one }) => ({
  user: one(users, { fields: [userGoogleTokens.userId], references: [users.id] }),
}));

export type UserGoogleToken = typeof userGoogleTokens.$inferSelect;
```

- [ ] **Step 2: Add fields to users table**

In `src/lib/db/schema/core.ts`, add after `expiresAt` (line 54):

```typescript
  onboardingCompleted: boolean("onboarding_completed").default(false),
  googleLinked: boolean("google_linked").default(false),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),
  sheetsSpreadsheetId: varchar("sheets_spreadsheet_id", { length: 100 }),
  sheetsSpreadsheetUrl: text("sheets_spreadsheet_url"),
  sheetsSyncEnabled: boolean("sheets_sync_enabled").default(false),
```

- [ ] **Step 3: Export from index**

In `src/lib/db/schema/index.ts`, add:
```typescript
export * from "./google-tokens";
```

- [ ] **Step 4: Apply SQL to database**

Run via Supabase MCP:
```sql
CREATE TABLE IF NOT EXISTS "user_google_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "email" text NOT NULL,
  "refresh_token" text NOT NULL,
  "access_token" text,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_google_tokens_user_idx" ON "user_google_tokens" ("user_id");

ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "google_linked" boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "drive_folder_id" varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "sheets_spreadsheet_id" varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "sheets_spreadsheet_url" text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "sheets_sync_enabled" boolean DEFAULT false;
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/google-tokens.ts src/lib/db/schema/core.ts src/lib/db/schema/index.ts
git commit -m "feat: add user_google_tokens table + Drive/Sheets fields on users"
```

---

## Task 2: OAuth per-user — modify auth + callback

**Files:**
- Modify: `src/app/api/google/auth/route.ts`
- Modify: `src/app/api/google/callback/route.ts`

- [ ] **Step 1: Modify auth route to accept userId via query params**

Replace the full file `src/app/api/google/auth/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID não configurado" }, { status: 500 });
  }

  // Accept userId and returnTo from query params
  const userId = request.nextUrl.searchParams.get("userId");
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/admin/settings/drive";

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/google/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  // Pass userId and returnTo via state parameter
  const state = JSON.stringify({ userId: userId ? parseInt(userId) : null, returnTo });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
```

- [ ] **Step 2: Modify callback to save token per-user and redirect**

Replace the `try` block (lines 45-160) in `src/app/api/google/callback/route.ts`. The key changes:
1. Parse `state` to get `userId` and `returnTo`
2. If `userId` is present, save to `user_google_tokens` (per-user)
3. Also save to global `google_tokens` (backward compat)
4. Update user's `googleLinked = true`
5. Redirect to `returnTo` instead of showing HTML page

In the callback route, after getting `tokenData` (line 58), add state parsing:

```typescript
// Parse state
let stateData: { userId?: number; returnTo?: string } = {};
try {
  const stateParam = request.nextUrl.searchParams.get("state");
  if (stateParam) stateData = JSON.parse(stateParam);
} catch {}
```

After saving to global `google_tokens` (line 116), add per-user save:

```typescript
// Save per-user token if userId provided
if (stateData.userId && refreshToken) {
  try {
    await db.execute(sql`
      INSERT INTO user_google_tokens (user_id, email, refresh_token, access_token, expires_at)
      VALUES (${stateData.userId}, ${userEmail}, ${refreshToken}, ${accessToken},
              ${new Date(Date.now() + expiresIn * 1000).toISOString()}::timestamptz)
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        refresh_token = EXCLUDED.refresh_token,
        access_token = EXCLUDED.access_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `);
    await db.execute(sql`
      UPDATE users SET google_linked = true WHERE id = ${stateData.userId}
    `);
    console.log("[Google Auth] Per-user token saved for userId:", stateData.userId);
  } catch (err) {
    console.error("[Google Auth] Error saving per-user token:", err);
  }
}
```

At the end, if `returnTo` is present, redirect instead of showing HTML:

```typescript
if (stateData.returnTo && stateData.userId) {
  const redirectUrl = new URL(stateData.returnTo, process.env.NEXTAUTH_URL || "http://localhost:3000");
  return NextResponse.redirect(redirectUrl.toString());
}

// Fallback: show HTML page (existing behavior for global auth)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/google/auth/route.ts src/app/api/google/callback/route.ts
git commit -m "feat: OAuth per-user via state param (userId + returnTo)"
```

---

## Task 3: Per-user Drive client + folder creation

**Files:**
- Create: `src/lib/services/google-drive-peruser.ts`

- [ ] **Step 1: Create per-user Drive service**

```typescript
// src/lib/services/google-drive-peruser.ts
import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const GOOGLE_API_BASE = "https://www.googleapis.com";

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

async function getUserToken(userId: number): Promise<{ refreshToken: string; accessToken: string }> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (!token) throw new Error("Google não vinculado para este usuário");

  const accessToken = await getAccessToken(token.refreshToken);

  // Update cached access token
  await db.execute(sql`
    UPDATE user_google_tokens SET access_token = ${accessToken}, updated_at = NOW()
    WHERE user_id = ${userId}
  `);

  return { refreshToken: token.refreshToken, accessToken };
}

async function driveRequest(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${GOOGLE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error (${res.status}): ${err}`);
  }
  return res.json();
}

export async function createUserDriveStructure(userId: number): Promise<{
  rootFolderId: string;
  rootFolderUrl: string;
}> {
  const { accessToken } = await getUserToken(userId);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  // Create root folder
  const rootFolder = await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: `OMBUDS — ${user.name}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  // Create Modelos subfolder
  await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: "Modelos",
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolder.id],
    }),
  });

  // Update user record
  await db.execute(sql`
    UPDATE users SET drive_folder_id = ${rootFolder.id} WHERE id = ${userId}
  `);

  return {
    rootFolderId: rootFolder.id,
    rootFolderUrl: `https://drive.google.com/drive/folders/${rootFolder.id}`,
  };
}

export async function isGoogleLinked(userId: number): Promise<boolean> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  return !!token;
}

export async function getUserGoogleEmail(userId: number): Promise<string | null> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  return token?.email ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/google-drive-peruser.ts
git commit -m "feat: per-user Drive client with folder creation"
```

---

## Task 4: Per-user Sheets client + spreadsheet creation

**Files:**
- Create: `src/lib/services/google-sheets-peruser.ts`

- [ ] **Step 1: Create per-user Sheets service**

```typescript
// src/lib/services/google-sheets-peruser.ts
import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const AREA_TAB_MAP: Record<string, string> = {
  CRIMINAL: "Demandas Criminal",
  JURI: "Demandas Júri",
  EXECUCAO_PENAL: "Demandas EP",
  VIOLENCIA_DOMESTICA: "Demandas VVD",
  INFANCIA_JUVENTUDE: "Demandas Infância",
  CIVEL: "Demandas Cível",
  FAMILIA: "Demandas Família",
  FAZENDA_PUBLICA: "Demandas Fazenda Pública",
};

const HEADERS = [
  "__id__", "Status", "Prisão", "Data", "Assistido",
  "Autos", "Ato", "Prazo", "Providências", "Delegado Para",
];

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

export async function createUserSpreadsheet(userId: number): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (!token) throw new Error("Google não vinculado");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  const accessToken = await getAccessToken(token.refreshToken);
  const comarcaResult = await db.execute(sql`SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`);
  const comarcaNome = (comarcaResult.rows[0] as any)?.nome ?? "Comarca";

  // Determine tabs based on user areas
  const areas = user.areasPrincipais ?? ["CRIMINAL"];
  const tabs = areas.map(area => AREA_TAB_MAP[area]).filter(Boolean);
  if (tabs.length === 0) tabs.push("Demandas");

  // Create spreadsheet via Sheets API
  const createRes = await fetch(SHEETS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `OMBUDS — ${user.name} — ${comarcaNome}` },
      sheets: tabs.map((title, i) => ({
        properties: { sheetId: i, title, index: i },
      })),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Sheets API error: ${err}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // Add headers to each tab
  const requests = tabs.map((tabName, i) => ({
    updateCells: {
      range: { sheetId: i, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
      rows: [{
        values: HEADERS.map(h => ({
          userEnteredValue: { stringValue: h },
          userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.15, green: 0.15, blue: 0.17 } },
        })),
      }],
      fields: "userEnteredValue,userEnteredFormat",
    },
  }));

  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  // Update user record
  await db.execute(sql`
    UPDATE users SET
      sheets_spreadsheet_id = ${spreadsheetId},
      sheets_spreadsheet_url = ${spreadsheetUrl},
      sheets_sync_enabled = true
    WHERE id = ${userId}
  `);

  return { spreadsheetId, spreadsheetUrl };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/google-sheets-peruser.ts
git commit -m "feat: per-user Sheets client with auto-spreadsheet creation"
```

---

## Task 5: tRPC router — google-integration

**Files:**
- Create: `src/lib/trpc/routers/google-integration.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Create router**

```typescript
// src/lib/trpc/routers/google-integration.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { users, userGoogleTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGoogleLinked, getUserGoogleEmail, createUserDriveStructure } from "@/lib/services/google-drive-peruser";
import { createUserSpreadsheet } from "@/lib/services/google-sheets-peruser";
import { TRPCError } from "@trpc/server";

export const googleIntegrationRouter = router({
  // Get current user's Google integration status
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    const linked = await isGoogleLinked(ctx.user.id);
    const email = linked ? await getUserGoogleEmail(ctx.user.id) : null;

    return {
      googleLinked: linked,
      googleEmail: email,
      driveFolderId: user?.driveFolderId ?? null,
      driveUrl: user?.driveFolderId ? `https://drive.google.com/drive/folders/${user.driveFolderId}` : null,
      sheetsSpreadsheetId: user?.sheetsSpreadsheetId ?? null,
      sheetsSpreadsheetUrl: user?.sheetsSpreadsheetUrl ?? null,
      sheetsSyncEnabled: user?.sheetsSyncEnabled ?? false,
      onboardingCompleted: user?.onboardingCompleted ?? false,
    };
  }),

  // Get OAuth URL for linking Google
  getAuthUrl: protectedProcedure
    .input(z.object({ returnTo: z.string().optional() }))
    .query(({ ctx, input }) => {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const returnTo = input.returnTo || "/admin/settings/planilha";
      return {
        url: `${baseUrl}/api/google/auth?userId=${ctx.user.id}&returnTo=${encodeURIComponent(returnTo)}`,
      };
    }),

  // Create Drive folder structure
  createDrive: protectedProcedure.mutation(async ({ ctx }) => {
    const linked = await isGoogleLinked(ctx.user.id);
    if (!linked) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google não vinculado" });

    const result = await createUserDriveStructure(ctx.user.id);
    return result;
  }),

  // Create Sheets spreadsheet
  createSheets: protectedProcedure.mutation(async ({ ctx }) => {
    const linked = await isGoogleLinked(ctx.user.id);
    if (!linked) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google não vinculado" });

    const result = await createUserSpreadsheet(ctx.user.id);
    return result;
  }),

  // Mark onboarding as completed
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  // Unlink Google
  unlink: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(userGoogleTokens).where(eq(userGoogleTokens.userId, ctx.user.id));
    await db.update(users).set({
      googleLinked: false,
      driveFolderId: null,
      sheetsSpreadsheetId: null,
      sheetsSpreadsheetUrl: null,
      sheetsSyncEnabled: false,
    }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
});
```

- [ ] **Step 2: Register router**

In `src/lib/trpc/routers/index.ts`, add:
```typescript
import { googleIntegrationRouter } from "./google-integration";
// In router():
  googleIntegration: googleIntegrationRouter,
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/google-integration.ts src/lib/trpc/routers/index.ts
git commit -m "feat: add googleIntegration tRPC router (status, auth, drive, sheets)"
```

---

## Task 6: Onboarding wizard page

**Files:**
- Create: `src/app/(dashboard)/admin/onboarding/page.tsx`
- Create: `src/app/(dashboard)/admin/onboarding/onboarding-wizard.tsx`
- Modify: `src/app/(public)/convite/[token]/actions.ts`

- [ ] **Step 1: Create onboarding gate (server component)**

```typescript
// src/app/(dashboard)/admin/onboarding/page.tsx
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import OnboardingWizard from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) redirect("/login");
  if (user.onboardingCompleted) redirect("/admin/dashboard");

  const comarca = await db.execute(
    `SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`
  );
  const comarcaNome = (comarca.rows[0] as any)?.nome ?? "Comarca";

  return (
    <OnboardingWizard
      userName={user.name}
      userComarca={comarcaNome}
      userAreas={user.areasPrincipais ?? []}
      userId={user.id}
    />
  );
}
```

- [ ] **Step 2: Create onboarding wizard (client component)**

Create `src/app/(dashboard)/admin/onboarding/onboarding-wizard.tsx` — a full-screen wizard with 7 steps. This is a large component. Key structure:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import {
  Briefcase, ListTodo, Calendar, FolderOpen, FileSpreadsheet,
  CreditCard, CheckCircle2, ArrowRight, ArrowLeft, ExternalLink,
  Shield,
} from "lucide-react";

const AREA_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  CRIMINAL: { label: "Criminal", color: "bg-red-600", desc: "Delitos tipificados, cálculo de benefícios (ANPP, sursis, transação)" },
  JURI: { label: "Júri", color: "bg-purple-600", desc: "Cockpit de sessão, jurados, quesitos, teses defensivas" },
  EXECUCAO_PENAL: { label: "Execução Penal", color: "bg-orange-600", desc: "Progressão de regime, cálculo de penas" },
  VIOLENCIA_DOMESTICA: { label: "VVD", color: "bg-rose-600", desc: "Medidas protetivas, acompanhamento MPU" },
  INFANCIA_JUVENTUDE: { label: "Infância", color: "bg-amber-600", desc: "Atos infracionais, medidas socioeducativas, remissão" },
  CIVEL: { label: "Cível", color: "bg-blue-600", desc: "Processos e demandas cíveis" },
  FAMILIA: { label: "Família", color: "bg-cyan-600", desc: "Processos de família" },
  FAZENDA_PUBLICA: { label: "Fazenda Pública", color: "bg-teal-600", desc: "Fazenda pública" },
};

export default function OnboardingWizard({ userName, userComarca, userAreas, userId }: {
  userName: string;
  userComarca: string;
  userAreas: string[];
  userId: number;
}) {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const { data: googleStatus, refetch: refetchGoogle } = trpc.googleIntegration.myStatus.useQuery();
  const { data: authUrlData } = trpc.googleIntegration.getAuthUrl.useQuery({
    returnTo: "/admin/onboarding",
  });
  const createDriveMutation = trpc.googleIntegration.createDrive.useMutation({
    onSuccess: () => refetchGoogle(),
  });
  const createSheetsMutation = trpc.googleIntegration.createSheets.useMutation({
    onSuccess: () => refetchGoogle(),
  });
  const completeOnboarding = trpc.googleIntegration.completeOnboarding.useMutation({
    onSuccess: () => router.push("/admin/dashboard"),
  });

  const totalSteps = 7;

  // Render step content based on current step number
  // Step 1: Welcome
  // Step 2: System overview (demandas, assistidos, agenda, drive)
  // Step 3: Your areas (dynamic based on userAreas)
  // Step 4: Link Google Drive (the most important)
  // Step 5: Create Sheets (optional)
  // Step 6: Plan info
  // Step 7: Done

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 p-8">
        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-emerald-500" : "bg-zinc-800"}`} />
          ))}
        </div>

        {/* Step content — implement each step with proper JSX */}
        {step === 1 && (/* Welcome step */)}
        {step === 2 && (/* System overview */)}
        {step === 3 && (/* Areas */)}
        {step === 4 && (/* Google Drive linking */)}
        {step === 5 && (/* Sheets creation */)}
        {step === 6 && (/* Plan info */)}
        {step === 7 && (/* Done */)}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-zinc-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} className="bg-emerald-600 hover:bg-emerald-700">
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => completeOnboarding.mutate()} className="bg-emerald-600 hover:bg-emerald-700">
              Ir para o Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
```

The implementer should fill in each step's JSX following the spec at `docs/superpowers/specs/2026-03-29-onboarding-tour-drive-peruser.md`.

Step 4 (Google Drive) is the most critical. When Google is not linked, show the warning about personal account and the link button. When linked, show success + "Create Drive folder" button. When folder exists, show success with link.

Step 5 (Sheets) should check if Google is linked (from step 4). If yes, show "Create spreadsheet" button. If not, show "Pular" option.

- [ ] **Step 3: Modify convite activation to redirect to onboarding**

In `src/app/(public)/convite/[token]/actions.ts`, change the last line:

```typescript
// Before:
redirect("/admin/dashboard");

// After:
redirect("/admin/onboarding");
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/onboarding/ src/app/\(public\)/convite/\[token\]/actions.ts
git commit -m "feat: onboarding wizard (7 steps with Drive + Sheets integration)"
```

---

## Task 7: Sheets settings page + sidebar

**Files:**
- Create: `src/app/(dashboard)/admin/settings/planilha/page.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Create planilha settings page**

A page with 3 states (sem Google → sem planilha → sincronizado), following the spec wireframes in `docs/superpowers/specs/2026-03-29-onboarding-tour-drive-peruser.md` section 3.5. Uses `trpc.googleIntegration.myStatus` to determine state.

- [ ] **Step 2: Add to sidebar**

In sidebar `MAIN_NAV`, add for defensores:
```typescript
{ label: "Planilha", path: "/admin/settings/planilha", icon: "Sheet" }
```

Add `Sheet` to the `iconMap`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/settings/planilha/page.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat: add Sheets settings page + Planilha in sidebar"
```

---

## Execution Checklist

| # | Task | Jira | Type | Est. |
|---|------|------|------|------|
| 1 | Schema: user_google_tokens + user fields | SCRUM-97 | Schema | 15min |
| 2 | OAuth per-user (auth + callback) | SCRUM-97 | Backend | 20min |
| 3 | Per-user Drive client + folder creation | SCRUM-97 | Backend | 20min |
| 4 | Per-user Sheets client + spreadsheet creation | SCRUM-95 | Backend | 20min |
| 5 | tRPC router: googleIntegration | SCRUM-97 | Backend | 15min |
| 6 | Onboarding wizard (7 steps) | SCRUM-96 | Frontend | 45min |
| 7 | Sheets settings page + sidebar | SCRUM-95 | Frontend | 20min |
