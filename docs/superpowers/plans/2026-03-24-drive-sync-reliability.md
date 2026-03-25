# Drive Sync Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 3 bugs no sistema de sync com Google Drive + adicionar cron watchdog + painel de status admin.

**Architecture:** 4 bugs são corrigidos em `google-drive.ts` (secret, cleanup, upsert). Um novo cron `driveWatchdogFn` garante que nenhuma pasta fique > 20 min sem sync. Uma nova página `/admin/drive-sync` expõe o status de cada pasta com auto-refresh de 30s.

**Tech Stack:** Next.js 15, tRPC (adminProcedure), Drizzle ORM, Inngest, Tailwind CSS + shadcn/ui, TypeScript.

**Spec:** `docs/superpowers/specs/2026-03-24-drive-sync-reliability-design.md`

---

## File Map

| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `src/lib/services/google-drive.ts` | Modify | Bugs 1, 2, 3: secret, cleanup, upsert |
| `src/lib/inngest/functions.ts` | Modify | Novo `driveWatchdogFn` + registrar |
| `src/lib/trpc/routers/drive.ts` | Modify | `getSyncStatus`, `forceSyncFolder`, `cleanExpiredChannels` |
| `src/app/(dashboard)/admin/drive-sync/page.tsx` | Create | Painel de status Drive (client component) |

---

## Task 1: Bug 1 — Passar webhook secret ao registrar canais

**Arquivo:** `src/lib/services/google-drive.ts`

**Contexto:** Função `registerWebhookForFolder` (buscar por `watchChanges(syncToken, webhookUrl)` — aparece em ~linha 721). Ela chama `watchChanges` sem o 3º parâmetro `webhookSecret`. O handler do webhook valida `x-goog-channel-token` contra `DRIVE_WEBHOOK_SECRET`; sem o token no registro, o Google não o envia e todos os webhooks são rejeitados com 401.

- [ ] **Step 1.1: Localizar a chamada**

```bash
grep -n "watchChanges(syncToken" src/lib/services/google-drive.ts
```

Deve mostrar uma linha com apenas 2 argumentos.

- [ ] **Step 1.2: Fazer a correção**

Trocar:
```ts
const watchResult = await watchChanges(syncToken, webhookUrl);
```

Por:
```ts
const watchResult = await watchChanges(syncToken, webhookUrl, process.env.DRIVE_WEBHOOK_SECRET);
```

- [ ] **Step 1.3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript. `watchChanges` tem `webhookSecret?: string` como 3º parâmetro opcional — é compatível.

- [ ] **Step 1.4: Commit**

```bash
git add src/lib/services/google-drive.ts
git commit -m "fix(drive): passar DRIVE_WEBHOOK_SECRET ao registrar canais webhook"
```

---

## Task 2: Bug 2 — Limpar canais expirados em renewExpiringChannels

**Arquivo:** `src/lib/services/google-drive.ts`

**Contexto:** Função `renewExpiringChannels` (buscar por `export async function renewExpiringChannels`). Hoje ela consulta canais que expiram em < 24h, mas não limpa os que já expiraram. Resultado: 40 canais mortos marcados `isActive: true` no banco.

O início da função tem este formato:
```ts
export async function renewExpiringChannels(...) {
  const stats = { renewed: 0, failed: 0, errors: [] as string[] };

  try {
    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiringChannels = await db.select()...
```

- [ ] **Step 2.1: Adicionar limpeza de expirados + ampliar janela de 24h → 48h**

Localizar a linha `const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000)` e adicionar **antes dela**:

```ts
    // Passo 0: marcar como inativos todos os canais já expirados
    await db
      .update(driveWebhooks)
      .set({ isActive: false })
      .where(and(eq(driveWebhooks.isActive, true), lt(driveWebhooks.expiration, new Date())));
```

E na linha do `cutoff`, mudar `24` para `48`:
```ts
    const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h em vez de 24h
```

- [ ] **Step 2.2: Verificar imports**

A função já usa `db`, `driveWebhooks`, `and`, `eq`, `lt` — confirmar que todos estão importados no topo do arquivo:

```bash
grep -n "^import\|driveWebhooks\|from.*drizzle-orm" src/lib/services/google-drive.ts | head -20
```

- [ ] **Step 2.3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/services/google-drive.ts
git commit -m "fix(drive): limpar canais expirados no renewExpiringChannels + janela 48h"
```

---

## Task 3: Bug 3 — onConflictDoUpdate no INSERT do syncIncremental

**Arquivo:** `src/lib/services/google-drive.ts`

**Contexto:** Função `syncIncremental`, no bloco `else { // New file — insert }` (linha ~535). Hoje usa `db.insert(driveFiles).values({...}).returning(...)` sem tratamento de conflito. Quando dois sync folders têm arquivos em comum, o INSERT lança `duplicate key value violates unique constraint "drive_files_drive_file_id_unique"`, derrubando toda a sincronização da pasta (VVD está parada há 15 dias por isso).

- [ ] **Step 3.1: Localizar o INSERT problemático**

```bash
grep -n "db.insert(driveFiles)" src/lib/services/google-drive.ts
```

Deve mostrar 2 ocorrências: uma em `syncFolderWithDatabase` (que já usa `onConflictDoUpdate`) e uma em `syncIncremental` (que não usa — esta é a que precisa ser corrigida).

- [ ] **Step 3.2: Substituir o INSERT por upsert**

Localizar o bloco em `syncIncremental` que se parece com:
```ts
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
```

E substituir por:
```ts
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
}).onConflictDoUpdate({
  target: driveFiles.driveFileId,
  set: {
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
    syncStatus: "synced" as const,
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  },
}).returning({ id: driveFiles.id });
```

Referência: a função `syncFolderWithDatabase` no mesmo arquivo já usa `onConflictDoUpdate` com `target: driveFiles.driveFileId` — é o mesmo padrão.

- [ ] **Step 3.3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3.4: Commit**

```bash
git add src/lib/services/google-drive.ts
git commit -m "fix(drive): onConflictDoUpdate no syncIncremental para evitar duplicate key"
```

---

## Task 4: Watchdog Cron (a cada 5 minutos)

**Arquivo:** `src/lib/inngest/functions.ts`

**Contexto:** Adicionar `driveWatchdogFn` após o bloco `renewChannelsFn` (linha ~1064). Verificar que as pastas estagnadas (sem sync há > 20 min) recebam um evento `drive/incremental-sync`. Não adicionar `rateLimit` ao `incrementalSyncFn` existente — o `concurrency` já serializa a fila por pasta corretamente.

- [ ] **Step 4.0: Adicionar imports obrigatórios em `functions.ts`**

O arquivo tem duas linhas de import que precisam ser atualizadas:

```ts
// Linha ~360 — adicionar driveSyncFolders:
import { db, demandas, notifications, users, assistidos, processos, driveSyncLogs, driveSyncFolders } from "@/lib/db";

// Linha ~361 — adicionar lt (já tem lte, mas falta lt):
import { and, eq, lte, gte, isNull, or, sql, lt } from "drizzle-orm";
```

Verificar e corrigir as duas linhas antes de escrever a função watchdog.

- [ ] **Step 4.1: Adicionar a função watchdog**

Inserir **antes** da linha `export const functions = [` (linha ~1780):

```ts
// ============================================
// DRIVE SYNC WATCHDOG (A CADA 5 MINUTOS)
// ============================================

/**
 * Verifica pastas com sync estagnado (> 20 min) e dispara incremental sync.
 * Funciona como segurança quando webhooks falham.
 * Usa rateLimit global para evitar sobrecarga se o cron atrasar.
 */
export const driveWatchdogFn = inngest.createFunction(
  {
    id: "drive-watchdog",
    name: "Drive Sync Watchdog",
    retries: 0,
    rateLimit: { limit: 1, period: "5m" }, // máx 1 run global por janela de 5 min
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000); // 20 min atrás

    const staleFolders = await step.run("find-stale-folders", async () => {
      return db
        .select({ driveFolderId: driveSyncFolders.driveFolderId, name: driveSyncFolders.name })
        .from(driveSyncFolders)
        .where(
          and(
            eq(driveSyncFolders.isActive, true),
            or(
              lt(driveSyncFolders.lastSyncAt, staleThreshold),
              isNull(driveSyncFolders.lastSyncAt)
            )
          )
        );
    });

    if (staleFolders.length === 0) {
      return { staleFolders: 0 };
    }

    for (const folder of staleFolders) {
      await inngest.send({
        name: "drive/incremental-sync",
        data: { folderId: folder.driveFolderId, triggerSource: "watchdog" },
      });
    }

    return { staleFolders: staleFolders.length, dispatched: staleFolders.map(f => f.name) };
  }
);
```

- [ ] **Step 4.2: Registrar no array `functions`**

Localizar o array `export const functions = [` (linha ~1780) e adicionar `driveWatchdogFn` antes do fechamento:

```ts
  driveWatchdogFn,   // ← adicionar aqui
];
```

- [ ] **Step 4.3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4.4: Commit**

```bash
git add src/lib/inngest/functions.ts
git commit -m "feat(drive): adicionar watchdog cron a cada 5 min para pastas estagnadas"
```

---

## Task 5: tRPC — getSyncStatus, forceSyncFolder, cleanExpiredChannels

**Arquivo:** `src/lib/trpc/routers/drive.ts`

**Contexto:** Adicionar 3 novos endpoints ao router do Drive. O arquivo começa com:
```ts
import { db, driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db";
```

**Step 5.0: Adicionar todos os imports obrigatórios** (fazer ANTES de escrever qualquer endpoint)

- [ ] Adicionar `driveWebhooks` ao import do `@/lib/db` (linha 4):

```ts
// Antes:
import { db, driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db";

// Depois:
import { db, driveFiles, driveSyncFolders, driveSyncLogs, driveWebhooks } from "@/lib/db";
```

- [ ] Adicionar `inngest` (não está importado no arquivo):

```ts
import { inngest } from "@/lib/inngest/client";
```

- [ ] Adicionar `stopChannel` ao import existente de `google-drive.ts` (verificar linha ~8–50):

```bash
grep -n "from.*google-drive" src/lib/trpc/routers/drive.ts | head -5
```

Adicionar `stopChannel` ao import existente de `@/lib/services/google-drive`. `checkSyncHealth` já deve estar presente — confirmar com:

```bash
grep -n "checkSyncHealth" src/lib/trpc/routers/drive.ts
```

**Step 5.1: (removido — incorporado no Step 5.0)**

**Step 5.2: Adicionar a query `getSyncStatus`**

- [ ] Inserir **antes** da linha `healthStatus:` (linha ~3087) no router:

```ts
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
        webhookMap.set(w.folderId, { channelId: w.channelId, expiration: w.expiration });
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
```

**Step 5.3: Adicionar mutation `forceSyncFolder`**

- [ ] Inserir após `getSyncStatus`:

```ts
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
```

**Step 5.4: Adicionar mutation `cleanExpiredChannels`**

- [ ] Inserir após `forceSyncFolder`:

```ts
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
```

- [ ] **Step 5.5: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(drive): getSyncStatus + forceSyncFolder + cleanExpiredChannels"
```

---

## Task 6: Painel /admin/drive-sync

**Arquivo:** `src/app/(dashboard)/admin/drive-sync/page.tsx`

**Contexto:** Todas as páginas admin ficam em `src/app/(dashboard)/admin/`. São Client Components (`"use client"`) que usam `trpc` do `@/lib/trpc/client`. Padrão de página admin: ver `src/app/(dashboard)/admin/sync/page.tsx` como referência de estrutura.

> **Nota:** O spec tem um typo (`(admin)` em vez de `(dashboard)`) — o caminho correto é `src/app/(dashboard)/admin/drive-sync/page.tsx`.

- [ ] **Step 6.1: Criar o arquivo da página**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Database,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// /admin/drive-sync — Painel de Saúde do Sync com Drive
// ==========================================

type Health = "healthy" | "warning" | "critical";

function HealthBadge({ health }: { health: Health }) {
  const config = {
    healthy: {
      label: "Saudável",
      className: "bg-emerald-100 text-emerald-800",
      icon: CheckCircle2,
    },
    warning: {
      label: "Alerta",
      className: "bg-yellow-100 text-yellow-800",
      icon: AlertTriangle,
    },
    critical: {
      label: "Crítico",
      className: "bg-red-100 text-red-800",
      icon: XCircle,
    },
  }[health];

  const Icon = config.icon;

  return (
    <Badge className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function WebhookStatus({
  webhook,
}: {
  webhook: { channelId: string; expiration: Date } | null;
}) {
  if (!webhook) {
    return (
      <span className="flex items-center gap-1 text-sm text-zinc-400">
        <WifiOff className="h-3.5 w-3.5" />
        Sem webhook
      </span>
    );
  }

  const expiresIn = formatDistanceToNow(new Date(webhook.expiration), {
    locale: ptBR,
    addSuffix: true,
  });

  return (
    <span className="flex items-center gap-1 text-sm text-zinc-600">
      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
      Webhook ativo · expira {expiresIn}
    </span>
  );
}

export default function DriveSyncPage() {
  const { data, isLoading, refetch } = trpc.drive.getSyncStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const forceSyncMut = trpc.drive.forceSyncFolder.useMutation({
    onSuccess: () => toast.success("Sync disparado"),
    onError: () => toast.error("Falha ao disparar sync"),
  });

  const cleanMut = trpc.drive.cleanExpiredChannels.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.cleaned} canais limpos`);
      refetch();
    },
    onError: () => toast.error("Falha ao limpar canais"),
  });

  const [forcingFolder, setForcingFolder] = useState<string | null>(null);

  async function handleForceSync(driveFolderId: string) {
    setForcingFolder(driveFolderId);
    await forceSyncMut.mutateAsync({ driveFolderId });
    setForcingFolder(null);
  }

  const global = data?.global;
  const folders = data?.folders ?? [];

  const globalHealth: Health =
    global?.status === "critical"
      ? "critical"
      : global?.status === "degraded"
      ? "warning"
      : "healthy";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sync Google Drive</h1>
          <p className="text-sm text-zinc-500 mt-1">Status em tempo real das pastas monitoradas</p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge health={globalHealth} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Global stats */}
      {global && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Canais ativos</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {global.expiredChannels === 0
                  ? "—"
                  : `0 / ${global.expiredChannels + (data?.folders.filter((f) => f.activeWebhook).length ?? 0)}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Canais expirados</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {global.expiredChannels}
                {global.expiredChannels > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 text-xs text-zinc-500"
                    onClick={() => cleanMut.mutate()}
                    disabled={cleanMut.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Erros (1h)</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">{global.recentErrors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Pastas críticas</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {folders.filter((f) => f.health === "critical").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Folder cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-zinc-200 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-zinc-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className={
                folder.health === "critical"
                  ? "border-red-200"
                  : folder.health === "warning"
                  ? "border-yellow-200"
                  : "border-zinc-200"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium text-zinc-900">
                    {folder.name}
                  </CardTitle>
                  <HealthBadge health={folder.health} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Last sync */}
                <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <Clock className="h-3.5 w-3.5" />
                  {folder.lastSyncAt
                    ? `Última sync: ${formatDistanceToNow(new Date(folder.lastSyncAt), { locale: ptBR, addSuffix: true })}`
                    : "Nunca sincronizado"}
                </div>

                {/* Webhook */}
                <WebhookStatus webhook={folder.activeWebhook} />

                {/* File count + sync token */}
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {folder.fileCount} arquivos
                  </span>
                  {folder.hasSyncToken ? (
                    <span className="text-emerald-600 text-xs">token ✓</span>
                  ) : (
                    <span className="text-zinc-400 text-xs">sem token</span>
                  )}
                </div>

                {/* Force sync button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleForceSync(folder.driveFolderId)}
                  disabled={forcingFolder === folder.driveFolderId}
                >
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  {forcingFolder === folder.driveFolderId ? "Disparando…" : "Forçar sync"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.2: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

Resolver qualquer erro de import ou tipo TypeScript.

- [ ] **Step 6.3: Testar no browser**

```bash
npm run dev
```

Acessar `http://localhost:3000/admin/drive-sync` (logado como admin). Verificar:
- Cards aparecem com nome das 7 pastas
- Health badges corretos (VVD deve aparecer como crítico — sem sync há 15 dias)
- Botão "Forçar sync" dispara e mostra toast "Sync disparado"
- Botão "Limpar" aparece se há canais expirados
- Página atualiza automaticamente a cada 30s (abrir DevTools → Network)

- [ ] **Step 6.4: Commit**

```bash
git add src/app/(dashboard)/admin/drive-sync/page.tsx
git commit -m "feat(drive): painel de status /admin/drive-sync com health por pasta"
```

---

## Task 7: Verificação Final

- [ ] **Step 7.1: Build limpo**

```bash
npm run build 2>&1 | grep -E "error|Error|warn" | grep -v "node_modules"
```

Esperado: nenhuma linha de erro relevante.

- [ ] **Step 7.2: Verificar que VVD sincroniza após o fix**

Após deploy ou em dev (com Inngest rodando), observar os logs do `syncDriveFn` (cron de 30 min) ou disparar via botão "Forçar sync" na página nova. Verificar em `driveSyncLogs`:

```bash
# Rodar a partir do diretório do projeto (Defender/)
cat > check-vvd-after.ts << 'EOF'
import { db } from '@/lib/db';
import { driveSyncFolders, driveSyncLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
async function main() {
  const [vvd] = await db.select({ lastSyncAt: driveSyncFolders.lastSyncAt })
    .from(driveSyncFolders).where(eq(driveSyncFolders.name, 'VVD'));
  const logs = await db.select({ status: driveSyncLogs.status, createdAt: driveSyncLogs.createdAt, errorMessage: driveSyncLogs.errorMessage })
    .from(driveSyncLogs).where(eq(driveSyncLogs.status, 'failed')).orderBy(desc(driveSyncLogs.createdAt)).limit(3);
  console.log('VVD lastSyncAt:', vvd?.lastSyncAt);
  console.log('Recent errors:', logs);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) });
EOF
npx tsx --env-file=.env.local --tsconfig tsconfig.json check-vvd-after.ts
rm check-vvd-after.ts
```

Esperado: `lastSyncAt` atualizado para hoje, sem erros de `duplicate key`.

- [ ] **Step 7.3: Commit final**

```bash
git log --oneline -6
```

Confirmar que todos os 5 commits estão presentes, sem commits desnecessários.
